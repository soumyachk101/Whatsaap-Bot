# Task 2: Fix Media Download Pipeline

## Context
This is Task 2 of 3 for the WhatsApp bot fix project. The bot is failing to download and deliver media properly — videos fail for Reels, yt-dlp fallback breaks, and uploads fail silently.

## Requirements

### 2.1 Fix Cobalt Reel Handling
In `functions/cobaltHelper.js` lines 460-493, when Cobalt returns a picker for Reels/TikTok, it filters by `type === "video"` but some Reels return `type: "video"` with `.jpg` URLs, and other times it returns `type: "photo"` for a video. Fix the picker logic to:
- Always check item extension/content-type, not just the type field
- For Reels/TV, prefer `.mp4` URLs over `.jpg` thumbnails
- Add a validation step that checks the actual URL extension before adding to items

### 2.2 Fix yt-dlp Binary Detection
In `functions/cobaltHelper.js` line 14, `ffmpegStatic` is imported but `yt-dlp` binary is assumed on PATH. Add a binary check at module load time:
- Check if `yt-dlp` exists on PATH
- If not, log a warning and set a flag so the YouTube path skips yt-dlp and goes directly to Cobalt
- Same check for `ffmpeg` binary

### 2.3 Fix Buffer Upload Fallback
In `commands/public/download.js` lines 176-195, when URL upload fails, the buffer fallback reads the entire file into memory with `fs.readFileSync`. For 95MB files this can crash. Fix to:
- Stream the file in chunks using createReadStream
- Add a size check before buffer fallback (skip files > 50MB for buffer path)
- Log the actual error reason from Baileys to help debugging

### 2.4 Fix Download Queue Timeout
In `functions/downloadQueue.js` line 33, the queue timeout is 120000ms (2 minutes) but individual downloads can take longer. Increase to 300000ms (5 minutes) and add a progress heartbeat so the timeout only fires if the download is truly stalled.

### 2.5 Fix Download Status Tracking
In `functions/memoryUtils.js`, the `markFileReady` and `markFileSent` methods exist but are not called in the download flow in `cobaltHelper.js`. Add proper status tracking:
- Mark files as "downloading" when download starts
- Mark as "ready" when validation passes
- Mark as "sent" after successful delivery
- The GC should NOT delete files that are "downloading" or "ready" (currently it can)

## Acceptance Criteria
- Reels download as videos (mp4), not thumbnails
- YouTube downloads work even without yt-dlp binary (Cobalt fallback)
- Buffer upload works for files up to 50MB without crashing
- Download queue timeout is 5 minutes with progress heartbeat
- No premature deletion of in-progress or ready-to-send files

## Files to Modify
- `functions/cobaltHelper.js`
- `functions/downloadQueue.js`
- `functions/memoryUtils.js`
- `commands/public/download.js`

## Report
Write your report to `.superpowers/sdd/fix-whatsapp-bot/task-2-report.md`.
Report format: status (DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED), commits made, test summary, concerns.
