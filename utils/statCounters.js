const { ChannelType, PermissionFlagsBits } = require('discord.js');
const fs     = require('fs');
const path   = require('path');
const config = require('../config');

const DATA_FILE = path.join(__dirname, '../data/statCounters.json');

function load() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch { return []; } }
function save(d) { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

async function modrinthFetch(url) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(url, { headers: { 'User-Agent': 'SIXsBot/2.0' } });
  if (!res.ok) throw new Error(`Modrinth ${res.status}`);
  return res.json();
}

// ── Recupera valore stat ──────────────────────────────────────────────────────
async function getStatValue(stat, guild) {
  const [type, pluginId] = stat.split(':');

  switch (type) {
    case 'downloads': {
      const plugin  = config.plugins.find(p => p.id === pluginId);
      if (!plugin) return 'N/A';
      const project = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}`);
      return project.downloads?.toLocaleString() ?? 'N/A';
    }
    case 'downloads_latest': {
      const plugin  = config.plugins.find(p => p.id === pluginId);
      if (!plugin) return 'N/A';
      const versions = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}/version?limit=1`);
      return versions[0]?.downloads?.toLocaleString() ?? 'N/A';
    }
    case 'followers': {
      const plugin  = config.plugins.find(p => p.id === pluginId);
      if (!plugin) return 'N/A';
      const project = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}`);
      return project.followers?.toLocaleString() ?? 'N/A';
    }
    case 'version': {
      const plugin   = config.plugins.find(p => p.id === pluginId);
      if (!plugin) return 'N/A';
      const versions = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}/version?limit=1`);
      return versions[0]?.version_number ?? 'N/A';
    }
    case 'versions_count': {
      const plugin   = config.plugins.find(p => p.id === pluginId);
      if (!plugin) return 'N/A';
      const versions = await modrinthFetch(`https://api.modrinth.com/v2/project/${plugin.modrinthId}/version`);
      return versions.length?.toString() ?? 'N/A';
    }
    case 'members':
      await guild.members.fetch();
      return guild.memberCount?.toLocaleString() ?? 'N/A';
    case 'members_online': {
      await guild.members.fetch();
      const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
      return online.toLocaleString();
    }
    case 'tickets_open': {
      const ticketFile = path.join(__dirname, '../data/tickets.json');
      const tickets    = JSON.parse(fs.readFileSync(ticketFile, 'utf-8') || '{}');
      return Object.values(tickets).filter(t => t.status === 'open').length.toString();
    }
    case 'tickets_closed': {
      const ticketFile = path.join(__dirname, '../data/tickets.json');
      const tickets    = JSON.parse(fs.readFileSync(ticketFile, 'utf-8') || '{}');
      return Object.values(tickets).filter(t => t.status === 'closed').length.toString();
    }
    case 'suggestions_pending': {
      const sugFile    = path.join(__dirname, '../data/suggestions.json');
      const suggestions = JSON.parse(fs.readFileSync(sugFile, 'utf-8') || '{}');
      return Object.values(suggestions).filter(s => s.status === 'pending').length.toString();
    }
    default:
      return 'N/A';
  }
}

// ── Aggiorna tutti i counter ──────────────────────────────────────────────────
async function updateAllCounters(client) {
  const counters = load();
  const guild    = client.guilds.cache.first();
  if (!guild || !counters.length) return;

  for (const counter of counters) {
    try {
      const channel = guild.channels.cache.get(counter.channelId);
      if (!channel) continue;

      const value   = await getStatValue(counter.stat, guild);
      const newName = counter.format.replace('{value}', value);

      if (channel.name !== newName) {
        await channel.setName(newName).catch(() => null);
      }
    } catch (err) {
      console.error(`❌ StatCounter error [${counter.stat}]:`, err.message);
    }
  }
}

// ── Crea nuovo counter ────────────────────────────────────────────────────────
async function createCounter(guild, { stat, format, categoryId, isPublic }) {
  const perms = isPublic
    ? []
    : [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        ...['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore'].map(rName => {
          const role = guild.roles.cache.find(r => r.name === rName);
          return role ? { id: role.id, allow: [PermissionFlagsBits.ViewChannel] } : null;
        }).filter(Boolean),
      ];

  const value   = await getStatValue(stat, guild);
  const name    = format.replace('{value}', value);

  const channel = await guild.channels.create({
    name,
    type:                 ChannelType.GuildVoice,
    parent:               categoryId ?? undefined,
    permissionOverwrites: [
      ...perms,
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
    ],
    reason: 'StatCounter created by /statcounter add',
  });

  const counters = load();
  counters.push({ channelId: channel.id, stat, format, isPublic });
  save(counters);

  return channel;
}

// ── Rimuovi counter ───────────────────────────────────────────────────────────
async function removeCounter(guild, channelId) {
  let counters = load();
  const idx    = counters.findIndex(c => c.channelId === channelId);
  if (idx === -1) return false;

  const channel = guild.channels.cache.get(channelId);
  if (channel) await channel.delete().catch(() => null);

  counters.splice(idx, 1);
  save(counters);
  return true;
}

function listCounters() { return load(); }

function startStatCounters(client) {
  console.log('📊 Stat counters started (every 10 min)');
  setTimeout(() => {
    updateAllCounters(client);
    setInterval(() => updateAllCounters(client), 10 * 60 * 1000);
  }, 60_000);
}

module.exports = { startStatCounters, createCounter, removeCounter, listCounters, getStatValue };
