const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

async function handleSuggestionModal(interaction, client) {
  const plugin = interaction.fields.getTextInputValue('suggestion_plugin') || null;
  const title  = interaction.fields.getTextInputValue('suggestion_title');
  const desc   = interaction.fields.getTextInputValue('suggestion_description');

  const channel = client.channels.cache.get(config.channels.suggestions);
  if (!channel) {
    return interaction.reply({
      content: '❌ Il canale suggerimenti non è configurato. Contatta un amministratore.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(`💡 ${title}`)
    .setDescription(desc)
    .setColor(0xf1c40f)
    .setAuthor({
      name: interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp()
    .setFooter({ text: 'Vota questo suggerimento con le reazioni!' });

  if (plugin) {
    embed.addFields({ name: '🔌 Plugin di riferimento', value: plugin, inline: true });
  }

  const msg = await channel.send({ embeds: [embed] });

  // Aggiungi reactions di voto
  await msg.react('✅');
  await msg.react('❌');

  await interaction.reply({
    content: `✅ Il tuo suggerimento è stato inviato in ${channel}! Grazie per il contributo 🎉`,
    ephemeral: true,
  });
}

module.exports = { handleSuggestionModal };
