const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bug')
    .setDescription('🐛 Report a bug with a guided form')
    .addStringOption(o => o
      .setName('plugin')
      .setDescription('Which plugin has the bug?')
      .setRequired(true)
      .addChoices(...config.plugins.map(p => ({ name: p.id, value: p.id })))
    ),

  async execute(interaction) {
    const pluginId = interaction.options.getString('plugin');
    const plugin   = config.plugins.find(p => p.id === pluginId);

    const modal = new ModalBuilder()
      .setCustomId(`bug_modal_${pluginId}`)
      .setTitle(`🐛 Bug Report — ${pluginId}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_version')
          .setLabel('Plugin version where the bug occurs')
          .setPlaceholder('e.g. 1.2.0')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(20)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_server')
          .setLabel('Server type, loader and Minecraft version')
          .setPlaceholder('e.g. Paper 1.21.1, Fabric 1.20.4 + Forge...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_steps')
          .setLabel('Steps to reproduce the bug')
          .setPlaceholder('1. Do X\n2. Then Y\n3. See error...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(600)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_expected')
          .setLabel('Expected vs actual behaviour')
          .setPlaceholder('Expected: ...\nActual: ...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(400)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('bug_log')
          .setLabel('Error log / stack trace (paste key lines)')
          .setPlaceholder('Paste relevant lines from latest.log or leave "none"')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(800)
      ),
    );

    await interaction.showModal(modal);

    // Gestisci la submit del modal
    const submitted = await interaction.awaitModalSubmit({
      time: 5 * 60 * 1000,
      filter: i => i.customId === `bug_modal_${pluginId}` && i.user.id === interaction.user.id,
    }).catch(() => null);

    if (!submitted) return;

    await submitted.deferReply({ ephemeral: true });

    const version  = submitted.fields.getTextInputValue('bug_version');
    const server   = submitted.fields.getTextInputValue('bug_server');
    const steps    = submitted.fields.getTextInputValue('bug_steps');
    const expected = submitted.fields.getTextInputValue('bug_expected');
    const log      = submitted.fields.getTextInputValue('bug_log') || '_None provided_';

    // Trova il forum bug-report del plugin
    const bugChannelId = plugin?.channels?.bugReport
      ?? interaction.guild.channels.cache.find(c =>
          c.name === `${pluginId.toLowerCase().replace(/sixs/i, '')}-bug-report` ||
          c.name === `${pluginId.toLowerCase()}-bug-report`
        )?.id;

    const bugChannel = bugChannelId
      ? interaction.guild.channels.cache.get(bugChannelId)
      : null;

    const embed = new EmbedBuilder()
      .setTitle(`🐛 Bug Report — ${pluginId}`)
      .setColor(0xED4245)
      .addFields(
        { name: '👤 Reporter',          value: `${interaction.user}`, inline: true  },
        { name: '📦 Plugin Version',    value: version,               inline: true  },
        { name: '⚙️ Server Setup',      value: server,                inline: false },
        { name: '🔁 Steps to Reproduce', value: steps,                inline: false },
        { name: '🔍 Expected vs Actual', value: expected,             inline: false },
        { name: '📋 Error Log',          value: `\`\`\`\n${log.slice(0, 700)}\n\`\`\``, inline: false },
      )
      .setFooter({ text: `SIXsPlugins Bug Report • ${new Date().toUTCString()}` })
      .setTimestamp();

    if (bugChannel && bugChannel.type === 15) {
      // Forum channel — crea thread
      await bugChannel.threads.create({
        name: `[BUG] ${pluginId} v${version} — ${steps.split('\n')[0].slice(0, 60)}`,
        message: { embeds: [embed] },
        reason: `Bug report by ${interaction.user.tag}`,
      });
      await submitted.editReply({ content: `✅ Bug report submitted in ${bugChannel}! The team will investigate.` });
    } else if (bugChannel) {
      await bugChannel.send({ embeds: [embed] });
      await submitted.editReply({ content: `✅ Bug report submitted! The team will investigate.` });
    } else {
      // Fallback: manda nel canale corrente
      await submitted.editReply({
        content: '⚠️ Bug report channel not configured — here is your report:',
        embeds: [embed],
      });
    }
  },
};
