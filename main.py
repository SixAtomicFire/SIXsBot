import discord
from discord.ext import commands
import asyncio
import config
from cogs.tickets import TicketControlView
from cogs.suggestions import SuggestionControlView
from cogs.verification import VerifyButtonView, AcceptRulesView

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    # Registrazione Views Persistenti
    bot.add_view(TicketControlView())
    bot.add_view(SuggestionControlView())
    bot.add_view(VerifyButtonView())
    bot.add_view(AcceptRulesView())
    print(f"✅ SIXsBot online e autenticato come: {bot.user}")

async def main():
    async with bot:
        await bot.load_extension("cogs.setup")
        await bot.load_extension("cogs.tickets")
        await bot.load_extension("cogs.modrinth")
        await bot.load_extension("cogs.suggestions")
        await bot.load_extension("cogs.stats")
        await bot.load_extension("cogs.status")
        await bot.load_extension("cogs.verification")
        await bot.load_extension("cogs.security")
        
        await bot.start(config.BOT_TOKEN)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("🛑 SIXsBot is shutting down gracefully...")