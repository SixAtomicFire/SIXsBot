const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendTicketPanel } = require('../utils/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gestisci il sistema ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('panel')
        .setDescription('Invia il pannello di apertura ticket in questo canale')
    )
    .addSubcommand(sub =>
      sub.setName('chiudi')
        .setDescription('Chiudi il ticket corrente')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      await sendTicketPanel(interaction.channel);
      await interaction.reply({ content: '✅ Pannello ticket inviato!', ephemeral: true });
    }

    if (sub === 'chiudi') {
      const channel = interaction.channel;
      if (!channel.name.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ Questo comando può essere usato solo in un canale ticket.', ephemeral: true });
      }
      await interaction.reply({ content: '🔒 Ticket in chiusura tra 5 secondi...' });
      setTimeout(() => channel.delete().catch(console.error), 5000);
    }
  },
};
