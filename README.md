# 🤖 SIXsBot v2

Official Discord bot for the SIXsPlugins support server.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎫 Ticket system | Per-plugin tickets with version, context, priority and auto-transcript |
| 💡 Suggestions | Vote → approve/reject/discuss → auto-pin to roadmap |
| ❓ FAQ system | Community submits questions → staff reviews → published in FAQ channel |
| 📢 Update announcer | Modrinth auto-check with role ping and discussion thread |
| 🔔 Notification roles | Users choose which plugins to follow |
| 📊 Stat counters | Live voice channels showing downloads, members, version... |
| ✅ Verification | Button-based rules acceptance |
| ⏰ Auto-close tickets | Inactive tickets warned and closed automatically |
| 📌 Plugin status | Set Alpha/Beta/Release/Maintenance/Deprecated per plugin |
| 🐛 Bug wizard | Guided multi-step bug report form |

---

## 🚀 Setup

### 1. Environment variables

Create a `.env` file (or set in Railway):

```
BOT_TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
```

### 2. Install dependencies

```bash
npm install
```

### 3. Register slash commands + start

```bash
node deploy-commands.js && node index.js
```

On Railway, set the start command to:
```
node deploy-commands.js && node index.js
```

### 4. Run server setup

In your Discord server, use:
```
/setup-server
```

This creates all channels, roles and permissions automatically and updates `config.js` with the channel IDs.

> ⚠️ Restart the bot after `/setup-server` so it picks up the new channel IDs.

### 5. Send panels

```
/panel verify        → in #verify
/panel notifications → in #choose-notifications
/panel ticket        → in #open-ticket
```

### 6. Update plugin info

```
/plugin-status plugin:SIXsVCMute status:stable version:1.2.0 description:...
/plugin-status plugin:SIXsCanBreak status:beta version:0.3.1 description:...
```

### 7. Add stat counters (optional)

```
/statcounter add stat:downloads:SIXsVCMute format:⬇️ VCMute: {value} visibility:public
/statcounter add stat:members format:👥 Members: {value} visibility:private
```

---

## 📁 Project Structure

```
├── commands/
│   ├── setup-server.js    Full server setup
│   ├── panel.js           Send verify/notif/ticket panels
│   ├── plugin-status.js   Update plugin info and status
│   ├── statcounter.js     Manage live stat channels
│   ├── stats.js           Live Modrinth statistics
│   ├── suggest.js         Submit a suggestion
│   ├── faq.js             Submit a FAQ question
│   ├── bug.js             Guided bug report
│   ├── help.js            Interactive help menu
│   └── ping.js            Latency check
├── events/
│   ├── clientReady.js     Presence setup
│   ├── guildMemberAdd.js  Welcome DM + role assign
│   └── interactionCreate.js Central interaction router
├── utils/
│   ├── verifyManager.js   Verification system
│   ├── notifManager.js    Plugin notification roles
│   ├── ticketManager.js   Full ticket lifecycle
│   ├── suggestionManager.js Suggestion workflow
│   ├── faqManager.js      FAQ submission and approval
│   ├── modrinthChecker.js Auto update announcer
│   ├── autoClose.js       Inactive ticket auto-close
│   └── statCounters.js    Live stat voice channels
├── data/                  Runtime JSON data (auto-created)
├── config.js              ⚠️ Configure this after /setup-server
├── index.js               Entry point
├── deploy-commands.js     Slash command registration
└── .env                   Bot token and IDs
```

---

## 📋 Command Reference

### Everyone
| Command | Description |
|---|---|
| `/help` | Interactive help menu |
| `/ping` | Check bot latency |
| `/stats [plugin]` | Live plugin stats from Modrinth |
| `/suggest` | Submit a suggestion |
| `/faq` | Submit a FAQ question |
| `/bug` | Guided bug report wizard |

### Staff only
| Command | Description |
|---|---|
| `/setup-server` | Full server setup |
| `/panel verify\|notifications\|ticket` | Send interactive panels |
| `/plugin-status` | Update plugin status in info channel |
| `/statcounter add\|remove\|list` | Manage live stat channels |

---

## ⚙️ config.js

After running `/setup-server`, the bot auto-fills channel IDs. You still need to:

1. Set `modrinthAuthorId` to your Modrinth username
2. Set `plugins[].modrinthId` with the correct Modrinth project IDs
3. Set `plugins[].slug` with the correct Modrinth slugs
4. Restart the bot

---

## 🔔 Bot Permissions Required

- Administrator (or individually: Manage Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Manage Messages)

---

## 🛠️ Built With

- [discord.js v14](https://discord.js.org)
- [Modrinth API v2](https://docs.modrinth.com)
