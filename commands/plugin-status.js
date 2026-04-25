const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
} = require('discord.js');
const config = require('../config');

const STATUS_OPTIONS = [
  { name: '🟢 Stable — Production ready',          value: 'stable'      },
  { name: '🟡 Beta — Feature complete, may have bugs', value: 'beta'    },
  { name: '🔴 Alpha — Early testing, expect issues', value: 'alpha'     },
  { name: '🔧 Maintenance — Temporarily unavailable', value: 'maintenance' },
  { name: '⚠️  Deprecated — No longer maintained',  value: 'deprecated' },
];

const STATUS_DISPLAY = {
  stable:      { label: '🟢 Stable',      color: 0x57F287, desc: 'Production ready — safe to use on live servers.' },
  beta:        { label: '🟡 Beta',        color: 0xFAC775, desc: 'Feature complete but may contain bugs. Test before using on live servers.' },
  alpha:       { label: '🔴 Alpha',       color: 0xED4245, desc: 'Early access. Expect bugs and breaking changes.' },
  maintenance: { label: '🔧 Maintenance', color: 0x99AAB5, desc: 'Temporarily unavailable. Updates coming soon.' },
  deprecated:  { label: '⚠️ Deprecated', color: 0x4F545C, desc: 'No longer maintained. Use at your own risk.' },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin-status')
    .setDescription('📌 Update a plugin\'s status and info in its channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(o => o
      .setName('plugin')
      .setDescription('Which plugin to update')
      .setRequired(true)
      .addChoices(...config.plugins.map(p => ({ name: p.id, value: p.id })))
    )
    .addStringOption(o => o
      .setName('status')
      .setDescription('Current release status')
      .setRequired(true)
      .addChoices(...STATUS_OPTIONS)
    )
    .addStringOption(o => o
      .setName('version')
      .setDescription('Current version (e.g. 1.2.0)')
      .setRequired(true)
      .setMaxLength(20)
    )
    .addStringOption(o => o
      .setName('description')
      .setDescription('Short plugin description shown in the info channel')
      .setRequired(true)
      .setMaxLength(500)
    )
    .addStringOption(o => o
      .setName('features')
      .setDescription('Key features, separated by commas')
      .setRequired(false)
      .setMaxLength(500)
    )
    .addStringOption(o => o
      .setName('requirements')
      .setDescription('Requirements (e.g. Paper 1.20+, Simple Voice Chat)')
      .setRequired(false)
      .setMaxLength(200)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const pluginId    = interaction.options.getString('plugin');
    const statusKey   = interaction.options.getString('status');
    const version     = interaction.options.getString('version');
    const description = interaction.options.getString('description');
    const featuresRaw = interaction.options.getString('features') ?? '';
    const requirements= interaction.options.getString('requirements') ?? 'None';

    const plugin = config.plugins.find(p => p.id === pluginId);
    if (!plugin) return interaction.editReply({ content: '❌ Plugin not found in config.' });

    const infoChannelId = plugin.channels.info;
    const infoChannel   = infoChannelId
      ? interaction.guild.channels.cache.get(infoChannelId)
      : interaction.guild.channels.cache.find(c => c.name === `${pluginId.toLowerCase()}-info`);

    if (!infoChannel) {
      return interaction.editReply({ content: `❌ Info channel not found. Set \`channels.info\` in config.js for ${pluginId}.` });
    }

    const status = STATUS_DISPLAY[statusKey];
    const features = featuresRaw
      ? featuresRaw.split(',').map(f => `• ${f.trim()}`).join('\n')
      : '• See Modrinth page for full feature list';

    const embed = new EmbedBuilder()
      .setTitle(`${plugin.emoji} ${plugin.id}`)
      .setDescription(description)
      .addFields(
        { name: '📌 Status',       value: status.label,   inline: true  },
        { name: '📦 Version',      value: `\`${version}\``, inline: true },
        { name: '🔗 Modrinth',     value: `[View on Modrinth](https://modrinth.com/plugin/${plugin.slug})`, inline: true },
        { name: '✨ Features',      value: features,        inline: false },
        { name: '⚙️ Requirements', value: requirements,     inline: false },
        { name: 'ℹ️ Status note',  value: status.desc,      inline: false },
      )
      .setColor(status.color)
      .setFooter({ text: `SIXsPlugins • Last updated` })
      .setTimestamp();

    // Elimina messaggi precedenti del bot nel canale e manda nuovo embed
    const msgs = await infoChannel.messages.fetch({ limit: 20 });
    const botMsgs = msgs.filter(m => m.author.id === interaction.client.user.id);
    for (const m of botMsgs.values()) {
      await m.delete().catch(() => null);
    }

    await infoChannel.send({ embeds: [embed] });

    await interaction.editReply({
      content: `✅ Plugin info updated in ${infoChannel}!\nStatus: **${status.label}** | Version: **${version}**`,
    });
  },
};
