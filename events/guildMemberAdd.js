const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // DM di benvenuto
    const dmEmbed = new EmbedBuilder()
      .setTitle('👋 Welcome to SIXsPlugins!')
      .setDescription(
        `Hey **${member.user.username}**, welcome to the official SIXsPlugins Discord!\n\n` +
        `Here you'll find support, updates and the community around our Minecraft plugins.\n\n` +
        `**Getting started:**\n` +
        `→ Read the rules in <#${config.channels.rules ?? 'rules'}>\n` +
        `→ Verify yourself to get full access\n` +
        `→ Choose which plugins you want notifications for\n\n` +
        `Feel free to ask anything — we're happy to help! 🎮`
      )
      .setColor(0x5865F2)
      .setThumbnail(member.guild.iconURL())
      .setFooter({ text: 'SIXsPlugins • Minecraft Plugin Development' });

    await member.send({ embeds: [dmEmbed] }).catch(() => null);

    // Assegna ruolo Membro automaticamente
    const membroRole = member.guild.roles.cache.find(r => r.name === '👤 Member');
    if (membroRole) await member.roles.add(membroRole).catch(() => null);

    // Messaggio nel canale welcome
    const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'welcome');
    if (!welcomeChannel) return;

    const welcomeEmbed = new EmbedBuilder()
      .setDescription(
        `🎉 **${member}** just joined the server!\n` +
        `Head to <#${config.channels.verify ?? 'verify'}> to get started.`
      )
      .setColor(0x57F287)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await welcomeChannel.send({ embeds: [welcomeEmbed] });
  },
};
