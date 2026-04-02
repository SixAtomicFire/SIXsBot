const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const config = require('../config');

const CATEGORIES = {
  bug:          { label: '🐛 Segnalazione Bug',    emoji: '🐛', color: 0xe74c3c },
  domanda:      { label: '❓ Domanda / Supporto',  emoji: '❓', color: 0x3498db },
  suggerimento: { label: '💡 Suggerimento',        emoji: '💡', color: 0xf1c40f },
  altro:        { label: '📂 Altro',               emoji: '📂', color: 0x95a5a6 },
};

// ── Pannello apertura ticket ────────────────────────────────────────────────
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Supporto Plugin')
    .setDescription(
      'Hai bisogno di aiuto con uno dei nostri plugin?\n\n' +
      'Clicca il pulsante qui sotto per aprire un ticket. Il nostro staff ti risponderà il prima possibile.\n\n' +
      '**Prima di aprire un ticket:**\n' +
      '• Leggi la documentazione del plugin\n' +
      '• Controlla le FAQ con `/faq`\n' +
      '• Assicurati di usare una versione supportata'
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Un ticket per problema, per favore.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('Apri un Ticket')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── Gestione click pulsanti ticket ──────────────────────────────────────────
async function handleTicketButton(interaction, client) {
  const { customId } = interaction;

  if (customId === 'ticket_open') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Seleziona una categoria...')
      .addOptions(
        Object.entries(CATEGORIES).map(([value, { label, emoji }]) => ({ label, value, emoji }))
      );

    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({
      content: '**Seleziona la categoria del tuo problema:**',
      components: [row],
      ephemeral: true,
    });
  }

  if (customId.startsWith('ticket_close_')) {
    await closeTicket(interaction, client);
  }

  if (customId.startsWith('ticket_priority_')) {
    const parts = customId.split('_');
    const priority = parts[2];
    await setPriority(interaction, priority);
  }
}

// ── Apertura ticket ─────────────────────────────────────────────────────────
async function openTicket(interaction, client) {
  const category = interaction.values[0];
  const categoryData = CATEGORIES[category];
  const guild = interaction.guild;

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);

  const existing = guild.channels.cache.find(
    c => c.name === `ticket-${safeName}` && c.parentId === config.channels.ticketsCategory
  );

  if (existing) {
    return interaction.reply({
      content: `❌ Hai già un ticket aperto: ${existing}`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const ticketChannel = await guild.channels.create({
      name: `ticket-${safeName}`,
      type: ChannelType.GuildText,
      parent: config.channels.ticketsCategory,
      topic: `Ticket di ${interaction.user.tag} | Categoria: ${categoryData.label}`,
      permissionOverwrites: [
        { id: guild.id,              deny:  [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: config.roles.support,  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`${categoryData.emoji} Ticket — ${categoryData.label}`)
      .setDescription(
        `Ciao ${interaction.user}! 👋\n\n` +
        `Hai aperto un ticket nella categoria **${categoryData.label}**.\n` +
        `Descrivi il tuo problema nel modo più dettagliato possibile:\n\n` +
        `• Versione del server (es. Paper 1.20.4)\n` +
        `• Nome e versione del plugin\n` +
        `• Cosa hai fatto e cosa è successo\n` +
        `• Eventuali errori dal log`
      )
      .setColor(categoryData.color)
      .addFields(
        { name: '👤 Utente',    value: `${interaction.user}`,   inline: true },
        { name: '📁 Categoria', value: categoryData.label,       inline: true },
        { name: '⚡ Priorità',  value: '🟡 Media (default)',     inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Ticket aperto da ${interaction.user.tag}` });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${interaction.user.id}`)
        .setLabel('Chiudi Ticket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ticket_priority_bassa_${ticketChannel.id}`)
        .setLabel('Priorità Bassa')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ticket_priority_alta_${ticketChannel.id}`)
        .setLabel('Priorità Alta')
        .setStyle(ButtonStyle.Danger),
    );

    const supportRole = guild.roles.cache.get(config.roles.support);
    await ticketChannel.send({
      content: supportRole ? `${supportRole}` : '',
      embeds: [embed],
      components: [closeRow],
    });

    await logTicket(client, guild, interaction.user, ticketChannel, 'apertura', categoryData);

    await interaction.editReply({ content: `✅ Ticket aperto! Vai in ${ticketChannel}` });
  } catch (err) {
    console.error('❌ Errore apertura ticket:', err);
    await interaction.editReply({ content: '❌ Errore durante l\'apertura del ticket.' });
  }
}

// ── Chiusura ticket con transcript ──────────────────────────────────────────
async function closeTicket(interaction, client) {
  await interaction.deferReply();
  const channel = interaction.channel;

  // Salva transcript
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = [...messages.values()].reverse();
    const transcript = sorted.map(m => {
      const time = new Date(m.createdTimestamp).toLocaleString('it-IT');
      const content = m.content || (m.embeds.length ? '[Embed]' : '[Allegato]');
      return `[${time}] ${m.author.tag}: ${content}`;
    }).join('\n');

    const logChannel = client.channels.cache.get(config.channels.ticketsLog);
    if (logChannel && transcript) {
      const { AttachmentBuilder } = require('discord.js');
      const buffer = Buffer.from(transcript, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

      const logEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket Chiuso')
        .setDescription(`Il ticket **${channel.name}** è stato chiuso da ${interaction.user}`)
        .setColor(0xe74c3c)
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed], files: [attachment] });
    }
  } catch (err) {
    console.error('❌ Errore salvataggio transcript:', err);
  }

  await interaction.editReply({ content: '🔒 Ticket in chiusura tra 5 secondi...' });
  setTimeout(() => channel.delete().catch(console.error), 5000);
}

// ── Priorità ticket ─────────────────────────────────────────────────────────
const PRIORITIES = {
  bassa: { label: '🟢 Bassa' },
  media: { label: '🟡 Media' },
  alta:  { label: '🔴 Alta'  },
};

async function setPriority(interaction, priority) {
  const priorityData = PRIORITIES[priority];
  if (!priorityData) return;
  await interaction.reply({ content: `⚡ Priorità impostata a **${priorityData.label}**` });
}

// ── Log apertura ticket ─────────────────────────────────────────────────────
async function logTicket(client, guild, user, channel, tipo, categoryData) {
  try {
    const logChannel = await client.channels.fetch(config.channels.ticketsLog).catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🎫 Nuovo Ticket Aperto')
      .addFields(
        { name: '👤 Utente',    value: `${user} (${user.tag})`, inline: true },
        { name: '📁 Categoria', value: categoryData.label,       inline: true },
        { name: '📌 Canale',    value: `${channel}`,            inline: true },
      )
      .setColor(0x2ecc71)
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch {}
}

module.exports = { sendTicketPanel, handleTicketButton, openTicket, closeTicket };
