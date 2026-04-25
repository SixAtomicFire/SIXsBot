const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

async function modrinthFetch(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, { headers: { 'User-Agent': 'SIXsBot/2.0' } });
  if (!res.ok) throw new Error(`Modrinth API ${res.status}`);
  return res.json();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('📊 Show live statistics for SIXsPlugins from Modrinth')
    .addStringOption(o => o
      .setName('plugin')
      .setDescription('Specific plugin (leave empty for all)')
      .setRequired(false)
      .addChoices(...config.plugins.map(p => ({ name: p.id, value: p.id })))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const pluginId = interaction.options.getString('plugin');
    const targets  = pluginId
      ? config.plugins.filter(p => p.id === pluginId)
      : config.plugins;

    try {
      const embeds = [];

      for (const plugin of targets) {
        const [project, versions] = await Promise.all([
          modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}`),
          modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}/version`),
        ]);

        const latest        = versions[0];
        const totalDownloads = project.downloads ?? 0;
        const followers      = project.followers  ?? 0;
        const versionCount   = versions.length;
        const latestVersion  = latest?.version_number ?? 'N/A';
        const gameVersions   = latest?.game_versions?.slice(-3).join(', ') ?? 'N/A';
        const loaders        = latest?.loaders?.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') ?? 'N/A';
        const releaseType    = latest?.version_type === 'release' ? '🟢 Release' :
                               latest?.version_type === 'beta'    ? '🟡 Beta'    : '🔴 Alpha';
        const updatedAt      = latest?.date_published
          ? `<t:${Math.floor(new Date(latest.date_published).getTime() / 1000)}:R>`
          : 'N/A';

        // Calcola download dell'ultima versione
        const latestDownloads = versions
          .filter(v => v.version_number === latestVersion)
          .reduce((sum, v) => sum + (v.downloads ?? 0), 0);

        // Milestone progressione
        const milestones  = config.milestones;
        const nextMilestone = milestones.find(m => m > totalDownloads);
        const progressBar  = nextMilestone
          ? buildProgressBar(totalDownloads, nextMilestone)
          : '🏆 All milestones reached!';

        const embed = new EmbedBuilder()
          .setTitle(`${plugin.emoji} ${plugin.id} — Statistics`)
          .setColor(plugin.color)
          .setURL(`https://modrinth.com/plugin/${plugin.slug}`)
          .setThumbnail(project.icon_url ?? null)
          .addFields(
            { name: '⬇️ Total Downloads',         value: totalDownloads.toLocaleString(),  inline: true },
            { name: '⬇️ Latest Version Downloads', value: latestDownloads.toLocaleString(), inline: true },
            { name: '❤️ Followers',               value: followers.toLocaleString(),        inline: true },
            { name: '📦 Latest Version',           value: `\`${latestVersion}\` (${releaseType})`, inline: true },
            { name: '🎮 Minecraft',                value: gameVersions,                     inline: true },
            { name: '⚙️ Loader',                  value: loaders,                          inline: true },
            { name: '🗂️ Versions Published',      value: versionCount.toString(),           inline: true },
            { name: '🕐 Last Update',              value: updatedAt,                        inline: true },
            { name: `📈 Next milestone: ${nextMilestone?.toLocaleString() ?? '🏆'}`, value: progressBar, inline: false },
          )
          .setFooter({ text: 'Data from Modrinth API • Live' })
          .setTimestamp();

        embeds.push(embed);
      }

      await interaction.editReply({ embeds });

    } catch (e) {
      await interaction.editReply({ content: `❌ Failed to fetch stats: ${e.message}` });
    }
  },
};

function buildProgressBar(current, target, length = 20) {
  const pct   = Math.min(current / target, 1);
  const filled = Math.round(pct * length);
  const bar    = '█'.repeat(filled) + '░'.repeat(length - filled);
  return `\`${bar}\` ${(pct * 100).toFixed(1)}% (${current.toLocaleString()} / ${target.toLocaleString()})`;
}
