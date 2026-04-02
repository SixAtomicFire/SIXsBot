const { Events, EmbedBuilder } = require('discord.js');
const { handleTicketButton } = require('../utils/ticketManager');
const { handleSuggestionModal } = require('../utils/suggestionManager');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // ── Slash Commands ──────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`❌ Errore nel comando /${interaction.commandName}:`, error);
        const msg = { content: '❌ Si è verificato un errore durante l\'esecuzione del comando.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg);
        } else {
          await interaction.reply(msg);
        }
      }
    }

    // ── Modal Submit ────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'suggestion_modal') {
        await handleSuggestionModal(interaction, client);
      }
    }

    // ── Button Interactions ─────────────────────────────────────────
    if (interaction.isButton()) {
      await handleTicketButton(interaction, client);
    }

    // ── Select Menu (categoria ticket) ─────────────────────────────
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category') {
        const { openTicket } = require('../utils/ticketManager');
        await openTicket(interaction, client);
      }
    }
  },
};
