const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const channel = member.guild.channels.cache.get(config.channels.welcome);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(config.welcome.title)
      .setDescription(
        `Ciao ${member}! Benvenuto nel server ufficiale di supporto per i nostri plugin Minecraft.\n\n` +
        `**Cosa puoi fare qui:**\n` +
        `• 🔌 Usa \`/plugins\` per vedere tutti i plugin disponibili\n` +
        `• ❓ Usa \`/faq\` per le domande frequenti\n` +
        `• 🎫 Apri un ticket se hai bisogno di supporto\n` +
        `• 💡 Usa \`/suggerimento\` per proporre miglioramenti\n\n` +
        `Buona permanenza!`
      )
      .setColor(config.welcome.color)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Sei il membro #${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  },
};
