const { EmbedBuilder } = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');

const CACHE_FILE      = path.join(__dirname, '../data/modrinth_cache.json');
const MILESTONE_FILE  = path.join(__dirname, '../data/milestones.json');

function loadCache()    { try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch { return {}; } }
function saveCache(d)   { fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true }); fs.writeFileSync(CACHE_FILE, JSON.stringify(d, null, 2)); }
function loadMilestones() { try { return JSON.parse(fs.readFileSync(MILESTONE_FILE, 'utf-8')); } catch { return {}; } }
function saveMilestones(d) { fs.mkdirSync(path.dirname(MILESTONE_FILE), { recursive: true }); fs.writeFileSync(MILESTONE_FILE, JSON.stringify(d, null, 2)); }

async function modrinthFetch(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, { headers: { 'User-Agent': 'SIXsBot/2.0 (discord)' } });
  if (!res.ok) throw new Error(`Modrinth API ${res.status}: ${url}`);
  return res.json();
}

function formatChangelog(text, max = 500) {
  if (!text) return '_No changelog provided._';
  const clean = text.replace(/#{1,3} /g, '**').replace(/^\s*[-*]\s/gm, '• ').trim();
  return clean.length > max ? clean.slice(0, max) + '…' : clean;
}

async function checkUpdates(client) {
  const cache      = loadCache();
  const milestones = loadMilestones();

  for (const plugin of config.plugins) {
    try {
      // Fetch project info
      const project = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}`);
      const versions = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}/version?limit=1`);
      const latest   = versions[0];
      if (!latest) continue;

      const totalDownloads = project.downloads ?? 0;

      // ── Controlla milestone download ─────────────────────────────────────
      const prevDownloads = milestones[plugin.id]?.downloads ?? 0;
      for (const milestone of config.milestones) {
        if (totalDownloads >= milestone && prevDownloads < milestone) {
          const milestoneChannel = client.guilds.cache
            .first()?.channels.cache.get(config.channels.milestones);
          if (milestoneChannel) {
            const mEmbed = new EmbedBuilder()
              .setTitle(`🎉 Milestone reached: ${plugin.id}`)
              .setDescription(`**${plugin.emoji} ${plugin.id}** just hit **${milestone.toLocaleString()} downloads!**`)
              .setColor(plugin.color)
              .setTimestamp();
            await milestoneChannel.send({ embeds: [mEmbed] });
          }
        }
      }
      if (!milestones[plugin.id]) milestones[plugin.id] = {};
      milestones[plugin.id].downloads = totalDownloads;
      saveMilestones(milestones);

      // ── Controlla nuova versione ─────────────────────────────────────────
      if (cache[plugin.id] === latest.id) continue;

      const isFirst = cache[plugin.id] === undefined;
      cache[plugin.id] = latest.id;
      saveCache(cache);

      if (isFirst) {
        console.log(`📦 Cache initialized: ${plugin.id} @ ${latest.version_number}`);
        continue;
      }

      // ── Trova canale update ──────────────────────────────────────────────
      const guild         = client.guilds.cache.first();
      const updateChannel = guild?.channels.cache.get(plugin.channels.updates);
      if (!updateChannel) continue;

      // ── Trova ruolo notifiche ────────────────────────────────────────────
      const notifRole = guild.roles.cache.find(r => r.name === plugin.roleName);

      const gameVersions = latest.game_versions?.slice(-3).join(', ') || 'N/A';
      const loaders      = latest.loaders?.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ') || 'N/A';
      const changelog    = formatChangelog(latest.changelog);
      const releaseType  = latest.version_type === 'release' ? '🟢 Release' :
                           latest.version_type === 'beta'    ? '🟡 Beta'    : '🔴 Alpha';

      const embed = new EmbedBuilder()
        .setTitle(`${plugin.emoji} ${plugin.id} — v${latest.version_number}`)
        .setDescription(`**${releaseType}** is now available on Modrinth!`)
        .addFields(
          { name: '📦 Version',   value: `\`${latest.version_number}\``, inline: true },
          { name: '🎮 Minecraft', value: gameVersions,                    inline: true },
          { name: '⚙️ Loader',   value: loaders,                         inline: true },
          { name: '📝 Changelog', value: changelog },
        )
        .setColor(plugin.color)
        .setThumbnail(project.icon_url ?? null)
        .setURL(`https://modrinth.com/plugin/${plugin.slug}`)
        .setTimestamp()
        .setFooter({ text: 'Modrinth • Auto-update notification' });

      const pingContent = notifRole ? `<@&${notifRole.id}>` : '';
      const msg = await updateChannel.send({ content: pingContent, embeds: [embed] });

      // Apri thread per commenti
      await msg.startThread({
        name: `${plugin.id} v${latest.version_number} — Discussion`,
        autoArchiveDuration: 1440,
        reason: 'Auto-created for update discussion',
      }).catch(() => null);

      console.log(`📢 Announced update: ${plugin.id} v${latest.version_number}`);

      // ── Salva anche nel canale changelog ─────────────────────────────────
      const changelogChannel = guild.channels.cache.get(plugin.channels.changelog);
      if (changelogChannel) {
        const clEmbed = new EmbedBuilder()
          .setTitle(`📋 ${plugin.id} v${latest.version_number} Changelog`)
          .setDescription(formatChangelog(latest.changelog, 2000))
          .addFields(
            { name: 'Version',    value: `\`${latest.version_number}\``, inline: true },
            { name: 'Type',       value: releaseType,                    inline: true },
            { name: 'Minecraft',  value: gameVersions,                   inline: true },
          )
          .setColor(plugin.color)
          .setURL(`https://modrinth.com/plugin/${plugin.slug}/version/${latest.version_number}`)
          .setTimestamp();
        await changelogChannel.send({ embeds: [clEmbed] });
      }

    } catch (err) {
      console.error(`❌ Modrinth check error [${plugin.id}]:`, err.message);
    }
  }
}

function startModrinthChecker(client) {
  const interval = (config.modrinthCheckInterval || 10) * 60 * 1000;
  console.log(`🔄 Modrinth checker started (every ${config.modrinthCheckInterval} min)`);
  setTimeout(() => {
    checkUpdates(client);
    setInterval(() => checkUpdates(client), interval);
  }, 30_000);
}

module.exports = { startModrinthChecker, checkUpdates };
