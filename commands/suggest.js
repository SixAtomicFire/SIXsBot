const { SlashCommandBuilder } = require('discord.js');
const { openSuggestionModal } = require('../utils/suggestionManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('💡 Submit a suggestion for a plugin or the server'),

  async execute(interaction) {
    await openSuggestionModal(interaction);
  },
};
