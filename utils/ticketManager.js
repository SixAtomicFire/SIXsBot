const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ChannelType, PermissionFlagsBits,
} = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');

const DATA_FILE = path.join(__dirname, '../data/tickets.json');

function loadTickets() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}

function saveTickets(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Invia pannello apertura ticket ────────────────────────────────────────────
async function sendTicketPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Support Tickets')
    .setDescription(
      'Need help with one of our plugins? Open a ticket and we\'ll get back to you as soon as possible.\n\n' +
      '**Before opening a ticket:**\n' +
      '→ Check the FAQ channel for your plugin\n' +
      '→ Make sure you\'re using the latest version\n' +
      '→ Search existing threads in the support forum\n\n' +
      'Click the button below to get started.'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'SIXsPlugins Support • One ticket per issue' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_open')
      .setLabel('📩 Open a Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ── Step 1: click pulsante → mostra selezione plugin ─────────────────────────
async function handleTicketButton(interaction) {
  const options = config.plugins.map(p =>
    new StringSelectMenuOptionBuilder()
      .setLabel(p.id)
      .setValue(p.id)
      .setEmoji(p.emoji)
      .setDescription(`Issue related to ${p.id}`)
  );
  options.push(
    new StringSelectMenuOptionBuilder()
      .setLabel('General / Other')
      .setValue('general')
      .setEmoji('❓')
      .setDescription('Question not related to a specific plugin')
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_open_plugin')
    .setPlaceholder('Select the plugin your issue is about...')
    .addOptions(options);

  // Sostituiamo il customId per il secondo step
  menu.setCustomId('ticket_open_plugin');

  // Intercettiamo questo select in interactionCreate tramite prefix
  const row = new ActionRowBuilder().addComponents(menu);

  await interaction.reply({
    content: '**Step 1/3** — Which plugin is your ticket about?',
    components: [row],
    ephemeral: true,
  });
}

// ── Step 2: selezione plugin → mostra modal ───────────────────────────────────
async function handleTicketPluginSelect(interaction) {
  const pluginId = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${pluginId}`)
    .setTitle(`New Ticket — ${pluginId}`);

  const versionInput = new TextInputBuilder()
    .setCustomId('ticket_version')
    .setLabel('Plugin version you are using')
    .setPlaceholder('e.g. 1.2.0')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const contextInput = new TextInputBuilder()
    .setCustomId('ticket_context')
    .setLabel('Server context (server type, loader, MC version...)')
    .setPlaceholder('e.g. Paper 1.21, Fabric 1.20.4, Spigot 1.19...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Describe your issue or question')
    .setPlaceholder('Be as detailed as possible. Include error logs if applicable.')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(versionInput),
    new ActionRowBuilder().addComponents(contextInput),
    new ActionRowBuilder().addComponents(descInput),
  );

  await interaction.showModal(modal);
}

// ── Step 3: modal submit → crea canale ticket ─────────────────────────────────
async function handleTicketModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const pluginId    = interaction.customId.replace('ticket_modal_', '');
  const version     = interaction.fields.getTextInputValue('ticket_version');
  const context     = interaction.fields.getTextInputValue('ticket_context');
  const description = interaction.fields.getTextInputValue('ticket_description');
  const user        = interaction.user;
  const guild       = interaction.guild;

  const tickets = loadTickets();
  const ticketNum = Object.keys(tickets).length + 1;
  const channelName = `ticket-${ticketNum.toString().padStart(4, '0')}-${user.username}`.toLowerCase().slice(0, 100);

  // Permessi canale ticket
  const staffRoles = ['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper'];
  const perms = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];
  for (const rName of staffRoles) {
    const role = guild.roles.cache.find(r => r.name === rName);
    if (role) perms.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const categoryId = config.ticket.categoryId;
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId ?? undefined,
    permissionOverwrites: perms,
    reason: `Ticket #${ticketNum} by ${user.tag}`,
  });

  // Embed principale nel ticket
  const plugin = config.plugins.find(p => p.id === pluginId);
  const embed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${ticketNum}`)
    .setColor(plugin?.color ?? 0x5865F2)
    .addFields(
      { name: '👤 User',        value: `${user}`,    inline: true },
      { name: '🔌 Plugin',      value: pluginId,     inline: true },
      { name: '📦 Version',     value: version,      inline: true },
      { name: '⚙️ Context',     value: context,      inline: false },
      { name: '📝 Description', value: description,  inline: false },
    )
    .setFooter({ text: `Ticket #${ticketNum} • ${new Date().toUTCString()}` });

  // Pulsanti staff
  const staffRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${ticketNum}`)
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  // Menu priorità (visibile solo a chi può gestirlo, ma Discord non differenzia — viene mostrato a tutti)
  // La logica di chi può usarlo è nel handler
  const priorityMenu = new StringSelectMenuBuilder()
    .setCustomId(`ticket_priority_${ticketNum}`)
    .setPlaceholder('🏷️ Set priority (staff only)')
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel('🔴 Critical').setValue('critical').setDescription('Server breaking, data loss'),
      new StringSelectMenuOptionBuilder().setLabel('🟠 High').setValue('high').setDescription('Major feature broken'),
      new StringSelectMenuOptionBuilder().setLabel('🟡 Medium').setValue('medium').setDescription('Issue with workaround'),
      new StringSelectMenuOptionBuilder().setLabel('🟢 Low').setValue('low').setDescription('Minor issue or question'),
    );

  const priorityRow = new ActionRowBuilder().addComponents(priorityMenu);

  const msg = await ticketChannel.send({
    content: `${user} — A staff member will be with you shortly!`,
    embeds: [embed],
    components: [priorityRow, staffRow],
  });

  // Salva dati ticket
  tickets[ticketNum] = {
    id: ticketNum,
    channelId: ticketChannel.id,
    userId: user.id,
    plugin: pluginId,
    version,
    context,
    description,
    priority: null,
    status: 'open',
    openedAt: Date.now(),
    lastActivity: Date.now(),
    firstMessageId: msg.id,
  };
  saveTickets(tickets);

  await interaction.editReply({
    content: `✅ Your ticket has been created: ${ticketChannel}\nA staff member will assist you soon.`,
  });
}

// ── Imposta priorità (solo staff) ─────────────────────────────────────────────
async function handlePrioritySelect(interaction) {
  const staffRoles = ['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper'];
  const isStaff = staffRoles.some(r => interaction.member.roles.cache.find(role => role.name === r));

  if (!isStaff) {
    return interaction.reply({ content: '❌ Only staff can set ticket priority.', ephemeral: true });
  }

  const priority = interaction.values[0];
  const labels = { critical: '🔴 Critical', high: '🟠 High', medium: '🟡 Medium', low: '🟢 Low' };

  const tickets = loadTickets();
  const ticketNum = interaction.customId.replace('ticket_priority_', '');
  if (tickets[ticketNum]) {
    tickets[ticketNum].priority = priority;
    saveTickets(tickets);
  }

  // Aggiorna nome canale con priorità
  const colors = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
  const currentName = interaction.channel.name.replace(/^[🔴🟠🟡🟢]-?/, '');
  await interaction.channel.setName(`${colors[priority]}-${currentName}`).catch(() => null);

  await interaction.reply({
    content: `✅ Priority set to **${labels[priority]}**`,
    ephemeral: true,
  });
}

// ── Chiude ticket e genera transcript ─────────────────────────────────────────
async function handleTicketClose(interaction) {
  const staffRoles = ['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper'];
  const isStaff = staffRoles.some(r => interaction.member.roles.cache.find(role => role.name === r));

  if (!isStaff) {
    return interaction.reply({ content: '❌ Only staff can close tickets.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const channel  = interaction.channel;
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted   = [...messages.values()].reverse();

  // Genera transcript HTML
  const transcriptDir = config.ticket.transcriptPath;
  fs.mkdirSync(transcriptDir, { recursive: true });

  const ticketNum = interaction.customId.replace('ticket_close_', '');
  const tickets   = loadTickets();
  const ticket    = tickets[ticketNum];

  const htmlRows = sorted.map(m => {
    const time = new Date(m.createdTimestamp).toUTCString();
    const content = m.content || m.embeds.map(e => `[Embed: ${e.title ?? 'untitled'}]`).join(' ');
    return `<tr><td>${time}</td><td><b>${m.author.tag}</b></td><td>${content.replace(/</g,'&lt;')}</td></tr>`;
  }).join('\n');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Ticket #${ticketNum} Transcript</title>
<style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
td{padding:6px 10px;border:1px solid #ddd}tr:nth-child(even){background:#f9f9f9}
h1{color:#5865f2}</style></head><body>
<h1>🎫 Ticket #${ticketNum} Transcript</h1>
<p><b>Plugin:</b> ${ticket?.plugin ?? 'N/A'} | <b>Version:</b> ${ticket?.version ?? 'N/A'} | <b>Priority:</b> ${ticket?.priority ?? 'not set'}</p>
<table><tr><th>Time</th><th>User</th><th>Message</th></tr>${htmlRows}</table>
</body></html>`;

  const transcriptFile = path.join(transcriptDir, `ticket-${ticketNum}.html`);
  fs.writeFileSync(transcriptFile, html);

  // Manda log nel canale ticket-logs
  if (config.channels.ticketLogs) {
    const logChannel = interaction.guild.channels.cache.get(config.channels.ticketLogs);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle(`🔒 Ticket #${ticketNum} Closed`)
        .setColor(0xED4245)
        .addFields(
          { name: 'Plugin',    value: ticket?.plugin   ?? 'N/A', inline: true },
          { name: 'Version',   value: ticket?.version  ?? 'N/A', inline: true },
          { name: 'Priority',  value: ticket?.priority ?? 'Not set', inline: true },
          { name: 'Closed by', value: `${interaction.user}`, inline: true },
        )
        .setFooter({ text: `Transcript saved as ticket-${ticketNum}.html` })
        .setTimestamp();

      await logChannel.send({
        embeds: [logEmbed],
        files: [{ attachment: transcriptFile, name: `ticket-${ticketNum}.html` }],
      });
    }
  }

  // Aggiorna stato ticket
  if (ticket) { ticket.status = 'closed'; ticket.closedAt = Date.now(); saveTickets(tickets); }

  await interaction.editReply({ content: '✅ Ticket closed. Transcript saved and logged.' });

  // Elimina canale dopo 5 secondi
  setTimeout(() => channel.delete().catch(() => null), 5000);
}

module.exports = {
  sendTicketPanel,
  handleTicketButton,
  handleTicketPluginSelect,
  handleTicketModal,
  handleTicketClose,
  handlePrioritySelect,
};
