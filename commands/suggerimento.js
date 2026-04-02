const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggerimento')
    .setDescription('Invia un suggerimento per migliorare un plugin'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('suggestion_modal')
      .setTitle('💡 Invia un suggerimento');

    const pluginInput = new TextInputBuilder()
      .setCustomId('suggestion_plugin')
      .setLabel('Plugin di riferimento (opzionale)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Es. MyPlugin, oppure lascia vuoto per un suggerimento generale')
      .setRequired(false)
      .setMaxLength(50);

    const titleInput = new TextInputBuilder()
      .setCustomId('suggestion_title')
      .setLabel('Titolo del suggerimento')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Breve descrizione della tua idea')
      .setRequired(true)
      .setMaxLength(100);

    const descInput = new TextInputBuilder()
      .setCustomId('suggestion_description')
      .setLabel('Descrizione dettagliata')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Spiega nel dettaglio la tua idea, come funzionerebbe e perché sarebbe utile...')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(pluginInput),
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
    );

    await interaction.showModal(modal);
  },
};
