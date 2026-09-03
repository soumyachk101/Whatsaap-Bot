# Cobalt Download System — Full Analysis Report

**Date:** 2026-09-03
**Files Analyzed:**
- `functions/cobaltHelper.js`
- `functions/memoryUtils.js`
- `commands/public/download.js`
- `commands/public/mp3.js`
- `commands/public/reddit.js`
- `commands/public/googleSearch.js`
- `commands/public/crypto.js`
- `commands/group/members/song.js`

---

## Executive Summary

The download system has a solid fallback chain (Cobalt → SnapSave → yt-dlp), but there are **12 critical/medium issues** that cause downloads to fail silently or corrupt files. The main failure modes are:

1. **File deletion race conditions** — files deleted while Baileys is still reading them
2. **No content validation** — corrupt/HTML files sent to users as "media"
3. **Filename collision risk** — concurrent downloads can overwrite each other
4. **Misleading error messages** — real errors masked by network errors
5. **No per-file retry** — one Baileys failure kills the entire batch
6. **No progress feedback** — users wait silently for 1-4 minutes
7. **No platform-specific handling** — TikTok, Twitter, Facebook get generic treatment

---

## Issue 1: Baileys Reads File After Promise Resolves (HIGH)

**Files:** `download.js:127-179`, `mp3.js:31-39`, `song.js:85-93`

**Problem:** `sock.sendMessage()` resolves when the message is queued to WhatsApp servers, NOT when Baileys finishes reading the file from disk. The `finally` block at `download.js:174-179` deletes the file while Baileys may still have an open read stream.

**Failure scenario:**
- Large video file (50MB) uploaded over slow connection
- `sendMessage` promise resolves in 2 seconds (queued)
- `finally` block runs 500ms later, deletes the file
- Baileys tries to read remaining bytes → gets ENOENT or garbage data
- User receives a corrupt/empty video

**Fix:** Use `fs.promises.stat()` + delay before cleanup, or use Baileys' `upload` method directly which returns when upload is complete.

---

## Issue 2: No Content Validation — Corrupt Files Sent to Users (HIGH)

**File:** `cobaltHelper.js:242-247`

**Problem:** The only validation is `size > 0`. If Cobalt returns a 200 response with an HTML error page (rate limit, geo-block, etc.), the file is non-zero and gets sent to the user.

**Failure scenario:**
- Cobalt returns HTML: `<html>Rate limit exceeded</html>` (2KB)
- File passes `size > 0` check at line 242
- Sent to user as "document" with mimetype `application/octet-stream`
- User receives an HTML file instead of a video

**Same issue in SnapSave:** `cobaltHelper.js:92` — only checks `size > 0`.

**Fix:** Check magic bytes (first 4-12 bytes) against known media signatures before accepting the file. The `file-type` library is already used in `download.js:125` — use it earlier in the pipeline.

---

## Issue 3: Filename Collision Risk (MEDIUM-HIGH)

**Files:** `memoryUtils.js:232`, `cobaltHelper.js:221,33,79`

**Problem:** Temp filenames use `Date.now() + Math.random() * 1000` (cobalt paths) or `* 10000` (generateTempFileName). Only 1,000-10,000 possibilities per millisecond.

**Collision scenario:**
- Two users send `#download` simultaneously
- Both hit the same millisecond and get the same random number
- `fs.createWriteStream` at `cobaltHelper.js:226` truncates the first file
- First download's data is silently corrupted
- First user receives a 0-byte or partial file

**Probability:** With 1,000 possibilities, 50 concurrent requests in the same ms = ~11.6% collision chance (birthday paradox).

**Fix:** Use `crypto.randomUUID()` or `nanoid()` for collision-proof filenames, or include the process ID + request ID.

---

## Issue 4: TOCTOU Race in `safeUnlink` + Memory Leak (MEDIUM)

**File:** `memoryUtils.js:85-96`

**Problem:** `fs.existsSync()` then `fs.unlinkSync()` is a classic time-of-check-time-of-use race. If the file is deleted between check and unlink, `unlinkSync` throws ENOENT, caught at line 92, but `tempFiles.delete()` at line 89 never runs.

**Consequence:** The entry stays in the `tempFiles` Map forever. Every GC cycle tries to delete it again, wasting I/O.

**Fix:**
```js
safeUnlink(filePath) {
 try {
 fs.unlinkSync(filePath);
 } catch (error) {
 if (error.code !== "ENOENT") {
 console.warn(`Failed to delete file ${filePath}:`, error.message);
 }
 }
 this.tempFiles.delete(filePath); // Always run
 return true;
}
```

