# DownloadBuddy — WhatsApp Bot 🤖

> A self-hosted, multi-device WhatsApp bot with a **React admin dashboard**,
> **220+ commands**, **AI chat**, **YouTube/Facebook/Instagram downloaders**,
> **group moderation**, **productivity tools**, **fun games** and **persistent analytics** — all in a single
> Node.js process backed by SQLite.

![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Embedded-003B57?logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/React-Dashboard-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

<p align="center">
  <img src="public/downloadbuddy.jpg" width="110" style="border-radius:20px" alt="DownloadBuddy logo" />
</p>

---

## 📑 Table of contents

1. [What is this?](#-what-is-this)
2. [How it works (the 30-second tour)](#-how-it-works-the-30-second-tour)
3. [Feature list](#-feature-list)
4. [All commands](#-all-commands)
5. [Quick start (5 minutes)](#-quick-start-5-minutes)
6. [First-time pairing](#-first-time-pairing)
7. [Enabling the bot in a group](#-enabling-the-bot-in-a-group)
8. [Admin dashboard tour](#-admin-dashboard-tour)
9. [Adding a new command](#-adding-a-new-command-advanced)
10. [Deployment](#-deployment)
11. [Environment variables](#-environment-variables)
12. [Architecture & file map](#-architecture--file-map)
13. [Troubleshooting](#-troubleshooting)
14. [Credits & license](#-credits--license)

---

## 🤔 What is this?

**DownloadBuddy** is a WhatsApp bot you run on **your own machine or VPS**.
Once you link your phone number, the bot:

- 📥 Downloads videos / songs from **YouTube, Facebook, Instagram, Twitter/X, Pinterest, Reddit**
- 🤖 Chats with users using **Groq / Gemini / OpenAI** (you pick the provider)
- 🛡️ Moderates groups — anti-link, NSFW image filter, warnings, kick/ban
- 📊 Tracks per-member and per-group **message statistics**, XP & levels
- 🎛️ Exposes a **React admin dashboard** at `/admin` for live control

Everything is stored in a single file — `database.db` — so there is **no
external database to set up**.

### Who is this for?

| You are… | DownloadBuddy helps you… |
|----------|--------------------------|
| A group admin | Run a fun, well-behaved community bot |
| A developer | Fork it and add custom commands in minutes |
| A self-hoster | Deploy on Railway / Docker / Heroku with one click |
| A beginner | Follow the 5-minute quick-start below 👇 |

---

## ⚡ How it works (the 30-second tour)

<p align="center">
  <img src="assets/diagrams/architecture.svg" alt="High-level architecture diagram" width="100%"/>
</p>

**In one sentence:** your phone talks to WhatsApp’s servers → Baileys (a Node.js
library) receives the messages → your command handlers run → a reply is sent
back through the same pipe.

### What happens when a user sends a command?

<p align="center">
  <img src="assets/diagrams/flow-message.svg" alt="Message lifecycle diagram" width="100%"/>
</p>

> The “Bot enabled in this group?” gate is important: **the bot ignores
> messages in groups unless an admin turns it on for that group.** See
> [Enabling the bot in a group](#-enabling-the-bot-in-a-group).

---

## 🌟 Feature list

- 📥 **Downloaders** — YouTube (`yt`, `ytv`, `vs`, `song`, `yta`), Facebook (`fb`),
  Instagram (`insta`), Twitter/X (`twitter`), Pinterest (`pin`), Reddit, TikTok via
  `yt-dlp` with graceful fallback to `@distube/ytdl-core`
- 🤖 **AI** — Groq (default, fast & free), Google Gemini, OpenAI, plus 10 “fun
  modes” (roast, rap, shayari, story, recipe, fortune, …)
- 🖼️ **Stickers & media** — `sticker`, `steal`, `meme`, `removebg`, animated
  text stickers (`attp`), image generation (`imagine`, `gen`, `dream`)
- 🛡️ **Moderation** — `antilink`, `nsfwfilter`, `warn` / `unwarn`, `kick` /
  `ban`, `tagall`, `welcome` message, hidden tag (`htag`)
- 📊 **Analytics** — per-member message counts, XP/levels, top groups,
  message-type breakdown
- 🗄️ **SQLite persistence** — auth, groups, members, warnings, blocked users
  in one file (`database.db`)
- 🎛️ **React admin dashboard** — stats, analytics, group/member management,
  bot health, send-via-API, QR/pairing-code control
- 🔄 **Auto-reconnect** with backoff and session recovery
- 🔒 **Pairing-code login** — no QR scan, no second device
- 🐳 **One-click deploys** — Railway, Docker, Heroku, Koyeb

---

## 🤖 All commands

> The default prefix is `-` (set in `.env` as `PREFIX=`). Run `-help` in any
> chat to get the live, in-app command list.

### Public commands (33) — anyone, anywhere

| Command | What it does | Example |
|---------|--------------|---------|
| `-help` | Full command list with categories | `-help` |
| `-start` | Welcome / intro message | `-start` |
| `-alive` | Bot uptime & ping | `-alive` |
| `-dev` | Developer & repo info | `-dev` |
| `-donate` | Support the dev | `-donate` |
| `-sticker` / `-s` | Image / video / GIF → sticker | reply to media with `-sticker` |
| `-steal` | Re-send a sticker with bot metadata | reply to sticker with `-steal` |
| `-toimg` / `-image` | Sticker → image | reply to sticker |
| `-attp` | Animated coloured text sticker | `-attp hello` |
| `-mp3` / `-tomp3` | Video/audio URL → MP3 | `-mp3 <url>` |
| `-mp4` | Any video URL → MP4 | `-mp4 <url>` |
| `-song` | Search & download a song | `-song shape of you` |
| `-yt` | YouTube URL → video | `-yt <url>` |
| `-fb` | Facebook video download | `-fb <url>` |
| `-insta` | Instagram media | `-insta <url>` |
| `-twitter` | Twitter/X video | `-twitter <url>` |
| `-pin` | Pinterest video/image | `-pin <url>` |
| `-reddit` | Posts from a subreddit | `-reddit memes` |
| `-img` | Google image search | `-img cute cats` |
| `-search` / `-google` | Google web search | `-search quantum computing` |
| `-news` | Latest news (optional category) | `-news sports` |
| `-joke` | Random joke (optional category) | `-joke programming` |
| `-meme` | Random meme | `-meme` |
| `-fact` | Random fun fact | `-fact` |
| `-quote` | Inspirational quote | `-quote` |
| `-proq` | Programming quote | `-proq` |
| `-advice` | Random life advice | `-advice` |
| `-weather` / `-w` | Current weather | `-weather Mumbai` |
| `-translate` | Translate text | `-translate hi hello` |
| `-calc` | Calculator | `-calc 2+2*3` |
| `-ud` | Urban Dictionary | `-ud yeet` |
| `-dic` | Dictionary definition | `-dic love` |
| `-gender` | Guess gender from name | `-gender Alex` |
| `-l` / `-lyrics` | Song lyrics | `-l shape of you` |
| `-idp` | Instagram profile picture (HD) | `-idp username` |
| `-removebg` | Remove image background | reply to image |
| `-remind` | Set a reminder | `-remind 10m drink water` |
| `-qr` | Generate QR code | `-qr https://example.com` |
| `-poll` | Create a poll | `-poll "Best lang?" py js go` |
| `-confess` | Anonymous confession | `-confess I love this group` |
| `-chatbot` / `-db` | AI chat (provider from config) | `-chatbot tell me a joke` |
| `-groq` | Direct Groq query | `-groq explain gravity` |
| `-gemini` | Direct Gemini query | `-gemini write a haiku` |
| `-imagine` / `-dream` | AI image generator | `-imagine cyberpunk city` |
| `-transcribe` | Voice note → text (Whisper) | reply to voice note |
| `-epicgames` | Free Epic Games deals | `-epicgames` |
| `-level` | Your XP, level, rank | `-level` |
| `-stats` | Your message stats | `-stats` |
| `-delete` / `-d` | Delete a bot message | reply to bot msg |

### Group admin commands (20) — admins in a group

| Command | What it does |
|---------|--------------|
| `-bot on/off` | Enable / disable bot in this group |
| `-antilink on/off` | Auto-delete links from non-admins |
| `-nsfwfilter on/off` | Auto-delete detected NSFW images |
| `-warn @user` | Add a warning |
| `-unwarn @user` | Remove a warning |
| `-getwarn` | List warnings in this group |
| `-tagall <text>` | Mention everyone |
| `-htag <text>` | Hidden mention everyone |
| `-add <number>` | Add member to group |
| `-ban` / `-remove` | Remove member |
| `-promote @user` | Promote to admin |
| `-demote @user` | Demote admin |
| `-rename <name>` | Change group subject |
| `-welcome <text>` | Set welcome message |
| `-link` | Get group invite link |
| `-grplink` | Same as `-link` |
| `-count` | Member message counts |
| `-zerocount` | Reset counts |
| `-cmdblock <cmd>` | Block a command in this group |
| `-chat on/off` | Toggle chatbot in this group |
| `-group <json>` | Set raw group config (owner) |

### Owner commands (10) — `MY_NUMBER` only

| Command | Description | Example |
|---------|-------------|---------|
| `-block` / `-unblock` | Block a user globally | `-block @user` |
| `-broadcast` | Send to all groups | `-broadcast hello everyone` |
| `-clearhistory` | Clear a group’s chat history | `-clearhistory` |
| `-htag` | Hidden tag with custom message | `-htag important message` |
| `-jid` | Get current chat JID | `-jid` |
| `-removebot` | Bot leaves the group | `-removebot` |
| `-ownerhelp` | Owner-only help | `-ownerhelp` |
| `-cmdtest` | Test a command in isolation | `-cmdtest hello` |
| `-dbcontrol` | Database maintenance | `-dbcontrol` |
| `-dbinfo` | Show bot info | `-dbinfo` |

> Tip: type `-help` in WhatsApp to get a **live, always-up-to-date** menu
> generated from the actual command files.

---

## 🚀 Quick start (5 minutes)

### Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 22.x** | Runs the bot | https://nodejs.org |
| **pnpm 9.x** | Faster package manager | `npm i -g pnpm` |
| **ffmpeg** | Audio/video processing | `brew install ffmpeg` / `apt install ffmpeg` / `choco install ffmpeg` |
| **yt-dlp** | YouTube / FB / IG downloads | `brew install yt-dlp` / `pipx install yt-dlp` / `winget install yt-dlp` |
| **Git** | Clone the repo | https://git-scm.com |

> YouTube/song/MP3/MP4/FB/IG commands **will fail** without `yt-dlp` on PATH.
> All other commands (AI, stickers, moderation, dashboard) work fine without it.

### Install & run

```bash
# 1. Get the code
git clone https://github.com/soumyachk101/Whatsapp-OG-Bot.git
cd Whatsapp-OG-Bot

# 2. Install Node dependencies
pnpm install

# 3. Configure your secrets
cp .env.example .env
# Open .env in any editor and set at minimum:
#   PREFIX=-
#   MY_NUMBER=919876543210          # your WhatsApp number, no +
#   BOT_NUMBER=919876543210         # can be the same
#   MODERATORS=919876543210         # comma-separated, no +
#   ADMIN_PASSWORD=choose-a-strong-one

# 4. Build the React admin dashboard (one-time)
pnpm run build

# 5. Start the bot
pnpm start
```

You should see something like:

```
Web-server running!
📦 Loading commands...
✅ Loaded 33 public commands
✅ Loaded 35 member commands
✅ Loaded 20 admin commands
✅ Loaded 10 owner commands
🎉 All commands loaded successfully!
🚀 Starting socket connection …
```

Now jump to **[First-time pairing](#-first-time-pairing)** to link your phone.

---

## 📱 First-time pairing

You have **two ways** to connect the bot. Pairing code is the easier option —
no QR scanner, no second phone.

<p align="center">
  <img src="assets/diagrams/flow-pairing.svg" alt="Pairing code flow" width="100%"/>
</p>

### Option A — Pairing code (recommended, 30 seconds)

1. With the bot running, open <http://localhost:8000> in any browser.
2. Click the **Phone Number** tab.
3. Type your WhatsApp number **with country code, no `+`** (e.g. `919876543210`).
4. Click **Get Code** — an 8-character code appears.
5. On your phone, open WhatsApp → **Settings → Linked Devices → Link a Device
   → Link with phone number** and enter the code.
6. Done! The page now shows *Connected*, and `database.db` stores the session
   so you don’t need to repeat this on restart.

### Option B — QR code

Same page, **QR Code** tab. Scan with your phone. Choose this if you prefer
the classic WhatsApp-Web flow.

### Re-pairing / logging out

Open `/admin` → **Bot Health** → **Logout**. The session row in
`database.db` is wiped and the pairing page shows up again.

---

## 🛡️ Enabling the bot in a group

> The bot is **off by default** for every group. You must turn it on, otherwise
> the bot stays silent no matter what commands members send.

<p align="center">
  <img src="assets/diagrams/flow-group-activation.svg" alt="Group activation flow" width="100%"/>
</p>

Pick whichever method you prefer:

| # | Method | When to use |
|---|--------|-------------|
| 1 | **Admin Dashboard → Groups → toggle *Bot Active*** | Easiest, no command needed |
| 2 | In the group, send `-bot on` (or `-group isBotOn:true` from owner) | Quick on the phone |
| 3 | Edit `database.db` directly (JSON in the `data` column) | Bulk / scripted changes |

The dashboard also lets you toggle `chatbot`, `antilink`, `nsfw` and the
welcome message **per group**, in the same screen.

---

## 🎛️ Admin dashboard tour

The dashboard ships pre-built into `public/app/`, so the same Node process
that runs the bot also serves the UI at <http://localhost:8000/admin>.

| Page | What you can do |
|------|-----------------|
| **Dashboard** | At-a-glance: uptime, member count, group count, command count, recent errors |
| **Bot Health** | Memory, CPU, connection status, **Get Pairing Code**, **Restart**, **Logout** |
| **Groups** | Search any group the bot is in, toggle bot/chatbot/antilink/NSFW, view per-group stats |
| **Members** | Search any user, block/unblock, view XP/level, reset stats, inspect warnings |
| **Analytics** | Top 10 groups by messages, top 10 members, message-type pie chart (text/image/video/sticker/pdf) |
| **Commands** | Enable/disable commands globally (writes to `disabledGlobally` in `AuthTable`) |
| **Send API** | `POST /send` (admin-authenticated) — useful for cron jobs or scripts |

### Develop the dashboard with hot-reload

```bash
# Terminal 1 — backend
pnpm start

# Terminal 2 — dashboard dev server
cd dashboard
npm install     # first time only
npm run dev
# Open http://localhost:5173
```

> The Vite dev server proxies API calls to the Node backend on `:8000`, so
> auth and data work end-to-end.

---

## 🧩 Adding a new command (advanced)

The whole bot is a tree of files under `commands/`. Every command is a single
file that exports a small object.

```js
// commands/public/hello.js
const handler = async (sock, msg, from, args, msgInfoObj) => {
  const { sendMessageWTyping } = msgInfoObj;
  await sendMessageWTyping(from, { text: "Hello! 👋" }, { quoted: msg });
};

export default () => ({
  cmd: ["hello", "hi"],        // aliases the user can type
  desc: "Say hello to the bot", // shown in -help
  usage: "hello",               // shown in -help
  handler,                      // the function above
});
```

Save the file, restart `pnpm start`, and `-hello` works immediately.
Drop the file in `group/admins/` to make it admin-only, or in `owner/` to
restrict it to `MY_NUMBER`.

Helper utilities available inside the handler:

- `sock` — Baileys socket
- `msg` / `from` — incoming message & chat JID
- `args` — array of words after the command
- `sendMessageWTyping` — sends a reply with “typing…” indicator
- `msgInfoObj.evv` — full text after the command
- `msgInfoObj.prefix` — current prefix from env

---

## 🚢 Deployment

### Railway (one click)

1. Push to GitHub
2. [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Set the same env vars you used locally
4. Railway auto-detects the `Dockerfile` and deploys

### Docker

```bash
docker build -t downloadbuddy .
docker run -d --name downloadbuddy -p 8000:8000 --env-file .env downloadbuddy
# or:
docker compose up -d
```

### Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/soumyachk101/Whatsapp-OG-Bot)

### Koyeb / Render / Fly.io

Build command: `pnpm run build` &nbsp;·&nbsp; Start command: `pnpm start`

---

## ⚙️ Environment variables

Copy `.env.example` to `.env` and fill in what you need. **Only the bold ones
are required** for the bot to start.

### Required to start the bot

| Variable | Description |
|----------|-------------|
| **`PREFIX`** | Command prefix, default `-` |
| **`MY_NUMBER`** | Owner WhatsApp number, digits only with country code, e.g. `919876543210` |
| **`ADMIN_PASSWORD`** | Password for `/admin` login (set a strong one!) |

`MODERATORS` and `BOT_NUMBER` default sensibly if you leave them empty.

### Optional — feature APIs

| Variable | Unlocks | Free tier? |
|----------|---------|------------|
| `GROQ_API_KEY` | `-chatbot`, `-groq`, default LLM | ✅ generous free tier |
| `GOOGLE_API_KEY` | `-gemini`, `-imagine` (image gen) | ✅ small free tier |
| `OPENAI_API_KEY` | `-chatbot` with OpenAI | ❌ paid |
| `SARVAM_API_KEY` | Premium Hindi/English TTS (`-say hin …`) | ✅ limited |
| `SEARCH_ENGINE_KEY` | `-img` (Google Custom Search) | ✅ 100/day free |
| `GENIUS_ACCESS_SECRET` | `-lyrics` | ✅ free |
| `REMOVE_BG_KEY` | `-removebg` | ✅ small free tier |
| `TRUECALLER_ID` | `-truecaller` | ❌ paid |
| `TWITTER_BEARER_TOKEN` | `-twitter` | ❌ paid |
| `INSTAGRAM_COOKIE` | `-idp` (HD profile pics) | n/a |
| `PIN_KEY` | `-pin` | depends |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Forward error logs to Telegram | ✅ free |

### Optional — tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8000` | Web server port |
| `NODE_ENV` | `production` | `development` enables debug logs |
| `SESSION_SECRET` | auto | Signs the dashboard session cookie |
| `MAX_VIDEO_SIZE_MB` | `50` | Reject YouTube downloads above this size |
| `MAX_AUDIO_SIZE_MB` | `50` | Reject audio above this size |
| `YOUTUBE_MAX_RETRIES` | `3` | Retry count for transient YouTube errors |
| `YOUTUBE_DELAY_BETWEEN_REQUESTS` | `1000` | ms between downloads (avoid rate-limit) |
| `FORCE_DISABLE_YTDLP` | `false` | Force fallback to `ytdl-core` (debug) |
| `FFMPEG_PATH` | bundled | Path to `ffmpeg` if not using `ffmpeg-static` |

> ⚠️ Most users can ignore the tuning block — the defaults are sensible.

---

## 🏗️ Architecture & file map

<p align="center">
  <img src="assets/diagrams/architecture.svg" alt="Architecture diagram" width="100%"/>
</p>

### Runtime flow

```
index.js
  └─ Express server (:8000)  ── serves EJS landing + React dashboard
  └─ WebSocket              ── admin → bot messaging
  └─ startSock()            ── kicks off Baileys

connection.js
  └─ startSock()            ── retry/backoff, max 5 attempts, then reset
       ├─ getSocket.js      ── makeWASocket, auth from SQLite, caches
       └─ getEvents.js      ── routes incoming events
            ├─ messages.upsert       → getMessagesEvent.js → command dispatcher
            ├─ connection.update     → getConnectionUpdateEvent.js
            ├─ group-participants    → getGroupEvent.js (welcome / leave)
            └─ call                  → getCallEvents.js

getMessagesEvent.js
  └─ loads command maps from functions/getAddCommands.js
  └─ permission gate (DM | member | admin | owner)
  └─ dispatches to handler in commands/{public,group,owner}/
```

### Top-level file map

```
.
├── index.js                # Express + WebSocket + boot
├── connection.js            # Socket lifecycle & reconnect logic
├── sqlite.js                # SQLite tables (Auth, Groups, Members, …)
├── database.db              # 🗄️  All persistent state (auth, groups, members)
├── commands/
│   ├── public/              # 33 commands — anyone can use
│   ├── group/
│   │   ├── members/         # 35 commands — group members
│   │   └── admins/          # 20 commands — group admins
│   └── owner/               # 10 commands — MY_NUMBER only
├── functions/
│   ├── getSocket.js         # Baileys makeWASocket + auth from SQLite
│   ├── getEvents.js         # Event router
│   ├── getMessagesEvent.js  # Command dispatcher (big file, ~545 lines)
│   ├── getGroupEvent.js     # Welcome / goodbye messages
│   ├── useSQLiteAuthState.js # WhatsApp session persistence
│   ├── ytdlpHelper.js       # Wraps `yt-dlp` CLI (Facebook, YouTube, …)
│   ├── youtubeUtils.js      # UA rotation, retry, bot-detection checks
│   ├── nsfwFilter.js        # NSFW image classifier
│   ├── messageQueue.js      # Per-chat send queue (back-pressure)
│   ├── memoryUtils.js       # Temp-file lifecycle
│   ├── performanceMonitor.js
│   ├── lidUtils.js          # LID ⇄ PN JID conversion (Baileys v7+)
│   └── …
├── sqlite-DB/
│   ├── botDataDb.js         # AuthTable CRUD
│   ├── groupDataDb.js       # Groups CRUD
│   └── membersDataDb.js     # Members CRUD
├── routes/
│   └── admin.js             # REST API for the React dashboard
├── dashboard/               # React + Vite admin UI (source)
├── public/
│   ├── app/                 # Built dashboard (auto-generated)
│   ├── index.ejs            # Landing / QR / pairing-code page
│   └── downloadbuddy.jpg
├── assets/
│   ├── diagrams/            # SVG workflow diagrams (used in README)
│   └── gifs/                # Place screen recordings here (see assets/gifs/README.md)
├── Dockerfile               # Production image (Node 22 + yt-dlp + ffmpeg)
├── docker-compose.yml
└── .env.example
```

### Tech stack at a glance

| Concern | Choice |
|---------|--------|
| Runtime | Node.js 22 (ESM) |
| WhatsApp protocol | [Baileys](https://github.com/WhiskeySockets/Baileys) v7 multi-device |
| Database | SQLite (better-sqlite3, WAL mode) |
| Web server | Express 4 + `ws` WebSocket |
| Dashboard | React 18 + Vite + Recharts |
| Media | ffmpeg-static + fluent-ffmpeg |
| YouTube / FB / IG | `yt-dlp` (Python) with `@distube/ytdl-core` fallback |
| LLMs | Groq (default), Google Gemini, OpenAI |
| Stickers | wa-sticker-formatter |

---

## 🛠️ Troubleshooting

### Bot doesn’t respond in a group

The group is off. Either click **Bot Active** in the dashboard or send
`-bot on` in the group.

### `Error: yt-dlp version too old`

YouTube / Facebook fix their extractors constantly. Upgrade:
```bash
brew upgrade yt-dlp        # macOS
pipx upgrade yt-dlp        # Linux (pipx)
winget upgrade yt-dlp      # Windows
# or in this repo's venv:
pip install -U yt-dlp
```

### `-chatbot` says “no API key”

Set `GROQ_API_KEY` (recommended, free) in `.env` and restart.

### `npm start` crashes with `EADDRINUSE :::8000`

Something else is on port 8000. Either stop it or set `PORT=8080` in `.env`.

### `MODULE_NOT_FOUND` after pulling new code

```bash
pnpm install
pnpm run build   # rebuilds the React dashboard
```

### Bot shows connected but commands do nothing

1. Check the terminal for stack traces.
2. Open `/admin → Bot Health` — error count should be near 0.
3. Verify the command file exists in `commands/<scope>/`.
4. Run `-help` — if the command is missing, it failed to load (typo or syntax error).

### Re-link the phone number

`/admin → Bot Health → Logout`. The pairing page reappears.

### Reset everything

```bash
# Stops the bot, wipes the session, and reboots
pkill -f "node .*index.js"
rm database.db
pnpm start
```

> ⚠️ This deletes every group setting, member stats, and warning. The
> WhatsApp session is in `database.db` — so this also unlinks your phone.
> Re-pair afterwards.

---

## 🙏 Credits & license

- [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web API
- [wa-sticker-formatter](https://github.com/AlenSaito1/wa-sticker-formatter) — stickers
- [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) — ffmpeg binary
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube/Facebook/Instagram extractors
- [Groq](https://groq.com), [Google Gemini](https://aistudio.google.com), [OpenAI](https://openai.com) — LLM providers

MIT © Mahesh Kumar / Soumyachk. Star ⭐ the repo if this saved you some time!
