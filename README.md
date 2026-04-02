# 🤖 Minecraft Plugin Discord Bot

Bot Discord per supporto e aggiornamenti automatici dei tuoi plugin Minecraft pubblicati su Modrinth.

## ✨ Funzionalità

- 🔔 **Notifiche automatiche** quando pubblichi una nuova versione su Modrinth
- 🎫 **Sistema ticket** con categorie, priorità e transcript automatico alla chiusura
- 💡 **Suggerimenti** con sistema di voto tramite reactions
- 📋 **Changelog** delle ultime versioni di ogni plugin
- 📊 **Statistiche** globali con grafico download
- ❓ **FAQ** configurabile
- 👋 **Messaggio di benvenuto** automatico per i nuovi membri

## 📁 Struttura

```
├── commands/          # Comandi slash
│   ├── changelog.js
│   ├── faq.js
│   ├── help.js
│   ├── ping.js
│   ├── plugin.js
│   ├── plugins.js
│   ├── stats.js
│   ├── suggerimento.js
│   └── ticket.js
├── events/            # Eventi Discord
│   ├── guildMemberAdd.js
│   ├── interactionCreate.js
│   └── ready.js
├── utils/             # Utility condivise
│   ├── modrinthChecker.js
│   ├── suggestionManager.js
│   └── ticketManager.js
├── data/              # Cache runtime (non committare)
├── config.js          # ⚠️ Configura questo file!
├── deploy-commands.js # Registra i comandi slash
└── index.js           # Entry point
```

## ⚙️ Configurazione

### 1. Variabili d'ambiente

Copia `.env.example` in `.env` e compila:

```env
BOT_TOKEN=il_tuo_token
CLIENT_ID=id_applicazione
GUILD_ID=id_server
```

### 2. config.js

Apri `config.js` e compila tutti gli ID:

- `modrinthAuthorId` — il tuo username su Modrinth
- `channels.*` — ID dei canali Discord
- `roles.support` — ID del ruolo staff

### 3. Canali da creare nel server Discord

| Canale | Descrizione |
|--------|-------------|
| `#annunci-aggiornamenti` | Notifiche automatiche Modrinth |
| `#suggerimenti` | Suggerimenti votabili dalla community |
| `#benvenuto` | Messaggio di benvenuto nuovi membri |
| `#log-ticket` | Log apertura/chiusura ticket + transcript |
| Categoria ticket | Categoria dove vengono creati i canali ticket |
| Canale ticket panel | Canale con il pulsante per aprire ticket |

## 🚀 Deploy

### Avvio locale

```bash
npm install
node deploy-commands.js   # Registra i comandi (una volta sola)
npm start
```

### Deploy su Railway

1. Pusha il progetto su GitHub
2. Vai su [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Aggiungi le variabili d'ambiente (`BOT_TOKEN`, `CLIENT_ID`, `GUILD_ID`)
4. Railway avvia automaticamente `npm start`

## 📋 Comandi

| Comando | Descrizione |
|---------|-------------|
| `/plugins` | Lista tutti i plugin con statistiche |
| `/plugin <nome>` | Dettagli di un plugin specifico |
| `/changelog <plugin>` | Ultimi changelog di un plugin |
| `/stats` | Statistiche globali download/follower |
| `/faq` | Domande frequenti |
| `/suggerimento` | Invia un suggerimento |
| `/ticket panel` | *(Staff)* Invia il pannello ticket |
| `/ticket chiudi` | *(Staff)* Chiudi il ticket corrente |
| `/ping` | Controlla latenza bot |
| `/help` | Lista comandi |
