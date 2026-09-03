# Task 2 Reviewer — Media Download Pipeline

## Brief
.superpowers/sdd/fix-whatsapp-bot/task-2-brief.md

## Report
.superpowers/sdd/fix-whatsapp-bot/task-2-report.md

## Diff
Commit: 4af53e1
BASE: 2132e5d
Files changed: commands/public/download.js, functions/cobaltHelper.js, functions/downloadQueue.js, functions/memoryUtils.js

## Diff Content

```diff
diff --git a/commands/public/download.js b/commands/public/download.js
index 268452a..d7894dc 100644
--- a/commands/public/download.js
+++ b/commands/public/download.js
@@ -174,23 +174,29 @@ const handler = async (sock, msg, from, args, msgInfoObj) => {
 				}
 				memoryManager.markFileSent(filePath);
 			} catch (sendErr) {
-				console.error("[Universal DL] Send error with URL, trying buffer fallback:", sendErr.message);
+				console.error("[Universal DL] Send error, trying stream-based buffer fallback:", sendErr.message);
+				const fileSizeMB = stats.size / (1024 * 1024);
+				if (fileSizeMB > 50) {
+					console.warn(`[Universal DL] Buffer fallback skipped: ${fileSizeMB.toFixed(1)}MB exceeds 50MB limit.`);
+					await sendMessageWTyping(from, { text: `...` }, { quoted: msg });
+					continue;
+				}
 				try {
-					const buf = fs.readFileSync(filePath);
+					const readStream = memoryManager.createOptimizedReadStream(filePath);
 					if (mediaInfo.detected === "video") {
-						await sock.sendMessage(from, { video: buf, mimetype: "video/mp4" }, { quoted: msg });
+						await sock.sendMessage(from, { video: readStream, mimetype: "video/mp4" }, { quoted: msg });
 					} else if (mediaInfo.detected === "audio") {
 						const mime = filePath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
-						await sock.sendMessage(from, { audio: buf, mimetype: mime, ptt: false }, { quoted: msg });
+						await sock.sendMessage(from, { audio: readStream, mimetype: mime, ptt: false }, { quoted: msg });
 					} else if (mediaInfo.detected === "image") {
-						await sock.sendMessage(from, { image: buf }, { quoted: msg });
+						await sock.sendMessage(from, { image: readStream }, { quoted: msg });
 					} else {
-						await sock.sendMessage(from, { document: buf, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime }, { quoted: msg });
+						await sock.sendMessage(from, { document: readStream, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime }, { quoted: msg });
 					}
 					memoryManager.markFileSent(filePath);
 				} catch (bufErr) {
-					console.error("[Universal DL] Buffer send fallback error:", bufErr.message);
+					console.error("[Universal DL] Stream fallback error:", bufErr.message);
 					await sendMessageWTyping(from, { text: "..." }, { quoted: msg });
 				}
 			}
```

```diff
diff --git a/functions/cobaltHelper.js b/functions/cobaltHelper.js
--- a/functions/cobaltHelper.js
+++ b/functions/cobaltHelper.js
@@ -12,6 +12,25 @@ import instanceHealth from "./instanceHealth.js";
 import ffmpegStatic from "ffmpeg-static";
 
 const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
+
+let ytDlpAvailable = true;
+let ffmpegAvailable = true;
+try { execFileSync("yt-dlp", ["--version"], { stdio: "ignore" }); } catch { ytDlpAvailable = false; }
+try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { ffmpegAvailable = false; }
+
 const pipeline = promisify(stream.pipeline);
```

```diff
diff --git a/functions/downloadQueue.js b/functions/downloadQueue.js
--- a/functions/downloadQueue.js
+++ b/functions/downloadQueue.js
@@ -7,6 +7,9 @@ class DownloadQueue {
 		this.maxConcurrent = maxConcurrent;
 		this.active = 0;
 		this.queue = [];
+		this.heartbeatInterval = 5000;
+		this.stallThreshold = 300000;
+		this.idleThreshold = 60000;
 	}
```

```diff
diff --git a/functions/memoryUtils.js b/functions/memoryUtils.js
--- a/functions/memoryUtils.js
+++ b/functions/memoryUtils.js
@@ -129,6 +129,13 @@ class MemoryManager {
 	markFileSent(filePath) {
 		this.downloadStatus.set(filePath, "sent");
 	}
+	markFileStatus(filePath, status) {
+		this.downloadStatus.set(filePath, status);
+	}
```

## Global Constraints for Task 2
- All 4 files must pass `node --check` syntax validation
- Reels must download as mp4, not as jpg thumbnails
- YouTube downloads must fall back to Cobalt when yt-dlp is missing (no crash)
- Buffer upload fallback must stream in chunks, never load full file into memory
- Download queue timeout must be 300000ms (5 min), not 120000ms
- GC must never delete files in "downloading" or "ready" state
- Status tracking must use the new `markFileStatus()` method, not inline status setting

## Review Instructions
You are reviewing Task 2 (media download pipeline) for:
1. **Spec compliance**: Does the implementation match every requirement in the brief?
2. **Code quality**: Is the code clean, well-structured, and free of obvious bugs?
3. **Regression risk**: Does this change break existing functionality?

Return: SPEC_STATUS (COMPLIANT/PARTIAL/NON_COMPLIANT), verdict (APPROVED/NEEDS_FIXES), findings list with severity (Critical/Important/Minor), and one-line summary.
