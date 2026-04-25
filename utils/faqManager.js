const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');

// ── Apre modal per inviare FAQ ────────────────────────────────────────────────
async function openFaqModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('faq_submit')
    .setTitle('❓ Submit a FAQ Question');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('faq_plugin')
        .setLabel('Which plugin? (or "general")')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('faq_question')
        .setLabel('Your question')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(150)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('faq_context')
        .setLabel('Any additional context? (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500)
    ),
  );

  await interaction.showModal(modal);
}

// ── Modal submit → manda in canale staff per revisione ────────────────────────
async function handleFaqSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const plugin   = interaction.fields.getTextInputValue('faq_plugin');
  const question = interaction.fields.getTextInputValue('faq_question');
  const context  = interaction.fields.getTextInputValue('faq_context') || 'None';

  const pendingChannel = interaction.guild.channels.cache.get(config.channels.faqPending);
  if (!pendingChannel) return interaction.editReply({ content: '❌ FAQ pending channel not configured. Please contact an admin.' });

  const embed = new EmbedBuilder()
    .setTitle('❓ New FAQ Submission')
    .addFields(
      { name: '🔌 Plugin',    value: plugin,   inline: true },
      { name: '👤 From',      value: `${interaction.user}`, inline: true },
      { name: '❓ Question',  value: question,  inline: false },
      { name: '📝 Context',   value: context,   inline: false },
    )
    .setColor(0xFAC775)
    .setTimestamp()
    .setFooter({ text: 'Review and approve or reject below' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`faq_approve_${Date.now()}`)
      .setLabel('✅ Approve & Publish')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`faq_reject_${Date.now()}`)
      .setLabel('❌ Reject')
      .setStyle(ButtonStyle.Danger),
  );

  await pendingChannel.send({ embeds: [embed], components: [row] });
  await interaction.editReply({ content: '✅ Your question has been submitted for review. If approved, it will be published in the FAQ channel!' });
}

// ── Approva o rifiuta FAQ ─────────────────────────────────────────────────────
async function handleFaqAction(interaction, action) {
  await interaction.deferUpdate();

  const embed = interaction.message.embeds[0];
  const fields = embed.fields;

  const plugin   = fields.find(f => f.name === '🔌 Plugin')?.value ?? 'General';
  const question = fields.find(f => f.name === '❓ Question')?.value ?? '';
  const context  = fields.find(f => f.name === '📝 Context')?.value ?? '';

  if (action === 'reject') {
    const rejectedEmbed = EmbedBuilder.from(embed)
      .setColor(0xED4245)
      .setTitle('❌ FAQ Rejected');
    await interaction.message.edit({ embeds: [rejectedEmbed], components: [] });
    return;
  }

  // Approva → pubblica nel canale FAQ del plugin giusto
  const pluginConfig = config.plugins.find(p =>
    p.id.toLowerCase() === plugin.toLowerCase() ||
    plugin.toLowerCase().includes(p.id.toLowerCase())
  );

  const faqChannelId = pluginConfig?.channels?.faq;
  const faqChannel   = faqChannelId
    ? interaction.guild.channels.cache.get(faqChannelId)
    : null;

  if (!faqChannel) {
    await interaction.followUp({ content: `⚠️ FAQ channel for plugin "${plugin}" not found in config.`, ephemeral: true });
    return;
  }

  // Formatta la domanda con il bot come autore — aspetto pulito e professionale
  const faqEmbed = new EmbedBuilder()
    .setTitle(`❓ ${question}`)
    .setDescription(
      context && context !== 'None'
        ? `*${context}*\n\n💡 *Answer coming soon — staff will update this entry.*`
        : '💡 *Answer coming soon — staff will update this entry.*'
    )
    .setColor(pluginConfig?.color ?? 0x5865F2)
    .setFooter({ text: `${plugin} FAQ • Submitted by community` })
    .setTimestamp();

  const faqMsg = await faqChannel.send({ embeds: [faqEmbed] });

  // Crea thread per la risposta dello staff
  await faqMsg.startThread({
    name: `Answer: ${question}`.slice(0, 100),
    autoArchiveDuration: 10080, // 7 giorni
    reason: 'FAQ answer thread',
  }).catch(() => null);

  // Aggiorna messaggio staff
  const approvedEmbed = EmbedBuilder.from(embed)
    .setColor(0x57F287)
    .setTitle('✅ FAQ Approved & Published');
  await interaction.message.edit({ embeds: [approvedEmbed], components: [] });
}

module.exports = { openFaqModal, handleFaqSubmit, handleFaqAction };
