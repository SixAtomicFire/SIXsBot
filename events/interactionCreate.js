const { Events, InteractionType } = require('discord.js');
const { handleTicketButton, handleTicketPluginSelect, handleTicketModal, handleTicketClose, handlePrioritySelect } = require('../utils/ticketManager');
const { handleVerifyButton }      = require('../utils/verifyManager');
const { handleNotifSelect }       = require('../utils/notifManager');
const { handleSuggestionAction }  = require('../utils/suggestionManager');
const { handleFaqSubmit, handleFaqAction } = require('../utils/faqManager');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {

    // ── Slash commands ──────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`❌ Error in /${interaction.commandName}:`, err);
        const msg = { content: '❌ An error occurred while executing this command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => null);
        } else {
          await interaction.reply(msg).catch(() => null);
        }
      }
      return;
    }

    // ── Buttons ─────────────────────────────────────────────
    if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId === 'verify_accept')              return handleVerifyButton(interaction);
      if (customId.startsWith('ticket_open'))        return handleTicketButton(interaction);
      if (customId.startsWith('ticket_close'))       return handleTicketClose(interaction);
      if (customId.startsWith('suggestion_approve')) return handleSuggestionAction(interaction, 'approve');
      if (customId.startsWith('suggestion_reject'))  return handleSuggestionAction(interaction, 'reject');
      if (customId.startsWith('suggestion_discuss')) return handleSuggestionAction(interaction, 'discuss');
      if (customId.startsWith('faq_approve'))        return handleFaqAction(interaction, 'approve');
      if (customId.startsWith('faq_reject'))         return handleFaqAction(interaction, 'reject');
      return;
    }

    // ── Select menus ────────────────────────────────────────
    if (interaction.isStringSelectMenu()) {
      const { customId } = interaction;
      if (customId === 'select_notifications')     return handleNotifSelect(interaction);
      if (customId === 'ticket_open_plugin')      return handleTicketPluginSelect(interaction);
      if (customId.startsWith('ticket_priority')) return handlePrioritySelect(interaction);
      return;
    }

    // ── Modals ──────────────────────────────────────────────
    if (interaction.type === InteractionType.ModalSubmit) {
      const { customId } = interaction;
      if (customId.startsWith('ticket_modal'))  return handleTicketModal(interaction);
      if (customId === 'faq_submit')            return handleFaqSubmit(interaction);
      if (customId === 'suggestion_modal')      return require('../utils/suggestionManager').handleSuggestionModal(interaction);
      return;
    }

  },
};
