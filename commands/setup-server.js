const {
  SlashCommandBuilder, PermissionFlagsBits,
  ChannelType, EmbedBuilder,
} = require('discord.js');
const config = require('../config');
const fs     = require('fs');
const path   = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ROLES = [
  { name: '⚡ SIXs',           color: 0xF4C75A, hoist: true,  pos: 8, admin: true  },
  { name: '⚙️ Developer',      color: 0xAA8ED6, hoist: true,  pos: 7, admin: false },
  { name: '🛡️ Moderatore',     color: 0x5865F2, hoist: true,  pos: 6, admin: false },
  { name: '🤝 Helper',         color: 0x1ABFA0, hoist: true,  pos: 5, admin: false },
  { name: '💎 Premium',        color: 0xE67E7E, hoist: true,  pos: 4, admin: false },
  { name: '🔔 SIXsVCMute',     color: 0xAA8ED6, hoist: false, pos: 3, admin: false },
  { name: '🔔 SIXsCanBreak',   color: 0x1ABFA0, hoist: false, pos: 2, admin: false },
  { name: '✅ Verified',        color: 0x57F287, hoist: false, pos: 1, admin: false },
  { name: '👤 Member',         color: 0x99AAB5, hoist: false, pos: 0, admin: false },
];

// readOnly: solo staff può scrivere
// staffOnly: nascosta a tutti tranne staff
// unverified: visibile solo ai non verificati (es. #verify)
const STRUCTURE = [
  {
    name: '🚪 WELCOME',
    channels: [
      { name: 'welcome',              type: 'text',    readOnly: true  },
      { name: 'rules',                type: 'text',    readOnly: true  },
      { name: 'verify',               type: 'text',    readOnly: true  },
      { name: 'choose-notifications', type: 'text',    readOnly: true  },
    ],
  },
  {
    name: '📢 INFORMATION',
    channels: [
      { name: 'announcements', type: 'announce', readOnly: true },
      { name: 'roadmap',       type: 'text',     readOnly: true },
      { name: 'suggestions',   type: 'text'                     },
    ],
  },
  {
    name: '🔊 SIXsVCMute',
    channels: [
      { name: 'vcmute-info',      type: 'text',    readOnly: true },
      { name: 'vcmute-updates',   type: 'announce', readOnly: true },
      { name: 'vcmute-changelog', type: 'text',    readOnly: true },
      { name: 'vcmute-faq',       type: 'text',    readOnly: true },
    ],
  },
  {
    name: '⛏️ SIXsCanBreak',
    channels: [
      { name: 'canbreak-info',      type: 'text',    readOnly: true },
      { name: 'canbreak-updates',   type: 'announce', readOnly: true },
      { name: 'canbreak-changelog', type: 'text',    readOnly: true },
      { name: 'canbreak-faq',       type: 'text',    readOnly: true },
    ],
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: 'general',            type: 'text',  slowmode: 5  },
      { name: 'plugin-discussion',  type: 'text'               },
      { name: 'showcase',           type: 'text',  slowmode: 30 },
      { name: 'media',              type: 'text',  slowmode: 30 },
      { name: 'introductions',      type: 'text',  slowmode: 60 },
    ],
  },
  {
    name: '🎫 SUPPORT',
    channels: [
      { name: 'open-ticket', type: 'text', readOnly: true },
    ],
  },
  {
    name: '🔒 STAFF',
    staffOnly: true,
    channels: [
      { name: 'staff-chat',     type: 'text' },
      { name: 'ticket-logs',    type: 'text' },
      { name: 'mod-logs',       type: 'text' },
      { name: 'milestones',     type: 'text' },
      { name: 'faq-pending',    type: 'text' },
      { name: 'internal-notes', type: 'text' },
    ],
  },
  {
    name: '🎫 TICKETS',
    staffOnly: true,
    channels: [], // categoria vuota: i ticket vengono creati qui dinamicamente
  },
];