---

## Issue 5: Misleading Error Messages — Real Errors Masked (MEDIUM)

**File:** `cobaltHelper.js:127-170, 280-281`

**Problem:** `lastError` is overwritten on every iteration. If Instance 1 returns `"rate_limit"` and Instance 2 returns `"network_error"`, the final error is `"network_error"` — masking the real rate limit.

**Failure scenario:**
- Cobalt API is rate-limiting (Instance 1: `rate_limit`)
- Other instances timeout (network errors)
- User sees: `"Failed to download media: network_error"`
- Real problem: Cobalt rate limit — user should retry in 60s, not immediately

**Same issue at lines 266-281:** If SnapSave fails for Instagram, then yt-dlp fails, the final error is from the Cobalt phase (least relevant).

**Fix:** Collect all errors, prioritize meaningful API errors over network errors. Include platform context in the final message.

---

## Issue 6: No Per-File Retry on Baileys Send Failure (MEDIUM)

**File:** `download.js:110-166`

**Problem:** If `sock.sendMessage()` throws for file 2 of 3, the error propagates to the catch block, which deletes ALL files (including the already-sent file 1). The user sees a generic error with no indication that file 1 arrived.

**Failure scenario:**
- Instagram carousel with 3 photos downloaded
- File 1 sent successfully
- File 2 fails (Baileys transient error)
- `catch` at line 167 catches the error
- `finally` at line 175 deletes all files
- User sees: `"Download failed! Couldn't fetch media right now: <error>"`
- User has no idea file 1 was delivered

**Fix:** Wrap each `sendMessage` in its own try/catch. Retry once with a 2s delay. Notify user of partial success.

---

## Issue 7: No Outer Timeout Wrapper (MEDIUM)

**Files:** `cobaltHelper.js:145-230`, `memoryUtils.js:48`

**Problem:** The entire download chain has no outer timeout. Worst case:
- 4 Cobalt instances × 30s = 120s
- SnapSave: 30s
- yt-dlp: 90s
- **Total: ~4.5 minutes** with no timeout

If the Baileys session drops or an outer HTTP timeout fires mid-download, temp files are orphaned.

**Additional issue:** `stream.pipeline` at `cobaltHelper.js:237` has no timeout. If the upstream stalls (slow loris), it hangs until the axios timeout fires (60s).

**Fix:** Wrap the entire `downloadViaCobalt` in a Promise.race with a 180s timeout. Add progress tracking to the stream download.

---

## Issue 8: No Disk Space Checks (MEDIUM)

**File:** `cobaltHelper.js:226`, `memoryUtils.js:231-243`

**Problem:** No check for available disk space before starting a download. A 90MB download into a 1MB-free filesystem will fail midway with a confusing error.

**Failure scenario:**
- User requests a 50MB video
- Disk has 10MB free
- Download starts, fails at 40MB with ENOSPC
- `pipeline` throws at line 238
- File is 0 bytes (or partial) → unlinked at line 246
- User sees: `"[Cobalt] Downloaded file X is empty (0 bytes). Unlinking..."` — misleading

**Fix:** Check disk space with `fs.statfs` (or `df` on Unix) before downloading. Reject early with a clear message.

---

## Issue 9: YouTube yt-dlp Has Single player_client (LOW-MEDIUM)

**File:** `cobaltHelper.js:38-40`

**Problem:** Only `--extractor-args "youtube:player_client=android"` is tried. YouTube rotates working clients. When `android` stops working, all YouTube downloads silently fail.

**Fix:** Try multiple clients in sequence: `android` → `web` → `ios` → `tv` → `mediaconnect`.

---

## Issue 10: Instagram Reel Fallback Has No User-Facing Error Detail (MEDIUM)

**File:** `cobaltHelper.js:197-198, 251-258, 280-281`

**Problem:** When Cobalt returns a JPEG for a Reel, SnapSave is tried, then yt-dlp. If all fail, the error is generic: `"Failed to download media for ${url}"`.

