import discord
from discord.ext import commands, tasks

class StatsCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.update_stats.start()

    def cog_unload(self):
        self.update_stats.cancel()

    @tasks.loop(minutes=10)
    async def update_stats(self):
        await self.bot.wait_until_ready()
        for guild in self.bot.guilds:
            for vc in guild.voice_channels:
                if vc.name.startswith("Members:"):
                    member_count = guild.member_count
                    new_name = f"Members: {member_count}"
                    if vc.name != new_name:
                        await vc.edit(name=new_name)

async def setup(bot):
    await bot.add_cog(StatsCog(bot))