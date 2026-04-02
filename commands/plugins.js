const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugins')
    .setDescription('Mostra la lista di tutti i tuoi plugin su Modrinth'),

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

      const pluginList = projects
        .map((p, i) => `**${i + 1}.** [${p.title}](https://modrinth.com/plugin/${p.slug}) — ⬇️ ${p.downloads?.toLocaleString() || 0}`)
        .join('\n');

      const totalDownloads = projects.reduce((sum, p) => sum + (p.downloads || 0), 0);
      const totalFollowers = projects.reduce((sum, p) => sum + (p.followers || 0), 0);

      const embed = new EmbedBuilder()
        .setTitle('🔌 Plugin disponibili')
        .setDescription(pluginList)
        .addFields(
          { name: '📦 Plugin totali', value: `${projects.length}`, inline: true },
          { name: '⬇️ Download totali', value: totalDownloads.toLocaleString(), inline: true },
          { name: '⭐ Follower totali', value: totalFollowers.toLocaleString(), inline: true }
        )
        .setColor(0x1bd96a)
        .setTimestamp()
        .setFooter({ text: 'Usa /plugin <nome> per i dettagli • Dati da Modrinth' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Vedi su Modrinth')
          .setURL(`https://modrinth.com/user/${config.modrinthAuthorId}`)
          .setStyle(ButtonStyle.Link)
          .setEmoji('🔗')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Errore durante il recupero dei plugin da Modrinth.' });
    }
  },
};
