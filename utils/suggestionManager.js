const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');

const DATA_FILE = path.join(__dirname, '../data/suggestions.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return {}; }
}
function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Apre modal per inviare suggerimento ───────────────────────────────────────
async function openSuggestionModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('suggestion_modal')
    .setTitle('💡 Submit a Suggestion');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('suggestion_title')
        .setLabel('Short title for your suggestion')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('suggestion_plugin')
        .setLabel('Which plugin? (or "general")')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('suggestion_body')
        .setLabel('Describe your suggestion in detail')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1000)
    ),
  );

  await interaction.showModal(modal);
}

// ── Modal submit → manda in #suggestions con voti ─────────────────────────────
async function handleSuggestionModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const title  = interaction.fields.getTextInputValue('suggestion_title');
  const plugin = interaction.fields.getTextInputValue('suggestion_plugin');
  const body   = interaction.fields.getTextInputValue('suggestion_body');
  const user   = interaction.user;

  const channel = interaction.guild.channels.cache.get(config.channels.suggestions);
  if (!channel) return interaction.editReply({ content: '❌ Suggestions channel not configured.' });

  const suggestions = load();
  const id = Object.keys(suggestions).length + 1;

  const embed = new EmbedBuilder()
    .setTitle(`💡 #${id} — ${title}`)
    .setDescription(body)
    .addFields(
      { name: '🔌 Plugin',    value: plugin,  inline: true },
      { name: '👤 Author',    value: `${user}`, inline: true },
      { name: '📊 Votes',     value: '👍 0  |  👎 0', inline: true },
      { name: '📌 Status',    value: '⏳ Pending', inline: true },
    )
    .setColor(0xFAC775)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`suggestion_approve_${id}`).setLabel('✅ Approve').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`suggestion_reject_${id}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`suggestion_discuss_${id}`).setLabel('💬 Discuss').setStyle(ButtonStyle.Secondary),
  );

  const msg = await channel.send({ embeds: [embed], components: [row] });

  // Aggiungi reazioni voto
  await msg.react('👍').catch(() => null);
  await msg.react('👎').catch(() => null);

  suggestions[id] = {
    id, title, plugin, body,
    userId: user.id, messageId: msg.id,
    status: 'pending', createdAt: Date.now(),
  };
  save(suggestions);

  await interaction.editReply({ content: `✅ Your suggestion has been submitted! Check <#${channel.id}>.` });
}

// ── Gestisce approvazione / rifiuto / discussione ─────────────────────────────
async function handleSuggestionAction(interaction, action) {
  const staffRoles = ['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper'];
  const isStaff = staffRoles.some(r => interaction.member.roles.cache.find(role => role.name === r));
  if (!isStaff) return interaction.reply({ content: '❌ Staff only.', ephemeral: true });

  const id = interaction.customId.split('_').pop();
  const suggestions = load();
  const suggestion  = suggestions[id];
  if (!suggestion) return interaction.reply({ content: '❌ Suggestion not found.', ephemeral: true });

  await interaction.deferUpdate();

  const statusMap = {
    approve: { label: '✅ Approved', color: 0x57F287 },
    reject:  { label: '❌ Rejected', color: 0xED4245 },
    discuss: { label: '💬 Under Discussion', color: 0x5865F2 },
  };
  const { label, color } = statusMap[action];

  // Aggiorna embed
  const oldEmbed = interaction.message.embeds[0];
  const newEmbed = EmbedBuilder.from(oldEmbed)
    .setColor(color)
    .spliceFields(3, 1, { name: '📌 Status', value: label, inline: true });

  suggestion.status = action;
  save(suggestions);

  // Se approvato: pinna nel canale roadmap
  if (action === 'approve' && config.channels.roadmap) {
    const roadmapChannel = interaction.guild.channels.cache.get(config.channels.roadmap);
    if (roadmapChannel) {
      const roadmapEmbed = new EmbedBuilder()
        .setTitle(`📌 ${suggestion.title}`)
        .setDescription(suggestion.body)
        .addFields({ name: '🔌 Plugin', value: suggestion.plugin, inline: true })
        .setColor(0x57F287)
        .setFooter({ text: `Suggestion #${id} • Approved` })
        .setTimestamp();
      await roadmapChannel.send({ embeds: [roadmapEmbed] });
    }
  }

  // Se discussione: crea thread
  if (action === 'discuss') {
    await interaction.message.startThread({
      name: `Discussion: ${suggestion.title}`.slice(0, 100),
      autoArchiveDuration: 1440,
      reason: `Staff opened discussion on suggestion #${id}`,
    }).catch(() => null);
  }

  // Rimuovi pulsanti dopo azione
  await interaction.message.edit({ embeds: [newEmbed], components: [] });
}

module.exports = { openSuggestionModal, handleSuggestionModal, handleSuggestionAction };
