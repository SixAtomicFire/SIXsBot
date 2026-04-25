// ============================================================
//  config.js — SIXsBot v2
//  Compila tutti i campi dopo aver eseguito /setup-server
// ============================================================

module.exports = {

  // ── MODRINTH ──────────────────────────────────────────────
  modrinthAuthorId: 'SixAtomicFire',
  modrinthCheckInterval: 10, // minuti

  plugins: [
    {
      id:       'SIXsVCMute',
      slug:     'sixsvcmute',        // slug Modrinth (nell'URL)
      modrinthId: 'feSai1Ty',        // ID progetto Modrinth
      roleName: '🔔 SIXsVCMute',
      color:    0xAA8ED6,
      emoji:    '🔊',
      channels: {
        info:      null,  // ID canale #vcmute-info
        updates:   null,  // ID canale #vcmute-updates
        changelog: null,  // ID canale #vcmute-changelog
        faq:       null,  // ID canale #vcmute-faq
      },
    },
    {
      id:       'SIXsCanBreak',
      slug:     'sixscanbreak',
      modrinthId: 'OKUKiCaj',
      roleName: '🔔 SIXsCanBreak',
      color:    0x1ABFA0,
      emoji:    '⛏️',
      channels: {
        info:      null,
        updates:   null,
        changelog: null,
        faq:       null,
      },
    },
  ],

  // ── CANALI GENERALI ───────────────────────────────────────
  channels: {
    announcements:   null,  // #announcements
    roadmap:         null,  // #roadmap
    suggestions:     null,  // #suggestions
    ticketPanel:     null,  // #open-ticket
    ticketLogs:      null,  // #ticket-logs
    modLogs:         null,  // #mod-logs
    milestones:      null,  // #milestones (staff)
    faqPending:      null,  // canale interno staff per FAQ in attesa di approvazione
  },

  // ── RUOLI ─────────────────────────────────────────────────
  roles: {
    sixs:        null,  // ⚡ SIXs
    developer:   null,  // ⚙️ Developer
    moderatore:  null,  // 🛡️ Moderatore
    helper:      null,  // 🤝 Helper
    premium:     null,  // 💎 Premium
    verificato:  null,  // ✅ Verificato
    membro:      null,  // 👤 Membro
  },

  // ── TICKET ────────────────────────────────────────────────
  ticket: {
    categoryId:       null,   // ID categoria dove vengono creati i canali ticket
    autoCloseDays:    3,      // giorni di inattività prima dell'auto-close
    transcriptPath:   './data/transcripts/', // cartella locale transcript
  },

  // ── STAT COUNTERS ─────────────────────────────────────────
  // Popolato automaticamente da /statcounter add — non modificare manualmente
  statCounters: [],

  // ── MILESTONE DOWNLOAD ────────────────────────────────────
  milestones: [100, 500, 1000, 5000, 10000],

};
