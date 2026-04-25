require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const http = require('http');

const { startModrinthChecker } = require('./utils/modrinthChecker');
const { startStatCounters }    = require('./utils/statCounters');
const { startAutoClose }       = require('./utils/autoClose');

// ── Client ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();

// ── Carica comandi ────────────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Command loaded: /${command.data.name}`);
  }
}

// ── Carica eventi ─────────────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  console.log(`✅ Event loaded: ${event.name}`);
}

// ── Ready ─────────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`\n🤖 Bot online as ${client.user.tag}`);
  startModrinthChecker(client);
  startStatCounters(client);
  startAutoClose(client);
});

// ── Keepalive Railway ─────────────────────────────────────────────────────────
http.createServer((req, res) => res.end('OK')).listen(process.env.PORT || 3000);

client.login(process.env.BOT_TOKEN);
