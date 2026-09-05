# Task 2 Re-Review — Heartbeat Fix

## Brief
.superpowers/sdd/fix-whatsapp-bot/task-2-brief.md

## Report
.superpowers/sdd/fix-whatsapp-bot/task-2-report.md

## Fix Diff (scoped)
BASE: 4af53e1
HEAD: dd594c3
Files: functions/downloadQueue.js, functions/cobaltHelper.js, commands/public/download.js

## Fix Diff Content

```diff
diff --git a/functions/downloadQueue.js b/functions/downloadQueue.js
--- a/functions/downloadQueue.js
+++ b/functions/downloadQueue.js
@@ -7,9 +7,9 @@ class DownloadQueue {
 	this.maxConcurrent = maxConcurrent;
 	this.active = 0;
 	this.queue = [];
-	this.heartbeatInterval = 5000; // check every 5s
-	this.stallThreshold = 300000; // 5 minutes total timeout
-	this.idleThreshold = 60000; // 60s of no heartbeat = stalled
+	this.stallThreshold = 300000; // 5 minutes without heartbeat = stalled
+	this.heartbeatCheckInterval = 5000; // check every 5s
@@ -15,6 +15,11 @@ class DownloadQueue {
 	this.queue = [];
 
 	async acquire(userId) {
@@ -36,12 +41,14 @@ class DownloadQueue {
 				entry.reject = () => {
 					this.queue = this.queue.filter((e) => e !== entry);
 					reject(new Error("queue_timeout"));
 				};
 
-				// Progress heartbeat: only fire timeout if the download is truly stalled
+				// Stall detection: only fire timeout if no heartbeat received within threshold
 				const stallCheck = setInterval(() => {
 					if (!this.queue.includes(entry)) {
 						clearInterval(stallCheck);
 						return;
 					}
-					entry.lastHeartbeat = Date.now();
-					const elapsed = Date.now() - entry.lastHeartbeat;
-					if (elapsed > this.stallThreshold) {
+					const elapsed = Date.now() - entry.lastHeartbeat;
+					if (elapsed > this.stallThreshold) {
 						clearInterval(stallCheck);
 						entry.reject();
 					}
-				}, this.heartbeatInterval);
+				}, this.heartbeatCheckInterval);
 
-				// Hard cap at stallThreshold in case heartbeat interval drifts
+				// Absolute safety net: 2x stall threshold
 				setTimeout(() => {
 					clearInterval(stallCheck);
 					if (this.queue.includes(entry)) {
```

```diff
diff --git a/functions/cobaltHelper.js b/functions/cobaltHelper.js
@@ -588,6 +588,7 @@ export const downloadViaCobalt = async (url, outputDir = null, audioOnly = false
 					downloadReq.data.on("data", (chunk) => {
 						downloadedBytes += chunk.length;
 						lastProgress = Date.now();
+						onProgress?.();
 					});
```

```diff
diff --git a/commands/public/download.js b/commands/public/download.js
@@ -125,7 +125,7 @@ const handler = async (sock, msg, from, args, msgInfoObj) => {
 		acquired = true;
 
-		downloadedPaths = await downloadViaCobalt(targetUrl, null, false);
+		downloadedPaths = await downloadViaCobalt(targetUrl, null, false, null, () => downloadQueue.heartbeat(from));
```

## Open Findings from Prior Review
1. [Important] downloadQueue.js heartbeat logic — entry.lastHeartbeat reset on same tick as elapsed check, making stall detection dead code. **This fix addresses it.**
2. [Minor] markFileReady/markFileSent still use inline set() instead of markFileStatus(). **Not addressed — low priority.**

## Re-Review Instructions
Verify:
1. The heartbeat bug is fixed: stallCheck interval no longer resets lastHeartbeat before checking elapsed time.
2. onProgress callback is wired from actual download data events to downloadQueue.heartbeat().
3. No new bugs introduced in the fix.
4. The heartbeat(userId) public method is called from the download command with the correct userId.

Return: ADDRESSED / NOT_ADDRESSED for each finding, plus any new findings in the fix diff.