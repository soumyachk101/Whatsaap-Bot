<p align="center">
  <img src="public/downloadbuddy.jpg" width="100" height="100" style="border-radius:20px" alt="DownloadBuddy" />
</p>

<h1 align="center">DownloadBuddy — WhatsApp Bot</h1>

<p align="center">
  A feature-rich, self-hosted WhatsApp bot with an enterprise-grade React admin dashboard.<br/>
  Built on <a href="https://github.com/WhiskeySockets/Baileys">Baileys</a> multi-device API &amp; SQLite — zero external database required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/React-Dashboard-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Railway-Deploy-0B0D0E?logo=railway&logoColor=white" alt="Railway" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## ✨ Highlights

- 🗄️ **SQLite** — everything stored locally in `database.db`, no MongoDB needed
- 📱 **Pairing Code Auth** — connect via phone number, no QR scanning required
- 🎛️ **React Admin Dashboard** — manage groups, members, commands, analytics, and bot health
- 🔊 **Text-to-Speech** — Sarvam AI + Google TTS with proper OGG/Opus encoding
- 🤖 **AI Chatbot** — Groq / Gemini powered conversational AI
- 🎵 **Media** — YouTube downloads, songs, Instagram reels, stickers, memes
- 🛡️ **Moderation** — anti-link, NSFW filter, warnings, member tracking
- 📊 **Analytics** — per-group and per-member message statistics
- 🔄 **Auto-reconnect** — handles session conflicts and disconnections gracefully

---

## 📋 Table of Contents

