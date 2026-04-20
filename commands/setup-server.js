/**
 * ============================================================
 *  commands/setup-server.js
 *  Comando slash  /setup-server
 *
 *  Crea automaticamente categorie, canali e ruoli nel server.
 *  Usabile una sola volta dallo staff (richiede Manage Guild).
 *
 *  INSTALLAZIONE:
 *  1. Copia questo file in  commands/setup-server.js
 *  2. Esegui  node deploy-commands.js  per registrare il comando
 *  3. Sul server usa  /setup-server  — solo una volta!
 * ============================================================
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');

// ── STRUTTURA SERVER ──────────────────────────────────────────────────────────
//
//  lockFor     → ruoli che vedono ma NON possono scrivere
//  staffOnly   → visibile solo a Owner / Developer / Moderatore
//  premiumOnly → visibile solo a Premium e staff
//  slowmode    → secondi di slowmode
//
const ROLES = [
  { name: '👑 Owner',      color: 0xF4C75A, hoist: true,  mentionable: false },
  { name: '⚙️ Developer',  color: 0xAA8ED6, hoist: true,  mentionable: false },
  { name: '🛡️ Moderatore', color: 0x5865F2, hoist: true,  mentionable: false },
  { name: '🤝 Helper',     color: 0x1ABFA0, hoist: true,  mentionable: true  },
  { name: '💎 Premium',    color: 0xE67E7E, hoist: true,  mentionable: false },
  { name: '✅ Verificato', color: 0x57F287, hoist: false, mentionable: false },
  { name: '👤 Membro',     color: 0x99AAB5, hoist: false, mentionable: false },
];

const STRUCTURE = [
  {
    category: '📢 INFORMAZIONI',
    channels: [
      { name: 'benvenuto',  type: 'text',     lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'regole',     type: 'text',     lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'annunci',    type: 'announce', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'changelog',  type: 'announce', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
    ],
  },
  {
    category: '🔌 PLUGIN',
    channels: [
      { name: 'lista-plugin',   type: 'text', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'download',       type: 'text', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'documentazione', type: 'text', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'roadmap',        type: 'text', lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
    ],
  },
  {
    category: '🛠️ SUPPORTO',
    channels: [
      { name: 'prima-di-chiedere', type: 'text',  lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'apri-ticket',       type: 'text',  lockFor: ['👤 Membro', '✅ Verificato', '💎 Premium', '🤝 Helper'] },
      { name: 'bug-report',        type: 'forum', slowmode: 30 },
      { name: 'domande-generali',  type: 'forum', slowmode: 10 },
    ],
  },
  {
    category: '💬 COMMUNITY',
    channels: [
      { name: 'generale',             type: 'text', slowmode: 5  },
      { name: 'mostra-il-tuo-server', type: 'text', slowmode: 30 },
      { name: 'suggerimenti',         type: 'forum' },
      { name: 'off-topic',            type: 'text' },
    ],
  },
  {
    category: '💎 PREMIUM',
    premiumOnly: true,
    channels: [
      { name: 'premium-lounge',   type: 'text' },
      { name: 'beta-access',      type: 'text' },
      { name: 'anteprima-update', type: 'text', lockFor: ['💎 Premium'] },
    ],
  },
  {
    category: '🔒 STAFF ONLY',
    staffOnly: true,
    channels: [
      { name: 'staff-chat',   type: 'text' },
      { name: 'log-ticket',   type: 'text' },
      { name: 'note-interne', type: 'text' },
    ],
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── LOGICA SETUP ──────────────────────────────────────────────────────────────

async function runSetup(guild) {
  const results = { rolesCreated: 0, channelsCreated: 0, skipped: 0, errors: [] };

  // 1. Crea ruoli
  const roleMap = {};
  for (const roleDef of ROLES) {
    try {
      const existing = guild.roles.cache.find((r) => r.name === roleDef.name);
      if (existing) {
        roleMap[roleDef.name] = existing;
        results.skipped++;
        continue;
      }
      const role = await guild.roles.create({
        name:        roleDef.name,
        color:       roleDef.color,
        hoist:       roleDef.hoist,
        mentionable: roleDef.mentionable,
        reason:      'Setup automatico SIXsBot',
      });
      roleMap[roleDef.name] = role;
      results.rolesCreated++;
      await sleep(300);
    } catch (err) {
      results.errors.push(`Ruolo ${roleDef.name}: ${err.message}`);
    }
  }

  const everyone = guild.roles.everyone;

  // 2. Crea categorie e canali
  for (const catDef of STRUCTURE) {
    try {
      const catPerms = [];

      if (catDef.staffOnly) {
        catPerms.push({ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
        for (const rName of ['👑 Owner', '⚙️ Developer', '🛡️ Moderatore']) {
          if (roleMap[rName]) {
            catPerms.push({
              id:    roleMap[rName].id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            });
          }
        }
      } else if (catDef.premiumOnly) {
        catPerms.push({ id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] });
        for (const rName of ['👑 Owner', '⚙️ Developer', '🛡️ Moderatore', '🤝 Helper', '💎 Premium']) {
          if (roleMap[rName]) {
            catPerms.push({ id: roleMap[rName].id, allow: [PermissionFlagsBits.ViewChannel] });
          }
        }
      }

      const category = await guild.channels.create({
        name:                 catDef.category,
        type:                 ChannelType.GuildCategory,
        permissionOverwrites: catPerms,
        reason:               'Setup automatico SIXsBot',
      });
      await sleep(400);

      for (const chDef of catDef.channels) {
        try {
          const chPerms = [...catPerms];

          if (chDef.lockFor) {
            for (const rName of chDef.lockFor) {
              if (roleMap[rName]) {
                chPerms.push({
                  id:    roleMap[rName].id,
                  deny:  [PermissionFlagsBits.SendMessages],
                  allow: [PermissionFlagsBits.ViewChannel],
                });
              }
            }
          }

          let channelType;
          if (chDef.type === 'announce')    channelType = ChannelType.GuildAnnouncement;
          else if (chDef.type === 'forum')  channelType = ChannelType.GuildForum;
          else if (chDef.type === 'voice')  channelType = ChannelType.GuildVoice;
          else                              channelType = ChannelType.GuildText;

          await guild.channels.create({
            name:                 chDef.name,
            type:                 channelType,
            parent:               category.id,
            permissionOverwrites: chPerms,
            rateLimitPerUser:     chDef.slowmode ?? 0,
            reason:               'Setup automatico SIXsBot',
          });

          results.channelsCreated++;
          await sleep(350);
        } catch (err) {
          results.errors.push(`Canale #${chDef.name}: ${err.message}`);
        }
      }
    } catch (err) {
      results.errors.push(`Categoria ${catDef.category}: ${err.message}`);
    }
  }

  return results;
}

// ── DEFINIZIONE COMANDO ───────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('⚙️ Crea canali, categorie e ruoli per SIXsPlugins (usa una volta sola!)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ Devi avere il permesso **Gestisci server** per usare questo comando.',
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: '⚙️ Setup avviato! Creazione canali e ruoli in corso… (attendi ~15 secondi)',
      ephemeral: true,
    });

    try {
      const results = await runSetup(interaction.guild);

      const embed = new EmbedBuilder()
        .setTitle('✅ Setup completato!')
        .setColor(0x57F287)
        .addFields(
          { name: '🎭 Ruoli creati',  value: `${results.rolesCreated}`,    inline: true },
          { name: '📁 Canali creati', value: `${results.channelsCreated}`, inline: true },
          { name: '↩️ Già esistenti', value: `${results.skipped}`,          inline: true },
        )
        .setDescription(
          results.errors.length > 0
            ? `⚠️ Alcuni elementi hanno dato errore:\n\`\`\`\n${results.errors.slice(0, 5).join('\n')}\n\`\`\``
            : '✨ Tutto creato senza errori!'
        )
        .addFields({
          name:  '📋 Prossimi passi',
          value:
            '1. Assegnati il ruolo **👑 Owner**\n' +
            '2. Usa `/ticket panel` in **#apri-ticket** per attivare i ticket\n' +
            '3. Scrivi il messaggio di benvenuto in **#benvenuto**\n' +
            '4. Aggiorna `config.js` con i nuovi ID canale (annunci, suggerimenti, ecc.)',
        })
        .setFooter({ text: 'SIXsBot • Setup automatico' })
        .setTimestamp();

      await interaction.editReply({ content: '', embeds: [embed] });
    } catch (err) {
      await interaction.editReply({
        content: `❌ Errore durante il setup: \`${err.message}\``,
      });
    }
  },
};
