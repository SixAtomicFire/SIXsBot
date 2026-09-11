import discord
from discord.ext import commands, tasks
import requests
import random
import config
import database

# Extended dynamic color palette for plugin roles excluding fixed role colors
PLUGIN_PALETTE = [
    discord.Color.from_rgb(155, 89, 182),  # Purple
    discord.Color.from_rgb(233, 30, 99),   # Pink
    discord.Color.from_rgb(241, 196, 15),  # Gold
    discord.Color.from_rgb(103, 58, 183),  # Deep Purple
    discord.Color.from_rgb(0, 188, 212),   # Cyan Variant
    discord.Color.from_rgb(139, 195, 74)   # Light Green
]

class NotificationToggleView(discord.ui.View):
    def __init__(self, role_name: str):
        super().__init__(timeout=None)
        self.role_name = role_name

    @discord.ui.button(label="Toggle Notifications ", style=discord.ButtonStyle.primary,emoji="🔔", custom_id="btn_toggle_notif")
    async def toggle_role(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        role = discord.utils.get(guild.roles, name=self.role_name)

        if not role:
            await interaction.response.send_message("❌ Notification role not found.", ephemeral=True)
            return

        if role in interaction.user.roles:
            await interaction.user.remove_roles(role)
            await interaction.response.send_message(f"🔕 You will no longer receive notifications for **{self.role_name.replace('Notifications-', '')}**.", ephemeral=True)
        else:
            await interaction.user.add_roles(role)
            await interaction.response.send_message(f"🔔 You subscribed to notifications for **{self.role_name.replace('Notifications-', '')}**!", ephemeral=True)


class ModrinthApprovalView(discord.ui.View):
    def __init__(self, project_name: str, version_title: str, changelog: str, link: str):
        super().__init__(timeout=None)
        self.project_name = project_name
        self.version_title = version_title
        self.changelog = changelog
        self.link = link

    @discord.ui.button(label="Approve & Publish", style=discord.ButtonStyle.success, emoji="✅", custom_id="btn_approve_update")
    async def approve(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild

        channel_name = self.project_name.lower().replace(' ', '-')
        category = discord.utils.get(guild.categories, name="📢 UPDATES & CHANGELOG")
        
        target_channel = discord.utils.get(guild.text_channels, name=channel_name)
        if not target_channel:
            overwrites = {
                guild.default_role: discord.PermissionOverwrite(send_messages=False, read_messages=True),
                guild.me: discord.PermissionOverwrite(send_messages=True, read_messages=True)
            }
            target_channel = await guild.create_text_channel(
                name=channel_name, 
                category=category, 
                overwrites=overwrites,
                topic=f"Official news and updates for {self.project_name}."
            )

        role_name = f"Notifications-{self.project_name}"
        role = discord.utils.get(guild.roles, name=role_name)
        if not role:
            role = await guild.create_role(name=role_name, color=random.choice(PLUGIN_PALETTE), mentionable=True)

        embed = discord.Embed(
            title=f"🚀 New Update Released: {self.project_name} - {self.version_title}",
            url=self.link,
            color=discord.Color.green()
        )
        embed.description = f"**Changelog:**\n{self.changelog[:2000]}"
        embed.set_footer(text="Download now on Modrinth!")

        await target_channel.send(content=role.mention, embed=embed)
        await interaction.response.send_message(f"✅ Update for **{self.project_name}** published in {target_channel.mention}!", ephemeral=True)
        self.stop()

    @discord.ui.button(label="Reject / Ignore", style=discord.ButtonStyle.danger, emoji="❌", custom_id="btn_reject_update")
    async def reject(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("❌ Update notification discarded.", ephemeral=True)
        self.stop()


class ModrinthCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.check_modrinth_updates.start()
        self.auto_sync_channels_loop.start()

    def cog_unload(self):
        self.check_modrinth_updates.cancel()
        self.auto_sync_channels_loop.cancel()

    async def auto_create_plugin_channels(self, guild: discord.Guild):
        category = discord.utils.get(guild.categories, name="📢 UPDATES & CHANGELOG")
        if not category:
            return

        try:
            url = f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}/projects"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                for proj in res.json():
                    p_name = proj['title']
                    p_desc = proj.get('description', f"Official updates for {p_name}.")
                    channel_name = p_name.lower().replace(' ', '-')
                    role_name = f"Notifications-{p_name}"

                    # Ensure Notification Role exists with dynamic palette color
                    role = discord.utils.get(guild.roles, name=role_name)
                    if not role:
                        await guild.create_role(name=role_name, color=random.choice(PLUGIN_PALETTE), mentionable=True)

                    existing = discord.utils.get(guild.text_channels, name=channel_name)
                    if not existing:
                        overwrites = {
                            guild.default_role: discord.PermissionOverwrite(send_messages=False, read_messages=True),
                            guild.me: discord.PermissionOverwrite(send_messages=True, read_messages=True)
                        }
                        ch = await guild.create_text_channel(
                            name=channel_name,
                            category=category,
                            overwrites=overwrites,
                            topic=p_desc[:1024]
                        )
                        embed_init = discord.Embed(
                            title=f"📢 Welcome to #{ch.name}",
                            description=f"{p_desc}\n\n*Click the button below to toggle release notification pings for **{p_name}**.*",
                            color=discord.Color.blue()
                        )
                        await ch.send(embed=embed_init, view=NotificationToggleView(role_name))
        except Exception as e:
            print(f"Error auto-creating news channels: {e}")

    @commands.command(name="rebuild_news")
    async def rebuild_news(self, ctx):
        """Deletes existing news channels and rebuilds them with historical changelogs from Modrinth."""
        if not ctx.author.guild_permissions.administrator:
            await ctx.send("❌ You must have Administrator permissions to run this command.")
            return

        status_msg = await ctx.send("🔄 **Starting news channel rebuild...** Fetching data from Modrinth.")
        guild = ctx.guild

        category = discord.utils.get(guild.categories, name="📢 UPDATES & CHANGELOG")
        if not category:
            category = await guild.create_category("📢 UPDATES & CHANGELOG")

        try:
            url_user = f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}/projects"
            res = requests.get(url_user, timeout=10)
            if res.status_code != 200:
                await status_msg.edit(content="❌ Failed to fetch projects from Modrinth API.")
                return

            projects = res.json()

            for proj in projects:
                p_id = proj['id']
                p_name = proj['title']
                p_slug = proj['slug']
                p_desc = proj.get('description', f"Official updates and news for {p_name}.")
                channel_name = p_name.lower().replace(' ', '-')
                role_name = f"Notifications-{p_name}"

                # Assicura la presenza del ruolo per le notifiche
                role = discord.utils.get(guild.roles, name=role_name)
                if not role:
                    role = await guild.create_role(name=role_name, color=random.choice(PLUGIN_PALETTE), mentionable=True)

                # Cancella il vecchio canale se presente
                old_channel = discord.utils.get(guild.text_channels, name=channel_name)
                if old_channel:
                    await old_channel.delete(reason="Rebuilding news channels via !rebuild_news")

                # Crea il nuovo canale
                overwrites = {
                    guild.default_role: discord.PermissionOverwrite(send_messages=False, read_messages=True),
                    guild.me: discord.PermissionOverwrite(send_messages=True, read_messages=True)
                }
                new_channel = await guild.create_text_channel(
                    name=channel_name,
                    category=category,
                    overwrites=overwrites,
                    topic=p_desc[:1024]
                )

                # Invia Embed di Intestazione con Tasto Toggle
                header_embed = discord.Embed(
                    title=f"📢 Welcome to #{new_channel.name}",
                    description=f"{p_desc}\n\n*Click the button below to toggle release notification pings for **{p_name}**.*",
                    color=discord.Color.blue()
                )
                await new_channel.send(embed=header_embed, view=NotificationToggleView(role_name))

                # Recupera lo storico delle versioni da Modrinth
                res_ver = requests.get(f"https://api.modrinth.com/v2/project/{p_id}/version", timeout=10)
                if res_ver.status_code == 200:
                    versions = res_ver.json()
                    versions.reverse()  # Dal più vecchio al più recente

                    for ver in versions:
                        ver_name = ver.get('name', ver.get('version_number', 'Release'))
                        ver_num = ver.get('version_number', '')
                        changelog = ver.get('changelog', 'No changelog provided.').strip()
                        if not changelog:
                            changelog = "No changelog provided."

                        modrinth_link = f"https://modrinth.com/project/{p_slug}/version/{ver_num}"

                        ver_embed = discord.Embed(
                            title=f"🚀 Update: {p_name} - {ver_name}",
                            url=modrinth_link,
                            color=discord.Color.green()
                        )
                        ver_embed.description = f"**Changelog:**\n{changelog[:2000]}"
                        ver_embed.set_footer(text=f"Version: {ver_num} • Modrinth Release")

                        await new_channel.send(embed=ver_embed)

            await status_msg.edit(content="✅ **News channels rebuilt successfully!** All existing changelogs have been imported.")

        except Exception as e:
            await status_msg.edit(content=f"❌ An error occurred during rebuild: `{e}`")
            print(f"Error in rebuild_news: {e}")

    @tasks.loop(minutes=10)
    async def auto_sync_channels_loop(self):
        await self.bot.wait_until_ready()
        for guild in self.bot.guilds:
            await self.auto_create_plugin_channels(guild)

    @tasks.loop(minutes=10)
    async def check_modrinth_updates(self):
        await self.bot.wait_until_ready()
        url_projects = f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}/projects"
        try:
            res = requests.get(url_projects, timeout=5)
            if res.status_code != 200:
                return
            projects = res.json()

            for proj in projects:
                proj_id = proj['id']
                proj_title = proj['title']

                res_ver = requests.get(f"https://api.modrinth.com/v2/project/{proj_id}/version", timeout=5)
                if res_ver.status_code == 200:
                    versions = res_ver.json()
                    if not versions:
                        continue

                    latest_ver = versions[0]
                    latest_ver_id = latest_ver['id']

                    doc_ref = database.db.collection("modrinth_cache").document(proj_id).get()
                    if doc_ref.exists and doc_ref.to_dict().get("last_version_id") == latest_ver_id:
                        continue

                    database.db.collection("modrinth_cache").document(proj_id).set({"last_version_id": latest_ver_id})

                    for guild in self.bot.guilds:
                        app_channel = discord.utils.get(guild.text_channels, name="update-approval")
                        if app_channel:
                            embed = discord.Embed(
                                title=f"🔔 New release detected for {proj_title}",
                                color=discord.Color.gold()
                            )
                            embed.add_field(name="Version Name", value=latest_ver['name'], inline=False)
                            embed.add_field(name="Changelog", value=latest_ver['changelog'][:1000] if latest_ver.get('changelog') else "No changelog provided.", inline=False)

                            modrinth_link = f"https://modrinth.com/project/{proj['slug']}/version/{latest_ver['version_number']}"
                            await app_channel.send(
                                embed=embed,
                                view=ModrinthApprovalView(proj_title, latest_ver['name'], latest_ver.get('changelog', ''), modrinth_link)
                            )
        except Exception as e:
            print(f"Modrinth check error: {e}")

async def setup(bot):
    await bot.add_cog(ModrinthCog(bot))