**Failure scenario:**
- Private Instagram Reel
- Cobalt returns JPEG thumbnail (expected for private content)
- SnapSave fails (also can't access private content)
- yt-dlp fails
- User sees: `"Failed to download media for https://www.instagram.com/reel/xxx"`
- No indication it was a Reel, no indication it might be private

**Fix:** Include platform and fallback stage in error messages.

---

## Issue 11: No TikTok/Twitter/Facebook-Specific Handling (MEDIUM)

**File:** `cobaltHelper.js:109, 266-272`

**Problem:** SnapSave fallback is gated to Instagram only (`isInstagram` check at line 109). TikTok, Twitter, Facebook have no platform-specific fallbacks.

| Platform | Fallback Chain |
|---|---|
| Instagram | Cobalt → SnapSave → yt-dlp (3 chances) |
| YouTube | Cobalt → yt-dlp (2 chances) |
| TikTok | Cobalt → yt-dlp (2 chances) |
| Twitter/X | Cobalt → yt-dlp (2 chances) |
| Facebook | Cobalt → yt-dlp (2 chances) |

**Fix:** Either make SnapSave platform-agnostic (if it supports other platforms), or add platform-specific yt-dlp extractor args.

---

## Issue 12: Picker Fallback Iterates in Original Order (HIGH)

**File:** `cobaltHelper.js:176-195`

**Problem:** The fallback at lines 189-195 iterates `data.picker` in its original array order. For Reels/TV, it forces `itemType = "video"` for every item (line 191). If the picker has `[photo, video, photo]`, all three get `.mp4` extension and the photos become corrupt files.

**Fix:** In the fallback, filter items by URL extension or MIME type before assigning itemType. Don't force all items to "video" for Reels/TV.

---

## Issue 13: Files >95MB Downloaded Before Size Check (LOW-MEDIUM)

**File:** `download.js:116-123`

**Problem:** The file size check happens AFTER the download completes. The file is already on disk (potentially 100MB+). The check just skips sending it, but the download bandwidth and disk space were already consumed.

**Fix:** Check `Content-Length` header before downloading, or abort if file exceeds threshold during streaming.

---

## Issue 14: No Progress Indicator for Users (LOW)

**Files:** `download.js`, `mp3.js`, `song.js`

**Problem:** For large files (30-90MB), users wait silently for 30-90 seconds with no feedback. They don't know if the bot is working or hung.

**Fix:** Send periodic status updates during download (e.g., "Downloading... 45%").

---

## Issue 15: GC Intervals Not Throttled (LOW)

**File:** `memoryUtils.js:23-30`

**Problem:** `cleanupInterval` (3 min) and `memoryCheckInterval` (30s) can fire concurrently. If the event loop is backed up, multiple callbacks queue up and fire in sequence.

**Fix:** Add mutual exclusion lock around `performGarbageCollection` calls.

---

## Priority Fix Order

| Priority | Issue | Impact | Effort |
|---|---|---|---|
| 1 | File deletion race (Issue 1) | Downloads fail/corrupt | Medium |
| 2 | No content validation (Issue 2) | Corrupt files sent | Low |
| 3 | Filename collision (Issue 3) | Silent corruption | Low |
| 4 | Picker fallback order (Issue 12) | Corrupt Reel carousels | Medium |
| 5 | No per-file retry (Issue 6) | Partial batch failures | Medium |
| 6 | Misleading errors (Issue 5, 10) | User confusion | Low |
| 7 | No outer timeout (Issue 7) | Hanging downloads | Low |
| 8 | No disk space check (Issue 8) | Mid-download failures | Low |
| 9 | Platform-specific gaps (Issue 11) | Lower success rate | Medium |
| 10 | YouTube player_client (Issue 9) | YouTube downloads fail | Low |
| 11 | Size check after download (Issue 13) | Wasted bandwidth | Low |
| 12 | No progress indicator (Issue 14) | UX | Low |
| 13 | GC interval race (Issue 15) | Edge case | Low |

---

## Recommended Implementation Order

**Phase 1 — Stop failures (Issues 1, 2, 3, 12):**
1. Fix `safeUnlink` TOCTOU + add content validation
2. Use `crypto.randomUUID()` for filenames
3. Fix picker fallback to filter by URL extension
4. Add small delay before cleanup to let Baileys finish reading

**Phase 2 — Improve reliability (Issues 6, 5, 10):**
5. Per-file retry with try/catch in send loop
6. Aggregate errors instead of overwriting `lastError`
7. Better error messages with platform context

**Phase 3 — Polish (Issues 7, 8, 9, 11, 13, 14, 15):**
8. Outer timeout wrapper
9. Disk space check
10. Multiple YouTube player_client options
11. Platform-specific yt-dlp args
12. Pre-download size check
13. Progress indicator
14. GC mutual exclusion
