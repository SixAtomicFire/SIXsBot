import discord
from discord.ext import commands
import asyncio
from datetime import timedelta
import config

class SecurityCog(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def get_or_create_log_channel(self, guild: discord.Guild) -> discord.TextChannel:
        """Cerca o crea il canale #mod-logs all'interno della sezione STAFF SECTION."""
        log_channel = discord.utils.get(guild.text_channels, name="mod-logs")
        if log_channel:
            return log_channel

        category = discord.utils.get(guild.categories, name="🛡️ STAFF SECTION")
        
        # Permessi ristretti solo allo staff
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(read_messages=False),
            guild.me: discord.PermissionOverwrite(read_messages=True, send_messages=True)
        }
        for r_name in [config.ROLE_OWNER, config.ROLE_ADMIN, config.ROLE_MOD, config.ROLE_HELPER]:
            role = discord.utils.get(guild.roles, name=r_name)
            if role:
                overwrites[role] = discord.PermissionOverwrite(read_messages=True, send_messages=True)

        log_channel = await guild.create_text_channel(
            name="mod-logs",
            category=category,
            overwrites=overwrites,
            topic="Official audit log for moderation actions and anti-raid security alerts."
        )
        return log_channel

    # ---------------------------------------------------------
    # 1. ANTI-RAID & BOT DEFENSE (Rosso scuro / Allerta)
    # ---------------------------------------------------------
    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        """Intercetta l'ingresso di bot esterni e invia l'avviso in #mod-logs."""
        if member.bot:
            guild = member.guild
            log_channel = await self.get_or_create_log_channel(guild)

            try:
                await member.kick(reason="Anti-Raid Defense: Unapproved external bot joined.")
                if log_channel:
                    embed = discord.Embed(
                        title="🚨 [ANTI-RAID] External Bot Blocked",
                        description=f"**Bot:** {member.mention} (`{member.id}`)\n**Action:** Automatically kicked from server.",
                        color=discord.Color.dark_red(),
                        timestamp=discord.utils.utcnow()
                    )
                    embed.set_footer(text="Anti-Raid Shield System")
                    await log_channel.send(embed=embed)
            except discord.Forbidden:
                if log_channel:
                    await log_channel.send(f"⚠️ **[ANTI-RAID WARNING]** External bot {member.mention} joined, but I lack permissions to kick it!")

    # ---------------------------------------------------------
    # 2. PURGE (Grigio / Pulizia Chat)
    # ---------------------------------------------------------
    @commands.command(name="purge")
    @commands.has_permissions(manage_messages=True)
    async def purge(self, ctx, target: str = None, amount: int = 100):
        """Cancellazione avanzata di messaggi con log automatico."""
        await ctx.message.delete()

        deleted_count = 0
        detail_str = ""

        if ctx.message.mentions:
            user_target = ctx.message.mentions[0]
            deleted = await ctx.channel.purge(limit=amount, check=lambda m: m.author.id == user_target.id)
            deleted_count = len(deleted)
            detail_str = f"Target User: {user_target.mention}"
        elif target and target.isdigit():
            deleted = await ctx.channel.purge(limit=int(target))
            deleted_count = len(deleted)
            detail_str = f"Bulk purge"
        elif target:
            text_target = target.strip('"\'').lower()
            deleted = await ctx.channel.purge(limit=amount, check=lambda m: text_target in m.content.lower())
            deleted_count = len(deleted)
            detail_str = f"Matching text: `{text_target}`"
        else:
            deleted = await ctx.channel.purge(limit=amount)
            deleted_count = len(deleted)
            detail_str = f"General purge"

        confirm_msg = await ctx.send(f"🗑️ Deleted **{deleted_count}** messages.")
        await asyncio.sleep(4)
        await confirm_msg.delete()

        # Invia log
        log_channel = await self.get_or_create_log_channel(ctx.guild)
        if log_channel:
            embed = discord.Embed(
                title="🧹 [MOD LOG] Message Purge",
                color=discord.Color.dark_gray(),
                timestamp=discord.utils.utcnow()
            )
            embed.add_field(name="Channel", value=ctx.channel.mention, inline=True)
            embed.add_field(name="Messages Removed", value=f"`{deleted_count}`", inline=True)
            embed.add_field(name="Filter / Info", value=detail_str, inline=False)
            embed.add_field(name="Moderator", value=ctx.author.mention, inline=True)
            await log_channel.send(embed=embed)

    # ---------------------------------------------------------
    # 3. COMANDI DI MODERAZIONE (Kick, Ban, Unban, Mute, Unmute)
    # ---------------------------------------------------------
    @commands.command(name="kick")
    @commands.has_permissions(kick_members=True)
    async def kick(self, ctx, member: discord.Member, *, reason: str = "No reason provided"):
        """Espelle un utente e registra l'evento."""
        if member.top_role >= ctx.author.top_role and ctx.author.id != ctx.guild.owner_id:
            await ctx.send("❌ You cannot kick a member with a higher or equal role.")
            return

        await member.kick(reason=f"{reason} (By: {ctx.author.name})")
        await ctx.send(f"👢 Kicked {member.mention}.")

        log_channel = await self.get_or_create_log_channel(ctx.guild)
        if log_channel:
            embed = discord.Embed(
                title="👢 [MOD LOG] Member Kicked",
                color=discord.Color.orange(),
                timestamp=discord.utils.utcnow()
            )
            embed.add_field(name="Target User", value=f"{member.mention} (`{member.id}`)", inline=False)
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=ctx.author.mention, inline=False)
            await log_channel.send(embed=embed)

    @commands.command(name="ban")
    @commands.has_permissions(ban_members=True)
    async def ban(self, ctx, member: discord.Member, *, reason: str = "No reason provided"):
        """Banna un utente e registra l'evento."""
        if member.top_role >= ctx.author.top_role and ctx.author.id != ctx.guild.owner_id:
            await ctx.send("❌ You cannot ban a member with a higher or equal role.")
            return

        await member.ban(reason=f"{reason} (By: {ctx.author.name})", delete_message_days=1)
        await ctx.send(f"🔨 Banned {member.mention}.")

        log_channel = await self.get_or_create_log_channel(ctx.guild)
        if log_channel:
            embed = discord.Embed(
                title="🔨 [MOD LOG] Member Banned",
                color=discord.Color.red(),
                timestamp=discord.utils.utcnow()
            )
            embed.add_field(name="Target User", value=f"{member.mention} (`{member.id}`)", inline=False)
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=ctx.author.mention, inline=False)
            await log_channel.send(embed=embed)

    @commands.command(name="unban")
    @commands.has_permissions(ban_members=True)
    async def unban(self, ctx, *, user_identifier: str):
        """Sblocca un utente e registra l'evento."""
        banned_users = [entry async for entry in ctx.guild.bans()]
        target_user = None

        for ban_entry in banned_users:
            user = ban_entry.user
            if str(user.id) == user_identifier or user.name == user_identifier:
                target_user = user
                break

        if target_user:
            await ctx.guild.unban(target_user)
            await ctx.send(f"✅ Unbanned **{target_user.name}**.")

            log_channel = await self.get_or_create_log_channel(ctx.guild)
            if log_channel:
                embed = discord.Embed(
                    title="🔓 [MOD LOG] Member Unbanned",
                    color=discord.Color.green(),
                    timestamp=discord.utils.utcnow()
                )
                embed.add_field(name="Target User", value=f"**{target_user.name}** (`{target_user.id}`)", inline=False)
                embed.add_field(name="Moderator", value=ctx.author.mention, inline=False)
                await log_channel.send(embed=embed)
        else:
            await ctx.send(f"❌ User `{user_identifier}` not found in the ban list.")

    @commands.command(name="mute")
    @commands.has_permissions(moderate_members=True)
    async def mute(self, ctx, member: discord.Member, duration_minutes: int = 10, *, reason: str = "No reason provided"):
        """Mette in timeout/silenzia un utente e registra l'evento."""
        if member.top_role >= ctx.author.top_role and ctx.author.id != ctx.guild.owner_id:
            await ctx.send("❌ You cannot mute a member with a higher or equal role.")
            return

        until_time = discord.utils.utcnow() + timedelta(minutes=duration_minutes)
        await member.timeout(until_time, reason=f"{reason} (By: {ctx.author.name})")
        await ctx.send(f"🔇 Muted {member.mention} for {duration_minutes} minutes.")

        log_channel = await self.get_or_create_log_channel(ctx.guild)
        if log_channel:
            embed = discord.Embed(
                title="🔇 [MOD LOG] Member Muted / Timeout",
                color=discord.Color.gold(),
                timestamp=discord.utils.utcnow()
            )
            embed.add_field(name="Target User", value=f"{member.mention} (`{member.id}`)", inline=False)
            embed.add_field(name="Duration", value=f"`{duration_minutes} minutes`", inline=True)
            embed.add_field(name="Reason", value=reason, inline=False)
            embed.add_field(name="Moderator", value=ctx.author.mention, inline=False)
            await log_channel.send(embed=embed)

    @commands.command(name="unmute")
    @commands.has_permissions(moderate_members=True)
    async def unmute(self, ctx, member: discord.Member):
        """Rimuove il timeout da un utente e registra l'evento."""
        await member.timeout(None, reason=f"Unmuted by {ctx.author.name}")
        await ctx.send(f"🔊 Unmuted {member.mention}.")

        log_channel = await self.get_or_create_log_channel(ctx.guild)
        if log_channel:
            embed = discord.Embed(
                title="🔊 [MOD LOG] Member Unmuted",
                color=discord.Color.blue(),
                timestamp=discord.utils.utcnow()
            )
            embed.add_field(name="Target User", value=f"{member.mention} (`{member.id}`)", inline=False)
            embed.add_field(name="Moderator", value=ctx.author.mention, inline=False)
            await log_channel.send(embed=embed)

async def setup(bot):
    await bot.add_cog(SecurityCog(bot))