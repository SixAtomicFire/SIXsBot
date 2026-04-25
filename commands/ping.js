const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Check bot latency'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws        = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(roundtrip < 150 ? 0x57F287 : roundtrip < 400 ? 0xFAC775 : 0xED4245)
      .addFields(
        { name: '↩️ Roundtrip', value: `${roundtrip}ms`, inline: true },
        { name: '💓 WebSocket', value: `${ws}ms`,         inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
