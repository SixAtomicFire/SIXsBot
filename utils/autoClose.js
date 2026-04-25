const { EmbedBuilder } = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');
const { handleTicketClose } = require('./ticketManager');

const DATA_FILE = path.join(__dirname, '../data/tickets.json');

function loadTickets() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}

async function checkInactiveTickets(client) {
  const tickets  = loadTickets();
  const maxMs    = (config.ticket.autoCloseDays || 3) * 24 * 60 * 60 * 1000;
  const guild    = client.guilds.cache.first();
  if (!guild) return;

  for (const [id, ticket] of Object.entries(tickets)) {
    if (ticket.status !== 'open') continue;

    const inactive = Date.now() - ticket.lastActivity;

    // Avviso a 24h dalla chiusura
    if (inactive > maxMs - 86_400_000 && !ticket.warned) {
      const channel = guild.channels.cache.get(ticket.channelId);
      if (channel) {
        await channel.send({
          content: `⚠️ This ticket will be **automatically closed in 24 hours** due to inactivity. Reply to keep it open.`,
        }).catch(() => null);
        ticket.warned = true;
      }
    }

    // Chiusura automatica
    if (inactive > maxMs) {
      const channel = guild.channels.cache.get(ticket.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle('🔒 Ticket Auto-Closed')
          .setDescription(`This ticket was automatically closed after **${config.ticket.autoCloseDays} days** of inactivity.`)
          .setColor(0xED4245)
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => null);

        ticket.status   = 'closed';
        ticket.closedAt = Date.now();
        ticket.autoClose = true;

        // Log nel canale ticket-logs
        const logChannel = guild.channels.cache.get(config.channels.ticketLogs);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle(`🔒 Ticket #${id} Auto-Closed`)
            .setColor(0x99AAB5)
            .addFields(
              { name: 'Plugin',  value: ticket.plugin  ?? 'N/A', inline: true },
              { name: 'Reason',  value: 'Inactivity',             inline: true },
            )
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
        }

        setTimeout(() => channel.delete().catch(() => null), 5000);
      }

      const data = loadTickets();
      data[id] = ticket;
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    }
  }
}

// Aggiorna lastActivity ad ogni messaggio in un canale ticket
async function updateTicketActivity(message) {
  if (!message.guild || message.author.bot) return;
  const tickets = loadTickets();
  const ticket  = Object.values(tickets).find(t => t.channelId === message.channelId && t.status === 'open');
  if (!ticket) return;
  ticket.lastActivity = Date.now();
  ticket.warned = false;
  fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

function startAutoClose(client) {
  console.log('⏰ Auto-close checker started (every 1h)');
  setInterval(() => checkInactiveTickets(client), 60 * 60 * 1000);

  // Ascolta messaggi per aggiornare lastActivity
  client.on('messageCreate', updateTicketActivity);
}

module.exports = { startAutoClose };
