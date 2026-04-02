const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.user.setPresence({
      activities: [{ name: '🔧 Plugin Minecraft | /help', type: ActivityType.Watching }],
      status: 'online',
    });
    console.log(`✅ Presenza impostata.`);
  },
};
