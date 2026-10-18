# Agent Instructions & AWS Deployment Protocol

This repository is connected to a production WhatsApp Bot instance hosted on **AWS EC2**.

---

## 🚨 MANDATORY RULE: Deploy to AWS After Every Successful Change

Whenever you complete a bug fix, feature update, refactor, or optimization:
1. **Verify locally** first (syntax and logic check).
2. **Deploy immediately to AWS EC2** following the protocol below.
3. **Restart PM2 & verify live logs** on the server.
4. **Commit & push to GitHub** (`origin main`).

Do NOT finish a task or consider changes complete without deploying to AWS and verifying the live PM2 process.

---

## 🌐 AWS EC2 Server Details

- **Host / IP**: `13.201.15.195`
- **SSH User**: `ubuntu`
- **SSH Key**: `~/.ssh/whatsapp-bot-key.pem`
- **App Path on Server**: `/home/ubuntu/app`
- **Process Manager**: PM2 (`whatsapp-bot`)
- **Cobalt Docker Container**: `cobalt` (listening on port 9000)

---

## 🚀 Step-by-Step Deployment Protocol

### Step 1: Local Verification
Always validate that all modified JavaScript files are syntactically sound:
```bash
node -c <modified_files...>
```

### Step 2: Sync Code to AWS EC2
Use `rsync` with the designated SSH key.

> [!CAUTION]
> **NEVER OVERWRITE:**
> - `node_modules/` (macOS arm64 binaries will break Linux x86_64)
> - `.env` (contains server-specific credentials and secrets)
> - `database.db*` (`database.db`, `-shm`, `-wal` hold live sessions)
> - `*.txt` (`youtube-cookies.txt`, `instagram-cookies.txt`)
> - `media/`, `temp/`, `logs/`

Execute targeted rsync commands:
```bash
# 1. Sync functions/
rsync -avz -e "ssh -i ~/.ssh/whatsapp-bot-key.pem" \
  --exclude="node_modules" \
  --exclude=".env" \
  --exclude="database.db*" \
  --exclude="*.txt" \
  --exclude=".git" \
  --exclude=".DS_Store" \
  ./functions/ ubuntu@13.201.15.195:/home/ubuntu/app/functions/

# 2. Sync commands/
rsync -avz -e "ssh -i ~/.ssh/whatsapp-bot-key.pem" \
  --exclude="node_modules" \
  --exclude=".env" \
  --exclude="database.db*" \
  --exclude="*.txt" \
  --exclude=".git" \
  --exclude=".DS_Store" \
  ./commands/ ubuntu@13.201.15.195:/home/ubuntu/app/commands/

# 3. Sync root files if modified (index.js, sessionStore.js, sqlite.js, etc.)
rsync -avz -e "ssh -i ~/.ssh/whatsapp-bot-key.pem" \
  ./index.js ./sessionStore.js ./sqlite.js \
  ubuntu@13.201.15.195:/home/ubuntu/app/
```

### Step 3: Remote Syntax Validation
Check syntax on the EC2 server before restarting PM2:
```bash
ssh -i ~/.ssh/whatsapp-bot-key.pem ubuntu@13.201.15.195 "cd /home/ubuntu/app && node -c functions/getSocket.js functions/getConnectionUpdateEvent.js functions/getMessagesEvent.js"
```

### Step 4: Restart PM2 on AWS EC2
Restart the production bot process:
```bash
ssh -i ~/.ssh/whatsapp-bot-key.pem ubuntu@13.201.15.195 "pm2 restart whatsapp-bot"
```

### Step 5: Verify Live Status & Logs
Wait 3–5 seconds and inspect PM2 output logs to confirm clean startup and 0ms group cache pre-warming:
```bash
ssh -i ~/.ssh/whatsapp-bot-key.pem ubuntu@13.201.15.195 "sleep 3; pm2 logs whatsapp-bot --lines 30 --nostream"
```
Look for:
- `⚡ Pre-warming group metadata cache...`
- `✅ Cached metadata for ... groups! (0ms lookups active)`
- `status: online`

### Step 6: Commit and Push to GitHub
Once verified on AWS:
```bash
git add <modified_files>
git commit -m "fix/feat: <description>"
git push origin main
```
