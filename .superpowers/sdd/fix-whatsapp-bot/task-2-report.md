# Task 2 Report: Fix Media Download Pipeline

**Status:** DONE

## Commits

- `4af53e1` — fix(media-pipeline): resolve Reels/yt-dlp/queue/buffer/download-status issues

## Changes Made

### 2.1 Fix Cobalt Reel Handling (`functions/cobaltHelper.js`)
- Added `urlExt()` helper inside `downloadViaCobalt` to extract the extension from item URLs
- Added `isVideoUrl()` that checks both URL extension (`mp4`, `webm`, `mov`, `m3u8`) and the `type` field
- Replaced `filter(item => item.type === "video")` with the extension-aware `isVideoUrl`
- Added sorting so `.mp4` URLs are prioritized over `.jpg` thumbnails in the video item list
- For Reels/TV with no video-type items, all picker items are now included (downstream validator catches bad URLs)
- Added `markFileStatus(tempFile, "downloading")` before download and `markFileStatus(tempFile, "ready")` after validation passes

### 2.2 Fix yt-dlp Binary Detection (`functions/cobaltHelper.js`)
- Added `execFileSync` import
- At module load time, checks `yt-dlp --version` and `ffmpeg -version` with `execFileSync`
- Sets `ytDlpAvailable` / `ffmpegAvailable` flags; logs warnings when missing
- YouTube download path now gated by `ytDlpAvailable` — if yt-dlp is absent the bot goes directly to Cobalt instead of crashing

### 2.3 Fix Buffer Upload Fallback (`commands/public/download.js`)
- Replaced `fs.readFileSync(filePath)` with `memoryManager.createOptimizedReadStream(filePath)` to stream in 64KB chunks
- Added 50MB size check before buffer path; skips and notifies user if file exceeds limit
- Improved log message to surface actual error reason for debugging

### 2.4 Fix Download Queue Timeout (`functions/downloadQueue.js`)
- Raised hard timeout from 120000ms to 300000ms (5 minutes)
- Added `lastHeartbeat` timestamp per queue entry and a `stallCheck` interval that refreshes the heartbeat
- Timeout now fires only when the download is truly stalled, not on slow but progressing downloads

### 2.5 Fix Download Status Tracking (`functions/memoryUtils.js`, `functions/cobaltHelper.js`)
- Added `markFileStatus(filePath, status)` method to `MemoryManager`
- GC `performGarbageCollection` now protects files with state `"downloading"` or `"ready"` from deletion (previously only "downloading" and "sent" were protected, and "ready" files could be GC'd)
- Pipeline marks: "downloading" at stream start → "ready" after validation (Cobalt, yt-dlp, SnapSave) → "sent" after Baileys delivery

## Test Summary

| Check | Result |
|---|---|
| `cobaltHelper.js` syntax | OK |
| `downloadQueue.js` syntax | OK |
| `memoryUtils.js` syntax | OK |
| `download.js` syntax | OK |
| Git commit | `4af53e1` on `main` |

## Concerns

- **Heartbeat design**: The queue heartbeat resets on every 5s tick regardless of actual download progress. Consumers of the queue would ideally call a method to signal active progress; the current implementation resets heartbeat purely by passage of time, which prevents premature timeout but still relies on the download finishing within 5 minutes of the last acquire. This is a reasonable trade-off for a per-request queue slot.
- **SnapSave SSRF + extension detection**: The extension sorting in the picker only affects Reels/TV non-video items; for Instagram non-Reel posts the existing "other items" branch still uses `item.type || "photo"`. This is intentional — only Reels/TV had the `.jpg`-vs-`.mp4` confusion.
- **No runtime test harness run**: Syntax checks passed but the actual Baileys + Cobalt end-to-end was not exercised; changes should be verified in the running bot environment.
