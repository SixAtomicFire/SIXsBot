const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/modrinth_cache.json');

function ensureDataDir() {
  const dir = path.join(__dirname, '../data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadCache() {
  ensureDataDir();
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function fetchUserProjects() {
  const res = await fetch(`https://api.modrinth.com/v2/user/${config.modrinthAuthorId}/projects`, {
    headers: { 'User-Agent': 'DiscordBot/1.0' },
  });
  if (!res.ok) throw new Error(`Modrinth API error: ${res.status}`);
  return res.json();
}

async function fetchLatestVersion(projectId) {
  const res = await fetch(`https://api.modrinth.com/v2/project/${projectId}/version?limit=1`, {
    headers: { 'User-Agent': 'DiscordBot/1.0' },
  });
  if (!res.ok) return null;
  const versions = await res.json();
  return versions[0] || null;
}

function formatChangelog(text, maxLen = 600) {
  if (!text) return '_Nessun changelog disponibile._';
  // Pulisce markdown di Modrinth per Discord
  let clean = text
    .replace(/#{1,3} /g, '**')
    .replace(/\*\*(.*?)\*\*/g, '**$1**')
    .replace(/^\s*[-*]\s/gm, '• ')
    .trim();
  if (clean.length > maxLen) clean = clean.substring(0, maxLen) + '...';
  return clean;
}

async function checkForUpdates(client) {
  try {
    const projects = await fetchUserProjects();
    const cache = loadCache();
    const channel = await client.channels.fetch(config.channels.announcements).catch(() => null);
    if (!channel) return;

    for (const project of projects) {
      const latest = await fetchLatestVersion(project.id);
      if (!latest) continue;

      const cachedVersionId = cache[project.id];
      if (cachedVersionId === latest.id) continue;

      // Nuova versione trovata!
      cache[project.id] = latest.id;

      const gameVersions = latest.game_versions?.slice(-5).join(', ') || 'N/D';
      const loaders = latest.loaders?.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') || 'N/D';
      const changelog = formatChangelog(latest.changelog);
      const isFirstCheck = cachedVersionId === undefined;

      if (isFirstCheck) {
        // Prima esecuzione: salva senza annunciare
        console.log(`📦 Cache inizializzata: ${project.title} @ ${latest.version_number}`);
        continue;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🔔 Nuovo aggiornamento: ${project.title}`)
        .setDescription(`**${latest.name}** è ora disponibile su Modrinth!`)
        .addFields(
          { name: '📦 Versione', value: `\`${latest.version_number}\``, inline: true },
          { name: '🎮 Minecraft', value: gameVersions, inline: true },
          { name: '⚙️ Loader', value: loaders, inline: true },
          { name: '📝 Changelog', value: changelog },
        )
        .setColor(0x1bd96a)
        .setThumbnail(project.icon_url || null)
        .setURL(`https://modrinth.com/plugin/${project.slug}`)
        .setTimestamp()
        .setFooter({ text: 'Modrinth • Aggiornamento automatico' });

      await channel.send({ content: '@everyone', embeds: [embed] });
      console.log(`📢 Annunciato aggiornamento: ${project.title} v${latest.version_number}`);
    }

    saveCache(cache);
  } catch (error) {
    console.error('❌ Errore Modrinth checker:', error.message);
  }
}

function startModrinthChecker(client) {
  const intervalMs = (config.modrinthCheckInterval || 10) * 60 * 1000;
  console.log(`🔄 Modrinth checker avviato (ogni ${config.modrinthCheckInterval} minuti)`);
  // Primo check dopo 30 secondi dall'avvio
  setTimeout(() => {
    checkForUpdates(client);
    setInterval(() => checkForUpdates(client), intervalMs);
  }, 30_000);
}

module.exports = { startModrinthChecker, checkForUpdates };
