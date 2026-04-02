const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Mostra il changelog delle ultime versioni di un plugin')
    .addStringOption(opt =>
      opt.setName('plugin')
        .setDescription('Nome del plugin')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('versioni')
        .setDescription('Quante versioni mostrare (default: 3, max: 5)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(5)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('plugin').toLowerCase();
    const count = interaction.options.getInteger('versioni') || 3;

    try {
      const res = await fetch(`https://api.modrinth.com/v2/user/${config.modrinthAuthorId}/projects`, {
        headers: { 'User-Agent': 'DiscordBot/1.0' },
      });
      const projects = await res.json();

      const match = projects.find(p =>
        p.title.toLowerCase().includes(query) || p.slug.toLowerCase().includes(query)
      );

      if (!match) {
        return interaction.editReply({
          content: `❌ Nessun plugin trovato con il nome **${query}**. Usa \`/plugins\` per vedere la lista completa.`,
        });
      }

      const verRes = await fetch(`https://api.modrinth.com/v2/project/${match.id}/version?limit=${count}`, {
        headers: { 'User-Agent': 'DiscordBot/1.0' },
      });
      const versions = await verRes.json();

      if (!versions.length) {
        return interaction.editReply({ content: '❌ Nessuna versione trovata per questo plugin.' });
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Changelog — ${match.title}`)
        .setColor(0x1bd96a)
        .setThumbnail(match.icon_url || null)
        .setURL(`https://modrinth.com/plugin/${match.slug}/versions`)
        .setTimestamp()
        .setFooter({ text: `Ultime ${versions.length} versioni • Modrinth` });

      for (const ver of versions) {
        const changelog = ver.changelog
          ? ver.changelog.substring(0, 300) + (ver.changelog.length > 300 ? '...' : '')
          : '_Nessun changelog disponibile._';

        const date = new Date(ver.date_published).toLocaleDateString('it-IT');
        const mc = ver.game_versions?.slice(-3).join(', ') || 'N/D';

        embed.addFields({
          name: `📦 ${ver.version_number} — ${date}`,
          value: `🎮 MC: \`${mc}\` | ⚙️ ${ver.loaders?.join(', ') || 'N/D'}\n${changelog}`,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Tutte le versioni')
          .setURL(`https://modrinth.com/plugin/${match.slug}/versions`)
          .setStyle(ButtonStyle.Link)
          .setEmoji('📋')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Errore durante il recupero del changelog da Modrinth.' });
    }
  },
};
