const { SlashCommandBuilder } = require('discord.js');
const { openFaqModal } = require('../utils/faqManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('❓ Submit a question for the FAQ — staff will review and publish it'),

  async execute(interaction) {
    await openFaqModal(interaction);
  },
};
