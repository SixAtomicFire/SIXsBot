const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { faq } = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('faq')
    .setDescription('Mostra le domande frequenti sui plugin')
    .addStringOption(opt =>
      opt.setName('domanda')
        .setDescription('Seleziona una domanda specifica')
        .addChoices(...faq.map(f => ({ name: f.question.substring(0, 100), value: f.id })))
        .setRequired(false)
    ),

  async execute(interaction) {
    const id = interaction.options.getString('domanda');

    if (id) {
      // Risposta singola
      const item = faq.find(f => f.id === id);
      if (!item) return interaction.reply({ content: '❌ FAQ non trovata.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`❓ ${item.question}`)
        .setDescription(item.answer)
        .setColor(0x5865f2)
        .setFooter({ text: 'Hai altre domande? Apri un ticket!' });

      return interaction.reply({ embeds: [embed] });
    }

    // Mostra tutte le FAQ
    const embed = new EmbedBuilder()
      .setTitle('📖 Domande Frequenti (FAQ)')
      .setDescription('Ecco le risposte alle domande più comuni. Usa `/faq domanda` per una risposta specifica.')
      .setColor(0x5865f2);

    faq.forEach((item, i) => {
      embed.addFields({ name: `${i + 1}. ${item.question}`, value: item.answer });
    });

    embed.setFooter({ text: 'Non hai trovato risposta? Apri un ticket!' });
    await interaction.reply({ embeds: [embed] });
  },
};
