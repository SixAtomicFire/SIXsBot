import discord
from discord.ext import commands, tasks
import requests
import config

class SuggestionControlView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Accept", style=discord.ButtonStyle.success, emoji="✅", custom_id="btn_accept_suggestion")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_roles = [r.name for r in interaction.user.roles]
        if not any(r in user_roles for r in config.STAFF_ROLES):
            await interaction.response.send_message("❌ You do not have permission to manage suggestions.", ephemeral=True)
            return

        thread = interaction.channel
        forum = thread.parent

        accepted_tag = discord.utils.get(forum.available_tags, name="Accepted")
        if accepted_tag:
            current_tags = [t for t in thread.applied_tags if t.name not in ["Rejected", "Under Review"]]
            if accepted_tag not in current_tags:
                current_tags.append(accepted_tag)
                await thread.edit(applied_tags=current_tags)

        embed = discord.Embed(
            title="✅ Suggestion Approved!",
            description=f"This suggestion has been accepted by {interaction.user.mention}.",
            color=discord.Color.green()
        )
        await thread.send(embed=embed)
        await interaction.response.send_message("Status updated: Accepted", ephemeral=True)

    @discord.ui.button(label="Reject", style=discord.ButtonStyle.danger, emoji="❌", custom_id="btn_reject_suggestion")
    async def reject(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_roles = [r.name for r in interaction.user.roles]
        if not any(r in user_roles for r in config.STAFF_ROLES):
            await interaction.response.send_message("❌ You do not have permission to manage suggestions.", ephemeral=True)
            return

        thread = interaction.channel
        forum = thread.parent

        rejected_tag = discord.utils.get(forum.available_tags, name="Rejected")
        if rejected_tag:
            current_tags = [t for t in thread.applied_tags if t.name not in ["Accepted", "Under Review"]]
            if rejected_tag not in current_tags:
                current_tags.append(rejected_tag)
                await thread.edit(applied_tags=current_tags)

        embed = discord.Embed(
            title="❌ Suggestion Rejected",
            description=f"This suggestion has been rejected by {interaction.user.mention}.",
            color=discord.Color.red()
        )
        await thread.send(embed=embed)
        await interaction.response.send_message("Status updated: Rejected", ephemeral=True)


class SuggestionsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.sync_tags_loop.start()

    def cog_unload(self):
        self.sync_tags_loop.cancel()

    async def sync_forum_tags(self, forum: discord.ForumChannel):
        """Fetches Modrinth plugins and creates status/plugin tags in the Forum."""
        status_tags = {
            "Accepted": "✅",
            "Under Review": "🟧",
            "Rejected": "❌"
        }
        
        plugin_tags = {}
        try:
            url = f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}/projects"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                for proj in res.json():
                    plugin_tags[proj['title']] = "🔌"
        except Exception as e:
            print(f"Error fetching plugin tags for forum: {e}")

        all_target_tags = {**status_tags, **plugin_tags}
        
        existing_tags = {tag.name: tag for tag in forum.available_tags}
        new_tags_list = list(forum.available_tags)
        modified = False

        for tag_name, emoji_str in all_target_tags.items():
            if tag_name not in existing_tags:
                new_tags_list.append(discord.ForumTag(name=tag_name, emoji=emoji_str))
                modified = True

        if modified:
            try:
                await forum.edit(available_tags=new_tags_list)
            except Exception as e:
                print(f"Error updating forum tags: {e}")

    @tasks.loop(minutes=10)
    async def sync_tags_loop(self):
        """Auto-syncs forum tags with Modrinth every 10 minutes."""
        await self.bot.wait_until_ready()
        for guild in self.bot.guilds:
            for channel in guild.channels:
                if isinstance(channel, discord.ForumChannel) and channel.name == "suggestions":
                    await self.sync_forum_tags(channel)

    @commands.Cog.listener()
    async def on_thread_create(self, thread: discord.Thread):
        if isinstance(thread.parent, discord.ForumChannel) and thread.parent.name == "suggestions":
            under_review_tag = discord.utils.get(thread.parent.available_tags, name="Under Review")
            if under_review_tag and under_review_tag not in thread.applied_tags:
                await thread.edit(applied_tags=thread.applied_tags + [under_review_tag])

            first_message = await thread.fetch_message(thread.id)
            if first_message:
                await first_message.add_reaction("👍")
                await first_message.add_reaction("👎")

            embed = discord.Embed(
                title="⚙️ Staff Suggestion Management",
                description="Use the buttons below to accept or reject this proposal.",
                color=discord.Color.blurple()
            )
            await thread.send(embed=embed, view=SuggestionControlView())

async def setup(bot):
    await bot.add_cog(SuggestionsCog(bot))