- [Commands](#-commands)
- [Quick Start](#-quick-start)
- [Dashboard](#-admin-dashboard)
- [Pairing Code Login](#-whatsapp-login-via-pairing-code)
- [Enabling the Bot in Groups](#-enabling-bot-in-groups)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Architecture](#-architecture)
- [Credits](#-credits)

---

## 🤖 Commands

### Public Commands

| Command | Description | Example |
|---------|-------------|---------|
| `-help` | Show all available commands | `-help` |
| `-alive` | Check if bot is online | `-alive` |
| `-say` / `-tts` | Text-to-speech (English & Hindi) | `-say hello` / `-say hin namaste` |
| `-sticker` | Create sticker from image/video/GIF | `-sticker pack MyPack author Me` |
| `-steal` | Re-upload sticker with bot metadata | `-steal` |
| `-toimg` / `-image` | Convert sticker to image | `-toimg` |
| `-mp3` / `-tomp3` | Convert video to audio | `-mp3` |
| `-mp4` | Download video from URL | `-mp4 <url>` |
| `-song` | Download song by name | `-song shape of you` |
| `-yt` | Download YouTube video | `-yt <url>` |
| `-insta` | Download Instagram media | `-insta <url>` |
| `-img` | Google image search | `-img cute cat` |
| `-search` / `-google` | Google web search | `-search nodejs tutorial` |
| `-l` | Get song lyrics | `-l shape of you` |
| `-news` | Latest news (categories available) | `-news` / `-news sports` |
| `-joke` | Random joke | `-joke` / `-joke programming` |
| `-meme` | Random meme from Reddit | `-meme` |
| `-fact` | Random fun fact | `-fact` |
| `-quote` | Random inspirational quote | `-quote` |
| `-proq` | Programming quote | `-proq` |
| `-horo` | Daily horoscope | `-horo pisces` |
| `-advice` | Random life advice | `-advice` |
| `-weather` | Current weather | `-weather Mumbai` |
| `-translate` | Translate text | `-translate hi hello` |
| `-calc` | Calculator | `-calc 2+2*3` |
| `-ud` | Urban Dictionary lookup | `-ud yeet` |
| `-dic` | Dictionary definition | `-dic love` |
| `-gender` | Predict gender from name | `-gender Alex` |
| `-idp` | Instagram profile picture (HD) | `-idp username` |
| `-removebg` | Remove image background | `-removebg` (reply to image) |
| `-remind` | Set a reminder | `-remind 10m drink water` |
| `-reddit` | Get posts from subreddit | `-reddit memes` |
| `-epicgames` | Free Epic Games deals | `-epicgames` |
| `-stats` | Your message statistics | `-stats` |
| `-start` | Bot introduction | `-start` |
| `-dev` | Developer info | `-dev` |
| `-chatbot` / `-db` | AI chatbot (Groq/Gemini) | `-chatbot how are you` |
| `-groq` | Direct Groq AI query | `-groq explain quantum computing` |

### Group Admin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `-add` | Add member to group | `-add 919876543210` |
| `-ban` / `-remove` | Remove member from group | `-ban @user` |
| `-promote` | Promote to group admin | `-promote @user` |
| `-demote` | Demote from group admin | `-demote @user` |
| `-rename` | Change group name | `-rename New Name` |
| `-welcome` | Set welcome message | `-welcome` |
| `-tagall` | Tag all group members | `-tagall meeting at 5pm` |
| `-link` | Get group invite link | `-link` |
| `-warn` | Warn a member | `-warn @user` |
| `-unwarn` | Remove warning | `-unwarn @user` |
| `-count` | Show member message counts | `-count` |
| `-zerocount` | Reset all counts | `-zerocount` |
| `-antilink` | Toggle anti-link filter | `-antilink on` |
| `-nsfwfilter` | Toggle NSFW image filter | `-nsfwfilter on` |
| `-cmdblock` | Block specific commands | `-cmdblock song` |

### Owner Commands

| Command | Description | Example |
|---------|-------------|---------|
| `-block` / `-unblock` | Block/unblock a user | `-block @user` |
| `-broadcast` | Send message to all groups | `-broadcast hello everyone` |
| `-clearhistory` | Clear group chat history | `-clearhistory` |
| `-htag` | Hidden tag (invisible mention all) | `-htag important message` |
| `-jid` | Get chat JID | `-jid` |
| `-removebot` | Leave group | `-removebot` |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.x
- **pnpm** 9.x — `npm install -g pnpm`
- **ffmpeg** — bundled via `ffmpeg-static`, or install system-wide
- **Git**

### Setup

```bash
# 1. Clone
git clone https://github.com/soumyachk101/Whatsapp-OG-Bot.git
cd Whatsapp-OG-Bot

# 2. Install dependencies
pnpm install

# 3. Create .env file (see Environment Variables section)
cp .env.example .env
# Edit .env with your values

# 4. Build the admin dashboard
pnpm run build

# 5. Start the bot
pnpm start
```

The server starts on **http://localhost:8000**. Open it in your browser to scan a QR code or enter a pairing code.

---

## 🎛️ Admin Dashboard

The bot includes a full React admin dashboard at `/admin` with:

- **Dashboard** — uptime, group count, member count, quick stats
- **Bot Health** — memory usage, connection status, pairing code, restart controls
- **Groups** — toggle bot, chatbot, anti-link, NSFW filter per group
- **Members** — search, block/unblock, reset stats, view warnings
- **Analytics** — top groups, top members, message type breakdown
- **Commands** — enable/disable commands globally

### Running Dashboard in Dev Mode

```bash
# Terminal 1: Start the backend
pnpm start

# Terminal 2: Start Vite dev server
cd dashboard
npm install   # first time only
npm run dev
```

Dashboard available at **http://localhost:5173** with hot-reload.

---

## 📱 WhatsApp Login via Pairing Code

No QR scanning needed — connect with just your phone number:

1. **Start the bot** — `pnpm start`
2. **Open** `http://localhost:8000` in your browser
3. Click **Phone Number** tab
4. Enter your WhatsApp number with country code (e.g. `919876543210`)
5. Click **Get Code** — an 8-character code appears
6. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number**
7. Enter the pairing code — bot connects automatically

> **Note:** The pairing page only shows when the bot is not connected. If already connected, you'll see the connected status. To re-pair, use the admin dashboard to **Logout** first.

---

## ✅ Enabling Bot in Groups

After adding the bot to a group, enable it using any of these methods:

### Method 1: Admin Dashboard (recommended)

1. Open `http://localhost:8000/admin` and log in
2. Go to **Groups** page
3. Toggle the **Bot Active** switch for your group

### Method 2: Owner Command (in the group chat)

Send from the owner number (`MY_NUMBER`):
```
-group isBotOn:true
```

### Method 3: SQLite Database

Open `database.db` with any SQLite browser and set `isBotOn = true` for the group.

---

## 🚢 Deployment

### Railway (Recommended)

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repo
4. Set environment variables in Railway dashboard
5. Deploy — Railway auto-detects the `Dockerfile`

### Docker

```bash
# Build
docker build -t downloadbuddy .

# Run
docker run -d \
  --name downloadbuddy \
  -p 8000:8000 \
  --env-file .env \
  downloadbuddy
```

Or with Docker Compose:
```bash
docker-compose up -d
```

### Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/soumyachk101/Whatsapp-OG-Bot)

### Koyeb

1. Create an account at [koyeb.com](https://app.koyeb.com/auth/signup)
2. Create a new app → connect your GitHub fork
3. Set environment variables
4. Build command: `npm run build` / Run command: `npm start`

---

## ⚙️ Environment Variables

Create a `.env` file in the project root. See `.env.example` for a template.

### Required

| Variable | Description |
|----------|-------------|
| `PREFIX` | Command prefix (default: `-`) |
| `MY_NUMBER` | Owner WhatsApp number without `+` (e.g. `919876543210`) |
| `BOT_NUMBER` | Bot's WhatsApp number (can be same as `MY_NUMBER`) |
| `MODERATORS` | Comma-separated moderator numbers |
| `ADMIN_PASSWORD` | Password for the admin dashboard at `/admin` |

### Optional — APIs

| Variable | Description |
|----------|-------------|
| `SARVAM_API_KEY` | Sarvam AI key for premium Hindi/English TTS |
| `GROQ_API_KEY` | Groq API key for AI chatbot |
| `GOOGLE_API_KEY` | Google Gemini API key for AI features |
| `SEARCH_ENGINE_KEY` | Google Custom Search Engine ID for `-img` |
| `GENIUS_ACCESS_SECRET` | Genius API token for lyrics |
| `REMOVE_BG_KEY` | remove.bg API key |
| `TRUECALLER_ID` | Truecaller API ID |
| `TWITTER_BEARER_TOKEN` | Twitter/X API token |
| `INSTAGRAM_COOKIE` | Instagram session cookie for `-idp` |

### Optional — Config

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `NODE_ENV` | `production` | Environment |
| `SESSION_SECRET` | auto-generated | Session cookie secret |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot for logging |
| `TELEGRAM_CHAT_ID` | — | Telegram chat for logs |

### Optional — YouTube

| Variable | Default | Description |
|----------|---------|-------------|
| `YOUTUBE_DELAY_BETWEEN_REQUESTS` | `1000` | Delay between requests (ms) |
| `YOUTUBE_MAX_RETRIES` | `3` | Max retry attempts |
| `MAX_AUDIO_SIZE_MB` | `50` | Max audio file size |
| `MAX_VIDEO_SIZE_MB` | `50` | Max video file size |
| `DOWNLOAD_TIMEOUT_SECONDS` | `600` | Download timeout |

---

## 🏗️ Architecture

```
├── index.js              # Express server + WebSocket + bot startup
├── connection.js          # Socket lifecycle & reconnection logic
├── sqlite.js              # SQLite database initialization
├── database.db            # All data stored here (auth, groups, members)
├── commands/
│   ├── public/            # Commands anyone can use (26 commands)
│   ├── group/
│   │   ├── admins/        # Group admin commands (20 commands)
│   │   └── members/       # Group member commands (35 commands)
│   └── owner/             # Owner-only commands (10 commands)
├── functions/
│   ├── getSocket.js       # Baileys socket creation + auth
│   ├── getEvents.js       # Event router
│   ├── getMessagesEvent.js # Message handler + command dispatcher
│   ├── getGroupEvent.js   # Welcome/leave messages
│   ├── useSQLiteAuthState.js # WhatsApp auth persistence
│   ├── lidUtils.js        # LID/PN format utilities
│   └── ...
├── sqlite-DB/             # SQLite data access layer
├── routes/admin.js        # REST API for admin dashboard
├── dashboard/             # React + Vite admin UI (built to public/app/)
├── public/                # Static assets + landing page (EJS)
├── Dockerfile             # Production container
└── docker-compose.yml     # Docker Compose config
```

**Tech Stack:**
- **Runtime:** Node.js 22 (ESM)
- **WhatsApp:** Baileys v7 (multi-device)
- **Database:** SQLite via better-sqlite3
- **Server:** Express 4 + WebSocket
- **Dashboard:** React + Vite
- **Audio:** ffmpeg-static + fluent-ffmpeg
- **AI:** Groq SDK, Google Gemini, Sarvam AI

---

## 🙏 Credits

- [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web API
- [wa-sticker-formatter](https://github.com/AlenSaito1/wa-sticker-formatter) — Sticker creation
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — Audio/video processing

---

<p align="center">
  If you found this useful, consider giving it a ⭐ on GitHub!
</p>
