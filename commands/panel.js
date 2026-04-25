const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { sendVerifyPanel }  = require('../utils/verifyManager');
const { sendNotifPanel }   = require('../utils/notifManager');
const { sendTicketPanel }  = require('../utils/ticketManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('📌 Send an interactive panel to a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('verify')
        .setDescription('Send the verification panel in this channel')
    )
    .addSubcommand(sub =>
      sub.setName('notifications')
        .setDescription('Send the plugin notification selection panel in this channel')
    )
    .addSubcommand(sub =>
      sub.setName('ticket')
        .setDescription('Send the ticket opening panel in this channel')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    try {
      if (sub === 'verify')        await sendVerifyPanel(interaction.channel);
      if (sub === 'notifications') await sendNotifPanel(interaction.channel);
      if (sub === 'ticket')        await sendTicketPanel(interaction.channel);
      await interaction.editReply({ content: `✅ Panel sent in ${interaction.channel}!` });
    } catch (e) {
      await interaction.editReply({ content: `❌ Error: ${e.message}` });
    }
  },
};
