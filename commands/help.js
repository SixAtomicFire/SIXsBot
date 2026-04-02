const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra tutti i comandi disponibili'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📋 Comandi disponibili')
      .setDescription('Ecco tutti i comandi del bot per il supporto plugin Minecraft.')
      .setColor(0x5865f2)
      .addFields(
        {
          name: '🔌 Plugin',
          value: [
            '`/plugins` — Lista completa dei plugin con statistiche',
            '`/plugin <nome>` — Dettagli, versione e link di un plugin specifico',
            '`/changelog <plugin>` — Ultimi changelog di un plugin',
            '`/stats` — Statistiche globali di tutti i plugin',
          ].join('\n'),
        },
        {
          name: '🎫 Supporto',
          value: [
            '`/ticket panel` — *(Staff)* Invia il pannello di apertura ticket',
            '`/ticket chiudi` — *(Staff)* Chiudi il ticket corrente',
          ].join('\n'),
        },
        {
          name: '📖 FAQ & Community',
          value: [
            '`/faq` — Mostra tutte le domande frequenti',
            '`/faq domanda <scelta>` — Risposta a una domanda specifica',
            '`/suggerimento` — Invia un suggerimento per un plugin',
          ].join('\n'),
        },
        {
          name: '🛠️ Utilità',
          value: [
            '`/ping` — Controlla che il bot sia online',
            '`/help` — Mostra questo messaggio',
          ].join('\n'),
        },
        {
          name: '❓ Hai bisogno di aiuto?',
          value: 'Se non trovi risposta nella FAQ, apri un ticket nel canale dedicato!',
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Bot sviluppato per il supporto plugin Minecraft' });

    await interaction.reply({ embeds: [embed] });
  },
};
