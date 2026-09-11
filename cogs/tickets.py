import discord
from discord.ext import commands, tasks
import asyncio
import io
import html
import requests
from datetime import datetime
import config
import database

class TicketModal(discord.ui.Modal, title="Ticket Support Details"):
    def __init__(self, plugin_name: str):
        super().__init__()
        self.plugin_name = plugin_name

    urgency = discord.ui.TextInput(
        label="Urgency Level",
        placeholder="Low / Medium / High",
        required=True,
        max_length=10
    )
    description = discord.ui.TextInput(
        label="Problem Description",
        style=discord.TextStyle.paragraph,
        placeholder="Describe your issue in detail...",
        required=True,
        max_length=1000
    )
    screenshots = discord.ui.TextInput(
        label="Screenshot / Log Links (Optional)",
        placeholder="https://imgur.com/... or https://mPaste.app/...",
        required=False
    )

    async def on_submit(self, interaction: discord.Interaction):
        guild = interaction.guild
        user = interaction.user
        
        ticket_num = database.get_next_ticket_id()
        channel_name = f"ticket-{self.plugin_name.lower().replace(' ', '-')}-{ticket_num:03d}"

        category = discord.utils.get(guild.categories, name="🎫 SUPPORT")

        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            user: discord.PermissionOverwrite(read_messages=True, send_messages=True, attach_files=True),
            guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True, manage_channels=True)
        }

        for role_name in config.STAFF_ROLES:
            role = discord.utils.get(guild.roles, name=role_name)
            if role:
                overwrites[role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

        channel = await guild.create_text_channel(name=channel_name, category=category, overwrites=overwrites)

        ticket_data = {
            "ticket_num": ticket_num,
            "channel_id": str(channel.id),
            "user_id": str(user.id),
            "plugin": self.plugin_name,
            "urgency": self.urgency.value,
            "description": self.description.value,
            "screenshots": self.screenshots.value or "No link provided",
            "status": "OPEN",
            "claimed_by": None,
            "created_at": datetime.now().isoformat()
        }
        database.save_ticket_data(str(channel.id), ticket_data)

        embed = discord.Embed(
            title=f"🎫 Ticket #{ticket_num:03d} - {self.plugin_name}",
            color=discord.Color.blue(),
            timestamp=datetime.now()
        )
        embed.add_field(name="User", value=user.mention, inline=True)
        embed.add_field(name="Urgency", value=self.urgency.value, inline=True)
        embed.add_field(name="Description", value=self.description.value, inline=False)
        embed.add_field(name="Attachments / Links", value=self.screenshots.value or "None", inline=False)
        embed.set_footer(text="A staff member will assist you shortly. Use the buttons below to manage this ticket.")

        await channel.send(content=f"Welcome {user.mention}, our staff team has been notified.", embed=embed, view=TicketControlView())
        await interaction.response.send_message(f"✅ Ticket created successfully: {channel.mention}", ephemeral=True)


class PluginSelectView(discord.ui.View):
    def __init__(self, plugins_list: list):
        super().__init__(timeout=None)
        
        options = [discord.SelectOption(label="General", description="General inquiries or issues not tied to a specific plugin", emoji="💬")]
        for p in plugins_list:
            options.append(discord.SelectOption(label=p, description=f"Dedicated support for {p}", emoji="🔌"))

        select = discord.ui.Select(
            custom_id="ticket_plugin_select",
            placeholder="Select a category or plugin...",
            options=options
        )
        select.callback = self.select_callback
        self.add_item(select)

    async def select_callback(self, interaction: discord.Interaction):
        selected_plugin = interaction.data["values"][0]
        await interaction.response.send_modal(TicketModal(plugin_name=selected_plugin))


class TicketControlView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Claim Ticket", style=discord.ButtonStyle.primary, emoji="🙋‍♂️", custom_id="btn_claim_ticket")
    async def claim_toggle(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_roles = [r.name for r in interaction.user.roles]
        if not any(r in user_roles for r in config.STAFF_ROLES):
            await interaction.response.send_message("❌ Only staff members can manage tickets.", ephemeral=True)
            return

        channel = interaction.channel
        guild = interaction.guild
        ticket_data = database.get_ticket_data(str(channel.id))
        claimed_by = ticket_data.get("claimed_by")

        # 1. CASO: Ticket non ancora preso in carico -> CLAIM
        if not claimed_by:
            for role_name in config.STAFF_ROLES:
                role = discord.utils.get(guild.roles, name=role_name)
                if role:
                    if role_name in config.HIGH_STAFF_ROLES:
                        await channel.set_permissions(role, read_messages=True, send_messages=True)
                    else:
                        await channel.set_permissions(role, read_messages=False)

            await channel.set_permissions(interaction.user, read_messages=True, send_messages=True)
            database.save_ticket_data(str(channel.id), {"claimed_by": str(interaction.user.id), "status": "CLAIMED"})

            button.label = "Unclaim Ticket"
            button.style = discord.ButtonStyle.secondary
            button.emoji = "🔓"

            await interaction.response.edit_message(view=self)
            await channel.send(f"🙋‍♂️ Ticket claimed by {interaction.user.mention}!")

        # 2. CASO: Ticket già preso in carico dallo STESSO utente -> UNCLAIM
        elif claimed_by == str(interaction.user.id):
            for role_name in config.STAFF_ROLES:
                role = discord.utils.get(guild.roles, name=role_name)
                if role:
                    await channel.set_permissions(role, read_messages=True, send_messages=True)

            database.save_ticket_data(str(channel.id), {"claimed_by": None, "status": "OPEN"})

            button.label = "Claim Ticket"
            button.style = discord.ButtonStyle.primary
            button.emoji = "🙋‍♂️"

            await interaction.response.edit_message(view=self)
            await channel.send("🔓 Ticket unassigned and available to all staff again.")

        # 3. CASO: Ticket preso da UN ALTRO staffer
        else:
            claimed_user = guild.get_member(int(claimed_by))
            mention_str = claimed_user.mention if claimed_user else "another staff member"
            await interaction.response.send_message(f"⚠️ This ticket is currently claimed by {mention_str}.", ephemeral=True)

    @discord.ui.button(label="Force Unclaim", style=discord.ButtonStyle.secondary, emoji="🔒", custom_id="btn_unclaim_ticket")
    async def force_unclaim(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_roles = [r.name for r in interaction.user.roles]
        if not any(r in user_roles for r in config.HIGH_STAFF_ROLES):
            await interaction.response.send_message("❌ Only Admins or SIXs can perform a Force Unclaim.", ephemeral=True)
            return

        channel = interaction.channel
        guild = interaction.guild

        for role_name in config.STAFF_ROLES:
            role = discord.utils.get(guild.roles, name=role_name)
            if role:
                await channel.set_permissions(role, read_messages=True, send_messages=True)

        database.save_ticket_data(str(channel.id), {"claimed_by": None, "status": "OPEN"})

        # Ripristina l'aspetto del bottone di Claim nella View del messaggio principale
        for child in self.children:
            if child.custom_id == "btn_claim_ticket":
                child.label = "Claim Ticket"
                child.style = discord.ButtonStyle.primary
                child.emoji = "🙋‍♂️"

        await interaction.response.edit_message(view=self)
        await channel.send("🔓 Ticket unlocked by High Staff and available to all staff again.")

    @discord.ui.button(label="Close Ticket", style=discord.ButtonStyle.danger, emoji="⛔", custom_id="btn_close_ticket")
    async def close_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message("🔒 Initiating ticket closure sequence...")
        
        channel = interaction.channel
        ticket_data = database.get_ticket_data(str(channel.id))
        
        messages = []
        async for msg in channel.history(limit=500, oldest_first=True):
            messages.append(msg)

        html_content = self.generate_html_transcript(channel.name, messages)
        transcript_file = discord.File(io.BytesIO(html_content.encode('utf-8')), filename=f"{channel.name}-transcript.html")

        log_channel = discord.utils.get(interaction.guild.text_channels, name="ticket-logs")
        if log_channel:
            embed_log = discord.Embed(
                title="Closed Ticket Log",
                color=discord.Color.red(),
                timestamp=datetime.now()
            )
            embed_log.add_field(name="Ticket Channel", value=channel.name, inline=True)
            embed_log.add_field(name="Closed By", value=interaction.user.mention, inline=True)
            embed_log.add_field(name="Plugin", value=ticket_data.get("plugin", "N/A"), inline=True)
            await log_channel.send(embed=embed_log, file=transcript_file)

        user_id = ticket_data.get("user_id")
        if user_id:
            user = interaction.guild.get_member(int(user_id))
            if user:
                try:
                    await user.send(f"Your ticket `{channel.name}` has been closed. Please rate the support you received:", view=FeedbackView(ticket_data.get("ticket_num")))
                except Exception:
                    pass

        await asyncio.sleep(3)
        await channel.delete()

    def generate_html_transcript(self, channel_name: str, messages: list) -> str:
        html_code = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transcript {channel_name}</title>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #36393f; color: #dcddde; padding: 20px; }}
                .msg {{ margin-bottom: 15px; border-bottom: 1px solid #40444b; padding-bottom: 5px; }}
                .author {{ font-weight: bold; color: #7289da; }}
                .time {{ font-size: 0.8em; color: #72767d; margin-left: 10px; }}
                .content {{ margin-top: 5px; }}
            </style>
        </head>
        <body>
            <h2>Ticket Transcript: {channel_name}</h2>
            <hr>
        """
        for m in messages:
            content_escaped = html.escape(m.content)
            time_str = m.created_at.strftime("%Y-%m-%d %H:%M:%S")
            html_code += f"""
            <div class="msg">
                <span class="author">{html.escape(m.author.display_name)}</span>
                <span class="time">{time_str}</span>
                <div class="content">{content_escaped}</div>
            </div>
            """
        html_code += "</body></html>"
        return html_code


class FeedbackView(discord.ui.View):
    def __init__(self, ticket_num: int):
        super().__init__(timeout=172800)
        self.ticket_num = ticket_num

    @discord.ui.select(
        placeholder="Rate your support experience...",
        options=[
            discord.SelectOption(label="5 Stars - Excellent", value="5", emoji="⭐"),
            discord.SelectOption(label="4 Stars - Good", value="4", emoji="⭐"),
            discord.SelectOption(label="3 Stars - Average", value="3", emoji="⭐"),
            discord.SelectOption(label="2 Stars - Poor", value="2", emoji="⭐"),
            discord.SelectOption(label="1 Star - Bad", value="1", emoji="⭐"),
        ]
    )
    async def rating_callback(self, interaction: discord.Interaction, select: discord.ui.Select):
        rating = select.values[0]
        database.save_review_data(f"ticket_{self.ticket_num}", {
            "ticket_num": self.ticket_num,
            "rating": int(rating),
            "user": str(interaction.user.id),
            "timestamp": datetime.now().isoformat()
        })
        await interaction.response.send_message(f"Thank you for your {rating}-star rating! ✅", ephemeral=True)


class TicketsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.auto_sync_ticket_panel.start()

    def cog_unload(self):
        self.auto_sync_ticket_panel.cancel()

    async def update_or_create_panel(self, guild: discord.Guild):
        ticket_channel = discord.utils.get(guild.text_channels, name="open-ticket")
        if not ticket_channel:
            return

        plugins_list = []
        try:
            url = f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}/projects"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                for proj in res.json():
                    plugins_list.append(proj['title'])
        except Exception as e:
            print(f"Error fetching Modrinth plugins for panel: {e}")

        if not plugins_list:
            plugins_list = ["PluginCore"]

        embed = discord.Embed(
            title="🛠️ Support & Ticket Center",
            description="Have you encountered a bug or issue with one of our plugins?\nSelect the plugin from the dropdown menu below to open a private support ticket with our staff.",
            color=discord.Color.blue()
        )

        view = PluginSelectView(plugins_list)

        existing_panel = None
        async for msg in ticket_channel.history(limit=20):
            if msg.author == self.bot.user and msg.embeds and "Support & Ticket Center" in msg.embeds[0].title:
                existing_panel = msg
                break

        if existing_panel:
            await existing_panel.edit(embed=embed, view=view)
        else:
            await ticket_channel.send(embed=embed, view=view)

    @tasks.loop(minutes=10)
    async def auto_sync_ticket_panel(self):
        await self.bot.wait_until_ready()
        for guild in self.bot.guilds:
            await self.update_or_create_panel(guild)

async def setup(bot):
    await bot.add_cog(TicketsCog(bot))