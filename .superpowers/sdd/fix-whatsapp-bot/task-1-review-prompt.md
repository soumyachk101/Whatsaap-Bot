# Task 1 Reviewer — Bot Response Pipeline

## Brief
.superpowers/sdd/fix-whatsapp-bot/task-1-brief.md

## Report
.superpowers/sdd/fix-whatsapp-bot/task-1-report.md

## Diff
Commit: 0081e99
BASE: 2132e5d
Files changed: functions/getMessagesEvent.js, functions/messageQueue.js, commands/public/chatbot.js

## Diff Content

```diff
diff --git a/commands/public/chatbot.js b/commands/public/chatbot.js
@@ -255,10 +255,12 @@ const handler = async (sock, msg, from, args, msgInfoObj) => {
 			);
 		} else {
 			await chat(prompt, from, msg, taggedMember, msgInfoObj, data, tagMessage, tagMessageSenderJID);
+			return;
 		}
 	} else {
 		if (msgInfoObj.isOwner) {
 			await chat(prompt, from, msg, taggedMember, msgInfoObj, null, tagMessage, tagMessageSenderJID);
+			return;
```

```diff
diff --git a/functions/getMessagesEvent.js b/functions/getMessagesEvent.js
--- a/functions/getMessagesEvent.js
+++ b/functions/getMessagesEvent.js
@@ -50,13 +50,11 @@ const getCommand = async (sock, msg, cache) => {
 	try {
 		await commandsReady();
-		if (!sock) return;
-		if (!sock.user) {
-			sock.user = { id: (process.env.BOT_NUMBER?.split(",")[0] || "123456789") + "@s.whatsapp.net", name: "WhatsAppBot" };
-		}
+		if (!sock || !msg) return;
+		const from = msg.key?.remoteJid;
+		if (!from) return;
 		const messageKeys = Object.keys(msg.message);
 		if (messageKeys.length === 0) return;
-		if (msg.key.fromMe && !msg.key.remoteJid) return;
 
 		const sendMessageWTyping = async (to, msgObj, messageOptions) => {
 			try {
@@ -105,7 +103,6 @@ const getCommand = async (sock, msg, cache) => {
 			}
 		};
 
-		const from = msg.key.remoteJid;
 		const content = JSON.stringify(msg.message);
```

```diff
diff --git a/functions/getMessagesEvent.js b/functions/getMessagesEvent.js
@@ -223,26 +220,22 @@ const getCommand = async (sock, msg, cache) => {
 		let groupMetadata = null;
 		if (isGroup) {
 			groupMetadata = groupMetadataCache.get(from) || (typeof cache?.get === "function" ? cache.get(from + ":groupMetadata") : null);
-			if (!groupMetadata && isCmd) {
-				try {
-					groupMetadata = await Promise.race([
-						sock.groupMetadata(from),
-						new Promise((_, reject) =>
-							setTimeout(() => reject(new Error("Group metadata fetch timeout")), 5000)
-						),
-					]);
-					if (groupMetadata) {
-						groupMetadataCache.set(from, groupMetadata);
+			if (!groupMetadata) {
+				groupMetadata = { participants: [], subject: from };
+				Promise.race([
+					sock.groupMetadata(from),
+					new Promise((_, reject) =>
+						setTimeout(() => reject(new Error("Group metadata fetch timeout")), 5000)
+					),
+				]).then((m) => {
+					if (m) {
+						groupMetadataCache.set(from, m);
 						if (typeof cache?.set === "function") {
-							cache.set(from + ":groupMetadata", groupMetadata, 60 * 60);
+							cache.set(from + ":groupMetadata", m, 60 * 60);
 						}
 					}
-				} catch (e) {
-					console.error("Group metadata fetch failed:", e.message);
-					groupMetadata = { participants: [], subject: from };
-				}
-			} else if (!groupMetadata) {
-				groupMetadata = { participants: [], subject: from };
+				}).catch(() => {});
 			}
 		}
```

```diff
diff --git a/functions/getMessagesEvent.js b/functions/getMessagesEvent.js
@@ -558,63 +558,63 @@ const getCommand = async (sock, msg, cache) => {
 		logCommandEvent(command, senderJid, isGroup ? (groupData?.grpName || from) : null);
 
-		if (commandsPublic[command]) {
+		const COMMAND_TIMEOUT_MS = 30000;
+		const runHandler = async (handlerFn, label) => {
 			const t0 = Date.now();
-			const result = await commandsPublic[command](sock, msg, from, args, msgInfoObj);
-			const t1 = Date.now();
-			console.log(`[PROFILE] Command '${command}' (public) took ${t1 - t0}ms`);
-			return result;
+			try {
+				const result = await Promise.race([
+					handlerFn(),
+					new Promise((_, reject) =>
+						setTimeout(() => reject(new Error(`Command timeout: '${command}' (${label}) exceeded ${COMMAND_TIMEOUT_MS / 1000}s`)), COMMAND_TIMEOUT_MS)
+					),
+				]);
+				const t1 = Date.now();
+				console.log(`[PROFILE] Command '${command}' (${label}) took ${t1 - t0}ms`);
+				return result;
+			} catch (err) {
+				if (err.message && err.message.includes("Command timeout")) {
+					console.error(`[WATCHDOG] ${err.message}`);
+					await sendMessageWTyping(from, { text: `...` }, { quoted: msg }).catch(() => {});
+				}
+				throw err;
+			}
+		};
+
+		if (commandsPublic[command]) {
+			return runHandler(() => commandsPublic[command](sock, msg, from, args, msgInfoObj), "public");
```

```diff
diff --git a/functions/messageQueue.js b/functions/messageQueue.js
@@ -4,8 +4,10 @@ class MessageQueue {
 		this.processing = new Map();
 		this.messageDelay = 0;
 		this.groupMessageDelay = 0;
-		this.maxConcurrent = 25;
-		this.activeSends = 0;
+		this.maxConcurrent = 25;
+		this.totalActiveSends = 0;
+		this.activeSendsByChat = new Map();
+		this.perChatMax = 5;
```

## Global Constraints for Task 1
- All commands must respond within 5 seconds for text commands
- No silent failures — error messages must always reach the user
- Message queue must limit sends per-chat to 5, allow 25 total concurrent sends
- Group metadata fetch must never block command execution
- Command response timeout watchdog at 30 seconds
- Chatbot commands must not double-reply (add `return` after chat() calls)
- All modified files must pass `node --check` syntax validation

## Review Instructions
You are reviewing Task 1 (bot response pipeline) for:
1. **Spec compliance**: Does the implementation match every requirement in the brief?
2. **Code quality**: Is the code clean, well-structured, and free of obvious bugs?
3. **Regression risk**: Does this change break existing functionality?

Return: SPEC_STATUS (COMPLIANT/PARTIAL/NON_COMPLIANT), verdict (APPROVED/NEEDS_FIXES), findings list with severity (Critical/Important/Minor), and one-line summary.
