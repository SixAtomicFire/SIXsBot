const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require('discord.js');

const CATEGORIES = {
  general: {
    label: '📖 General',
    description: 'Basic commands for everyone',
    commands: [
      { name: '/help',    desc: 'Show this help menu'                              },
      { name: '/stats',   desc: 'Live download & version stats for SIXsPlugins'   },
      { name: '/suggest', desc: 'Submit a suggestion for a plugin or the server'  },
      { name: '/faq',     desc: 'Submit a question for the FAQ (staff reviews it)' },
      { name: '/bug',     desc: 'Guided bug report wizard'                         },
    ],
  },
  support: {
    label: '🎫 Support',
    description: 'Get help with plugins',
    commands: [
      { name: '/bug',          desc: 'Report a bug with a step-by-step form'          },
      { name: 'Open a Ticket', desc: 'Click the button in #open-ticket for 1-on-1 support' },
    ],
  },
  plugins: {
    label: '🔌 Plugins',
    description: 'Plugin-related commands',
    commands: [
      { name: '/stats [plugin]', desc: 'View live Modrinth stats for a plugin'        },
      { name: '#vcmute-info',    desc: 'Info, status and version for SIXsVCMute'      },
      { name: '#canbreak-info',  desc: 'Info, status and version for SIXsCanBreak'    },
      { name: '#vcmute-faq',     desc: 'Frequently asked questions for SIXsVCMute'    },
      { name: '#canbreak-faq',   desc: 'Frequently asked questions for SIXsCanBreak'  },
    ],
  },
  staff: {
    label: '🛡️ Staff',
    description: 'Staff-only commands',
    commands: [
      { name: '/setup-server',     desc: 'Full server setup — channels, roles, permissions' },
      { name: '/panel verify',     desc: 'Send the verification panel'                       },
      { name: '/panel notifications', desc: 'Send the plugin notification panel'              },
      { name: '/panel ticket',     desc: 'Send the ticket panel'                             },
      { name: '/plugin-status',    desc: 'Update plugin status and info in its channel'      },
      { name: '/statcounter add',  desc: 'Create a live stat voice channel'                  },
      { name: '/statcounter remove', desc: 'Remove a stat voice channel'                     },
      { name: '/statcounter list', desc: 'List all active stat counters'                     },
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Show the SIXsBot command list'),

  async execute(interaction) {
    const mainEmbed = new EmbedBuilder()
      .setTitle('📖 SIXsBot — Help')
      .setDescription(
        'Welcome to the SIXsPlugins bot! Select a category below to see the available commands.\n\n' +
        '**Quick links:**\n' +
        '→ Report a bug: `/bug`\n' +
        '→ Submit a suggestion: `/suggest`\n' +
        '→ Plugin statistics: `/stats`\n' +
        '→ Open a support ticket: **#open-ticket**'
      )
      .setColor(0x5865F2)
      .addFields(
        Object.values(CATEGORIES).map(cat => ({
          name:   cat.label,
          value:  cat.description,
          inline: true,
        }))
      )
      .setFooter({ text: 'SIXsPlugins • Use the menu below to explore commands' })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category')
      .setPlaceholder('Select a category...')
      .addOptions(
        Object.entries(CATEGORIES).map(([key, cat]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.label)
            .setValue(key)
            .setDescription(cat.description)
        )
      );

    const row = new ActionRowBuilder().addComponents(menu);
    const reply = await interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });

    // Collector per la selezione categoria
    const collector = reply.createMessageComponentCollector({
      filter: i => i.customId === 'help_category' && i.user.id === interaction.user.id,
      time: 2 * 60 * 1000,
    });

    collector.on('collect', async i => {
      const catKey = i.values[0];
      const cat    = CATEGORIES[catKey];

      const catEmbed = new EmbedBuilder()
        .setTitle(cat.label)
        .setDescription(cat.description)
        .setColor(0x5865F2)
        .addFields(
          cat.commands.map(cmd => ({
            name:  cmd.name,
            value: cmd.desc,
          }))
        )
        .setFooter({ text: 'Select another category from the menu' });

      await i.update({ embeds: [catEmbed], components: [row] });
    });

    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => null);
    });
  },
};
