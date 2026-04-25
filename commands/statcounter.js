const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
} = require('discord.js');
const { createCounter, removeCounter, listCounters } = require('../utils/statCounters');

const STAT_CHOICES = [
  { name: '⬇️  VCMute — Total downloads',         value: 'downloads:SIXsVCMute'       },
  { name: '⬇️  CanBreak — Total downloads',        value: 'downloads:SIXsCanBreak'     },
  { name: '⬇️  VCMute — Latest version downloads', value: 'downloads_latest:SIXsVCMute'  },
  { name: '⬇️  CanBreak — Latest version downloads',value: 'downloads_latest:SIXsCanBreak'},
  { name: '❤️  VCMute — Followers',                value: 'followers:SIXsVCMute'       },
  { name: '❤️  CanBreak — Followers',              value: 'followers:SIXsCanBreak'     },
  { name: '📦  VCMute — Current version',          value: 'version:SIXsVCMute'         },
  { name: '📦  CanBreak — Current version',        value: 'version:SIXsCanBreak'       },
  { name: '🗂️  VCMute — Total versions published', value: 'versions_count:SIXsVCMute'  },
  { name: '🗂️  CanBreak — Total versions published',value: 'versions_count:SIXsCanBreak'},
  { name: '👥  Server — Total members',            value: 'members'                    },
  { name: '🟢  Server — Members online',           value: 'members_online'             },
  { name: '🎫  Tickets — Currently open',          value: 'tickets_open'               },
  { name: '✅  Tickets — Total resolved',          value: 'tickets_closed'             },
  { name: '💡  Suggestions — Pending review',      value: 'suggestions_pending'        },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statcounter')
    .setDescription('📊 Manage live stat voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Create a new stat counter voice channel')
      .addStringOption(o => o
        .setName('stat')
        .setDescription('Which stat to display')
        .setRequired(true)
        .addChoices(...STAT_CHOICES)
      )
      .addStringOption(o => o
        .setName('format')
        .setDescription('Channel name format — use {value} as placeholder. E.g. "⬇️ VCMute: {value}"')
        .setRequired(true)
        .setMaxLength(90)
      )
      .addStringOption(o => o
        .setName('visibility')
        .setDescription('Who can see this channel?')
        .setRequired(true)
        .addChoices(
          { name: '🔒 Staff only (private)',  value: 'private' },
          { name: '🌐 Everyone (public)',      value: 'public'  },
        )
      )
      .addChannelOption(o => o
        .setName('category')
        .setDescription('Category where the channel will be created (optional)')
        .setRequired(false)
      )
    )

    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a stat counter channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('The stat counter channel to remove')
        .setRequired(true)
      )
    )

    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all active stat counters')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // ── ADD ──────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const stat       = interaction.options.getString('stat');
      const format     = interaction.options.getString('format');
      const visibility = interaction.options.getString('visibility');
      const category   = interaction.options.getChannel('category');

      if (!format.includes('{value}')) {
        return interaction.editReply({ content: '❌ The format must contain `{value}` as a placeholder. Example: `⬇️ Downloads: {value}`' });
      }

      try {
        const channel = await createCounter(interaction.guild, {
          stat,
          format,
          categoryId: category?.id ?? null,
          isPublic:   visibility === 'public',
        });

        await interaction.editReply({
          content: `✅ Stat counter created: **${channel.name}**\nIt will update automatically every 10 minutes.`,
        });
      } catch (e) {
        await interaction.editReply({ content: `❌ Error creating counter: ${e.message}` });
      }
    }

    // ── REMOVE ───────────────────────────────────────────────────────────────
    else if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const removed = await removeCounter(interaction.guild, channel.id);

      await interaction.editReply({
        content: removed
          ? `✅ Stat counter **${channel.name}** removed and channel deleted.`
          : '❌ That channel is not a registered stat counter.',
      });
    }

    // ── LIST ─────────────────────────────────────────────────────────────────
    else if (sub === 'list') {
      const counters = listCounters();

      if (!counters.length) {
        return interaction.editReply({ content: '📊 No stat counters configured yet. Use `/statcounter add` to create one.' });
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Active Stat Counters')
        .setColor(0x5865F2)
        .setDescription(
          counters.map((c, i) => {
            const ch = interaction.guild.channels.cache.get(c.channelId);
            const chName = ch ? `<#${c.channelId}>` : `~~${c.channelId}~~ (deleted)`;
            return `**${i + 1}.** ${chName}\n  Stat: \`${c.stat}\` | Format: \`${c.format}\` | ${c.isPublic ? '🌐 Public' : '🔒 Private'}`;
          }).join('\n\n')
        )
        .setFooter({ text: 'Counters update every 10 minutes' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
