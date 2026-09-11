import discord
from discord.ext import commands
import config

class SetupCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="setup_server")
    @commands.has_permissions(administrator=True)
    async def setup_server(self, ctx):
        guild = ctx.guild
        await ctx.send("⚙️ Syncing server structure, roles, and strict verification permissions...")

        try:
            # 1. Setup Roles safely
            fixed_roles_config = [
                (config.ROLE_OWNER, discord.Color.from_rgb(231, 76, 60)),   # Red (#E74C3C)
                (config.ROLE_ADMIN, discord.Color.from_rgb(230, 126, 34)),   # Orange (#E67E22)
                (config.ROLE_MOD, discord.Color.from_rgb(46, 204, 113)),     # Emerald Green (#2ECC71)
                (config.ROLE_HELPER, discord.Color.from_rgb(52, 152, 219)),   # Soft Blue (#3498DB)
                ("Verified", discord.Color.from_rgb(26, 188, 156))           # Teal / Cyan (#1ABC9C)
            ]

            roles_created = {}
            for name, color in fixed_roles_config:
                role = discord.utils.get(guild.roles, name=name)
                if not role:
                    role = await guild.create_role(name=name, color=color, mentionable=True)
                else:
                    await role.edit(color=color)
                roles_created[name] = role

            verified_role = roles_created["Verified"]

            # Overwrites Categoria Welcome & Info (Visibile a tutti)
            public_info_overwrites = {
                guild.default_role: discord.PermissionOverwrite(read_messages=True, send_messages=False),
                guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True)
            }

            # Overwrites Categorie Protette (Nascoste ai NON Verificati)
            protected_overwrites = {
                guild.default_role: discord.PermissionOverwrite(read_messages=False, connect=False, send_messages=False),
                verified_role: discord.PermissionOverwrite(read_messages=True, connect=True, send_messages=True),
                guild.me: discord.PermissionOverwrite(read_messages=True, connect=True, send_messages=True)
            }

            # Staff Overwrites
            staff_overwrites = {
                guild.default_role: discord.PermissionOverwrite(read_messages=False),
                guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True)
            }
            for r_name in [config.ROLE_OWNER, config.ROLE_ADMIN, config.ROLE_MOD, config.ROLE_HELPER]:
                if r_name in roles_created:
                    staff_overwrites[roles_created[r_name]] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

            # Helper Categoria
            async def get_or_create_category(cat_name, overwrites=discord.utils.MISSING):
                category = discord.utils.get(guild.categories, name=cat_name)
                if not category:
                    category = await guild.create_category(cat_name, overwrites=overwrites)
                elif overwrites is not discord.utils.MISSING:
                    await category.edit(overwrites=overwrites)
                return category

            # Helper Canale di Testo
            async def get_or_create_channel(ch_name, category, overwrites=discord.utils.MISSING):
                channel = discord.utils.get(guild.text_channels, name=ch_name)
                if not channel:
                    channel = await guild.create_text_channel(ch_name, category=category, overwrites=overwrites)
                else:
                    if channel.category != category:
                        await channel.edit(category=category)
                    if overwrites is not discord.utils.MISSING:
                        await channel.edit(overwrites=overwrites)
                    else:
                        await channel.edit(sync_permissions=True)
                return channel

            # 2. Configurazione Categorie Base
            cat_info = await get_or_create_category("📌 WELCOME & INFO", overwrites=public_info_overwrites)
            await get_or_create_channel("verify", cat_info)
            await get_or_create_channel("announcements", cat_info)
            await get_or_create_channel("rules", cat_info)

            cat_tickets = await get_or_create_category("🎫 SUPPORT", overwrites=protected_overwrites)
            await get_or_create_channel("open-ticket", cat_tickets)

            cat_community = await get_or_create_category("💬 COMMUNITY", overwrites=protected_overwrites)
            await get_or_create_channel("general-chat", cat_community)

            cat_updates = await get_or_create_category("📢 UPDATES & CHANGELOG", overwrites=protected_overwrites)

            cat_staff = await get_or_create_category("🛡️ STAFF SECTION", overwrites=staff_overwrites)
            await get_or_create_channel("staff-chat", cat_staff)
            await get_or_create_channel("update-approval", cat_staff)
            await get_or_create_channel("ticket-logs", cat_staff)
            await get_or_create_channel("bot-status", cat_staff)

            # 3. FORZA LA SINCRONIZZAZIONE PERMISSI SU TUTTI I CANALI (Inclusi Vocali e Forum)
            protected_categories = [cat_community, cat_tickets, cat_updates, cat_staff]
            for category in protected_categories:
                for channel in category.channels:  # category.channels include Testo, Vocali, Forum, Stage
                    await channel.edit(sync_permissions=True)

            await ctx.send("✅ All channels (text & voice) successfully synced and locked for non-verified users!")

        except Exception as e:
            await ctx.send(f"❌ Error during setup: `{e}`")

async def setup(bot):
    await bot.add_cog(SetupCog(bot))