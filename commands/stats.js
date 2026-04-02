const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

function bar(value, max, length = 12) {
  const filled = Math.round((value / max) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Statistiche globali di tutti i tuoi plugin su Modrinth'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const res = await fetch(`https://api.modrinth.com/v2/user/${config.modrinthAuthorId}/projects`, {
        headers: { 'User-Agent': 'DiscordBot/1.0' },
      });
      const projects = await res.json();

      if (!projects.length) {
        return interaction.editReply({ content: '❌ Nessun plugin trovato su Modrinth.' });
      }

      const totalDownloads = projects.reduce((s, p) => s + (p.downloads || 0), 0);
      const totalFollowers = projects.reduce((s, p) => s + (p.followers || 0), 0);
      const maxDownloads = Math.max(...projects.map(p => p.downloads || 0));

      // Ordina per download
      const sorted = [...projects].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));

      const chartLines = sorted.map(p => {
        const pct = totalDownloads > 0 ? ((p.downloads / totalDownloads) * 100).toFixed(1) : '0.0';
        return `\`${bar(p.downloads || 0, maxDownloads || 1)}\` **${p.title}**\n↳ ⬇️ ${(p.downloads || 0).toLocaleString()} download (${pct}%)`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setTitle('📊 Statistiche Plugin')
        .setColor(0x1bd96a)
        .setDescription(chartLines)
        .addFields(
          { name: '📦 Plugin totali', value: `${projects.length}`, inline: true },
          { name: '⬇️ Download totali', value: totalDownloads.toLocaleString(), inline: true },
          { name: '⭐ Follower totali', value: totalFollowers.toLocaleString(), inline: true },
          { name: '🏆 Plugin più scaricato', value: sorted[0]?.title || 'N/D', inline: true },
          { name: '📈 Media download/plugin', value: Math.round(totalDownloads / projects.length).toLocaleString(), inline: true },
        )
        .setTimestamp()
        .setFooter({ text: 'Dati in tempo reale da Modrinth' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Profilo Modrinth')
          .setURL(`https://modrinth.com/user/${config.modrinthAuthorId}`)
          .setStyle(ButtonStyle.Link)
          .setEmoji('🔗')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Errore durante il recupero delle statistiche.' });
    }
  },
};