async function runSetup(guild) {
  const res = { rolesCreated: 0, channelsCreated: 0, skipped: 0, errors: [], channelIds: {} };
  const roleMap = {};
  const everyone = guild.roles.everyone;
  const staffNames = ['⚡ SIXs', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper'];

  // 1. Ruoli
  for (const rd of ROLES) {
    try {
      const existing = guild.roles.cache.find(r => r.name === rd.name);
      if (existing) { roleMap[rd.name] = existing; res.skipped++; continue; }
      const role = await guild.roles.create({
        name: rd.name, color: rd.color, hoist: rd.hoist,
        permissions: rd.admin ? ['Administrator'] : [],
        reason: 'SIXsBot v2 setup',
      });
      roleMap[rd.name] = role;
      res.rolesCreated++;
      await sleep(300);
    } catch (e) { res.errors.push(`Role ${rd.name}: ${e.message}`); }
  }

  // 2. Categorie e canali
  for (const catDef of STRUCTURE) {
    try {
      const catPerms = [];

      if (catDef.staffOnly) {
        catPerms.push({ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
        for (const rn of staffNames) {
          if (roleMap[rn]) catPerms.push({ id: roleMap[rn].id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        }
      }

      const cat = await guild.channels.create({
        name: catDef.name, type: ChannelType.GuildCategory,
        permissionOverwrites: catPerms, reason: 'SIXsBot v2 setup',
      });
      res.channelIds[catDef.name] = cat.id;
      await sleep(400);

      for (const ch of catDef.channels) {
        try {
          const chPerms = [...catPerms];

          if (ch.readOnly && !catDef.staffOnly) {
            chPerms.push({ id: everyone.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel] });
            for (const rn of staffNames) {
              if (roleMap[rn]) chPerms.push({ id: roleMap[rn].id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel] });
            }
          }

          let type;
          if (ch.type === 'announce')   type = ChannelType.GuildAnnouncement;
          else if (ch.type === 'forum') type = ChannelType.GuildForum;
          else if (ch.type === 'voice') type = ChannelType.GuildVoice;
          else                          type = ChannelType.GuildText;

          const created = await guild.channels.create({
            name: ch.name, type, parent: cat.id,
            permissionOverwrites: chPerms,
            rateLimitPerUser: ch.slowmode ?? 0,
            reason: 'SIXsBot v2 setup',
          });
          res.channelIds[ch.name] = created.id;
          res.channelsCreated++;
          await sleep(350);
        } catch (e) { res.errors.push(`#${ch.name}: ${e.message}`); }
      }
    } catch (e) { res.errors.push(`Category ${catDef.name}: ${e.message}`); }
  }

  // 3. Aggiorna config.js con gli ID creati
  try {
    const configPath = path.join(__dirname, '../config.js');
    let src = fs.readFileSync(configPath, 'utf-8');

    const replacements = {
      'announcements:   null': `announcements:   '${res.channelIds['announcements'] ?? ''}'`,
      'roadmap:         null': `roadmap:         '${res.channelIds['roadmap'] ?? ''}'`,
      'suggestions:     null': `suggestions:     '${res.channelIds['suggestions'] ?? ''}'`,
      'ticketPanel:     null': `ticketPanel:     '${res.channelIds['open-ticket'] ?? ''}'`,
      'ticketLogs:      null': `ticketLogs:      '${res.channelIds['ticket-logs'] ?? ''}'`,
      'modLogs:         null': `modLogs:         '${res.channelIds['mod-logs'] ?? ''}'`,
      'milestones:      null': `milestones:      '${res.channelIds['milestones'] ?? ''}'`,
      'faqPending:      null': `faqPending:      '${res.channelIds['faq-pending'] ?? ''}'`,
    };

    for (const [from, to] of Object.entries(replacements)) {
      src = src.replace(from, to);
    }
    fs.writeFileSync(configPath, src);
  } catch (e) { res.errors.push(`Config auto-update: ${e.message}`); }

  return res;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('⚙️ Full server setup — channels, roles, permissions (run once!)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ content: '⚙️ Setting up the server… this may take ~30 seconds.', ephemeral: true });
    try {
      const res = await runSetup(interaction.guild);
      const embed = new EmbedBuilder()
        .setTitle('✅ Server setup complete!')
        .setColor(0x57F287)
        .addFields(
          { name: '🎭 Roles',    value: `${res.rolesCreated} created`,    inline: true },
          { name: '📁 Channels', value: `${res.channelsCreated} created`, inline: true },
          { name: '↩️ Skipped',  value: `${res.skipped} existing`,        inline: true },
        )
        .setDescription(res.errors.length
          ? `⚠️ Some errors:\n\`\`\`\n${res.errors.slice(0, 5).join('\n')}\n\`\`\``
          : '✨ No errors!')
        .addFields({ name: '📋 Next steps',
          value:
            '1. Assign yourself the **⚡ SIXs** role\n' +
            '2. Use `/verify-panel` in **#verify**\n' +
            '3. Use `/notif-panel` in **#choose-notifications**\n' +
            '4. Use `/ticket-panel` in **#open-ticket**\n' +
            '5. Use `/plugin-status` to set each plugin status in its info channel\n' +
            '6. Config.js has been auto-updated with channel IDs — restart the bot',
        })
        .setTimestamp();
      await interaction.editReply({ content: '', embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: `❌ Setup failed: \`${e.message}\`` });
    }
  },
};
