const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Controlla che il bot sia online e mostra la latenza'),

  async execute(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const status = latency < 200 ? '🟢' : latency < 500 ? '🟡' : '🔴';

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .setColor(latency < 200 ? 0x2ecc71 : latency < 500 ? 0xf1c40f : 0xe74c3c)
      .addFields(
        { name: `${status} Latenza bot`, value: `${latency}ms`, inline: true },
        { name: '📡 Latenza WebSocket', value: `${wsLatency}ms`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
