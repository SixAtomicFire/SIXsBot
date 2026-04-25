const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.user.setPresence({
      activities: [{ name: '⚙️ SIXsPlugins | /help', type: ActivityType.Watching }],
      status: 'online',
    });
    console.log('✅ Presence set.');
  },
};
