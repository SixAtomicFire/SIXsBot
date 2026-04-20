module.exports = {
  // ─── IL TUO PROFILO MODRINTH ───────────────────────────────────────────────
  modrinthAuthorId: 'SixAtomicFire',

  // ─── CANALI DISCORD ────────────────────────────────────────────────────────
  channels: {
    announcements:    null,
    ticketsCategory:  null,
    ticketsPanel:     null,
    ticketsLog:       null,
    suggestions:      null,
    welcome:          null,
  },

  // ─── RUOLI ─────────────────────────────────────────────────────────────────
  roles: {
    support: null,
  },

  // ─── INTERVALLO CONTROLLO MODRINTH (in minuti) ─────────────────────────────
  modrinthCheckInterval: 10,

  // ─── MESSAGGIO DI BENVENUTO ────────────────────────────────────────────────
  welcome: {
    title: '👋 Benvenuto nel server!',
    color: 0x5865f2,
  },

  // ─── FAQ ───────────────────────────────────────────────────────────────────
  faq: [
    {
      id: 'compatibilita',
      question: 'Con quali versioni di Minecraft sono compatibili i plugin?',
      answer: 'I plugin supportano Spigot/Paper 1.20.x e versioni successive. Controlla la pagina Modrinth del plugin specifico per i dettagli.',
    },
    {
      id: 'installazione',
      question: 'Come si installa un plugin?',
      answer: 'Scarica il file `.jar` dalla pagina Modrinth, mettilo nella cartella `/plugins` del tuo server e riavvia. Non sono necessarie dipendenze extra salvo diversa indicazione.',
    },
    {
      id: 'configurazione',
      question: 'Come si configura il plugin?',
      answer: 'Avvia il server con il plugin installato: verrà generata automaticamente la cartella di configurazione in `/plugins/NomePlugin/`. Modifica i file `.yml` secondo le tue esigenze e usa `/nomeplugin reload` per ricaricare senza riavvio.',
    },
    {
      id: 'errori',
      question: 'Il plugin non funziona o dà errori. Cosa faccio?',
      answer: 'Controlla il file `latest.log` nella cartella del server e cerca righe con `ERROR`. Apri un ticket con il log completo e la versione del tuo server.',
    },
    {
      id: 'aggiornamenti',
      question: 'Come ricevo notifiche sugli aggiornamenti?',
      answer: 'Gli aggiornamenti vengono annunciati automaticamente in questo server Discord non appena vengono pubblicati su Modrinth. Puoi anche seguire i progetti su Modrinth.',
    },
    {
      id: 'suggerimenti',
      question: 'Come posso suggerire una funzionalità?',
      answer: 'Usa il comando `/suggerimento` per inviare la tua idea nel canale dedicato, dove la community può votarla.',
    },
  ],
};
