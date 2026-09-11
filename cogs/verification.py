import discord
from discord.ext import commands, tasks

class AcceptRulesView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="I Accept the Rules ✅", style=discord.ButtonStyle.primary, custom_id="btn_accept_rules")
    async def accept(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        verified_role = discord.utils.get(guild.roles, name="Verified")

        if verified_role:
            await interaction.user.add_roles(verified_role)
            await interaction.response.send_message("🎉 **Verification successful!** You now have full access to the server.", ephemeral=True)
        else:
            await interaction.response.send_message("❌ Error: `Verified` role not found. Please contact staff.", ephemeral=True)


class VerifyButtonView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Read Rules & Verify ✅", style=discord.ButtonStyle.success, custom_id="btn_read_verify")
    async def verify_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild = interaction.guild
        verified_role = discord.utils.get(guild.roles, name="Verified")

        if verified_role in interaction.user.roles:
            await interaction.response.send_message("⚠️ You are already verified!", ephemeral=True)
            return

        embed_rules = discord.Embed(
            title="📜 Server Rules & Community Guidelines",
            description=(
                "**1. Be Respectful:** Treat all members and staff with courtesy. Hate speech, harassment, or toxicity is strictly forbidden.\n"
                "**2. No Spam or Self-Promotion:** Do not spam messages or mass ping users/staff.\n"
                "**3. Use Correct Channels:** Open support tickets in `#open-ticket` and post ideas in `#suggestions`.\n"
                "**4. No DM Support:** Always open a public/private ticket for help.\n"
                "**5. Follow Discord TOS:** Adhere strictly to Discord's TOS & Guidelines.\n\n"
                "*Click the button below to accept the rules and gain full server access.*"
            ),
            color=discord.Color.from_rgb(26, 188, 156)
        )

        await interaction.response.send_message(embed=embed_rules, view=AcceptRulesView(), ephemeral=True)


class VerificationCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.auto_setup_verify.start()

    def cog_unload(self):
        self.auto_setup_verify.cancel()

    @tasks.loop(minutes=10)
    async def auto_setup_verify(self):
        await self.bot.wait_until_ready()
        for guild in self.bot.guilds:
            v_channel = discord.utils.get(guild.text_channels, name="verify")
            if v_channel:
                existing_panel = None
                async for msg in v_channel.history(limit=20):
                    if msg.author == self.bot.user and msg.embeds and "Verification Required" in msg.embeds[0].title:
                        existing_panel = msg
                        break

                embed = discord.Embed(
                    title="🔒 Verification Required",
                    description="Welcome to **SIXsPlugins**!\n\nTo access all channels and community features, please click the button below to read the server rules and complete verification.",
                    color=discord.Color.from_rgb(26, 188, 156)
                )

                if not existing_panel:
                    await v_channel.send(embed=embed, view=VerifyButtonView())

async def setup(bot):
    await bot.add_cog(VerificationCog(bot))