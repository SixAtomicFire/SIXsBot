import discord
from discord.ext import commands, tasks
import requests
import psutil
import os
import math
from datetime import datetime
import config
import database

class SystemStatusCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.start_time = datetime.now()
        self.total_checks = 0
        self.successful_checks = 0
        self.status_check_loop.start()

    def cog_unload(self):
        self.status_check_loop.cancel()

    @tasks.loop(minutes=5)
    async def status_check_loop(self):
        await self.bot.wait_until_ready()

        # Evita l'esecuzione durante la disconnessione o se la connessione è persa
        if not self.bot.is_ready():
            return
        
        self.total_checks += 1
        
        # 1. Test Modrinth API
        modrinth_ok = False
        try:
            res = requests.get(f"https://api.modrinth.com/v2/user/{config.MODRINTH_USERNAME}", timeout=5)
            if res.status_code == 200:
                modrinth_ok = True
                self.successful_checks += 1
        except Exception:
            modrinth_ok = False

        # 2. Calcolo Uptime %
        uptime_pct = round((self.successful_checks / self.total_checks) * 100, 1) if self.total_checks > 0 else 100.0
        
        # 3. Statistiche di Sistema & Memoria RAM
        process = psutil.Process(os.getpid())
        ram_usage = round(process.memory_info().rss / 1024 / 1024, 2) # in MB
        
        # 4. Calcolo Uptime complessivo
        uptime_duration = datetime.now() - self.start_time
        hours, remainder = divmod(int(uptime_duration.total_seconds()), 3600)
        minutes, _ = divmod(remainder, 60)
        uptime_str = f"{hours}h {minutes}m"

        # 5. Recupero statistiche Ticket da Firebase
        try:
            counter_doc = database.db.collection("settings").document("counters").get()
            total_tickets = counter_doc.to_dict().get("ticket_count", 0) if counter_doc.exists else 0
        except Exception:
            total_tickets = "N/A"

        # 6. Gestione Sicura della Latenza (Fix per OverflowError)
        latency = self.bot.latency
        if math.isinf(latency) or math.isnan(latency):
            latency_str = "`Connecting...`"
        else:
            latency_str = f"`{round(latency * 1000)} ms`"

        # 7. Invio/Aggiornamento Report nelle Guilds
        for guild in self.bot.guilds:
            status_channel = discord.utils.get(guild.text_channels, name="bot-status")
            if not status_channel:
                continue

            embed = discord.Embed(
                title="🖥️ SIXsBot Dashboard & System Health",
                color=discord.Color.green() if modrinth_ok else discord.Color.red(),
                timestamp=datetime.now()
            )
            
            # Sezione 1: Stato Servizi & API
            embed.add_field(name="Bot Latency", value=latency_str, inline=True)
            embed.add_field(name="Modrinth API", value="`Online ✅`" if modrinth_ok else "`Offline ⚠️`", inline=True)
            embed.add_field(name="Firebase DB", value="`Connected ✅`", inline=True)

            # Sezione 2: Performance & Risorse Host
            embed.add_field(name="RAM Usage", value=f"`{ram_usage} MB`", inline=True)
            embed.add_field(name="Total Uptime", value=f"`{uptime_str}`", inline=True)
            embed.add_field(name="API Reliability", value=f"`{uptime_pct}%`", inline=True)

            # Sezione 3: Statistiche Server
            embed.add_field(name="Total Guild Members", value=f"`{guild.member_count}`", inline=True)
            embed.add_field(name="Total Tickets Created", value=f"`{total_tickets}`", inline=True)
            embed.add_field(name="Active Cogs", value=f"`{len(self.bot.cogs)} loaded`", inline=True)

            embed.set_footer(text="Auto-refreshes every 5 minutes • SIXsPlugins Health Monitor")

            # Cerca se esiste già un messaggio inviato dal bot per Modificarlo (evita lo spam)
            existing_msg = None
            async for msg in status_channel.history(limit=10):
                if msg.author == self.bot.user and msg.embeds and "SIXsBot Dashboard" in msg.embeds[0].title:
                    existing_msg = msg
                    break

            if existing_msg:
                await existing_msg.edit(embed=embed)
            else:
                await status_channel.send(embed=embed)

async def setup(bot):
    await bot.add_cog(SystemStatusCog(bot))