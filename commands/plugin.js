const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin')
    .setDescription('Mostra informazioni su un plugin dal tuo profilo Modrinth')
    .addStringOption(opt =>
      opt.setName('nome')
        .setDescription('Nome (o parte del nome) del plugin')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('nome').toLowerCase();

    try {
      // Cerca i progetti dell'autore
      const { modrinthAuthorId } = require('../config');
      const res = await fetch(`https://api.modrinth.com/v2/user/${modrinthAuthorId}/projects`, {
        headers: { 'User-Agent': 'DiscordBot/1.0' },
      });
      const projects = await res.json();

      const match = projects.find(p =>
        p.title.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query)
      );

      if (!match) {
        return interaction.editReply({
          content: `❌ Nessun plugin trovato con il nome **${query}**. Usa \`/plugin lista\` per vedere tutti i tuoi plugin.`,
        });
      }

      // Prendi ultima versione
      const verRes = await fetch(`https://api.modrinth.com/v2/project/${match.id}/version?limit=1`, {
        headers: { 'User-Agent': 'DiscordBot/1.0' },
      });
      const versions = await verRes.json();
      const latest = versions[0];

      const embed = new EmbedBuilder()
        .setTitle(`🔧 ${match.title}`)
        .setDescription(match.description || 'Nessuna descrizione.')
        .setColor(0x1bd96a)
        .setThumbnail(match.icon_url || null)
        .setURL(`https://modrinth.com/plugin/${match.slug}`)
        .addFields(
          {
            name: '📦 Ultima Versione',
            value: latest ? `${latest.version_number} (${latest.game_versions?.slice(-1)[0] || 'N/D'})` : 'N/D',
            inline: true,
          },
          {
            name: '⬇️ Download',
            value: match.downloads?.toLocaleString() || '0',
            inline: true,
          },
          {
            name: '⭐ Follower',
            value: match.followers?.toLocaleString() || '0',
            inline: true,
          },
          {
            name: '⚙️ Loader supportati',
            value: match.loaders?.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') || 'N/D',
            inline: true,
          },
          {
            name: '🎮 Versioni MC',
            value: match.game_versions?.slice(-5).join(', ') || 'N/D',
            inline: true,
          },
          {
            name: '📄 Licenza',
            value: match.license?.id || 'N/D',
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Dati da Modrinth' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Vai su Modrinth')
          .setURL(`https://modrinth.com/plugin/${match.slug}`)
          .setStyle(ButtonStyle.Link)
          .setEmoji('🔗'),
        new ButtonBuilder()
          .setLabel('Download')
          .setURL(`https://modrinth.com/plugin/${match.slug}/versions`)
          .setStyle(ButtonStyle.Link)
          .setEmoji('⬇️')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Errore durante il recupero delle informazioni da Modrinth.' });
    }
  },
};
