import fs from "fs";
import path from "path";
import { downloadViaCobalt, CobaltDownloadError, sanitizeYtDlpError } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import downloadQueue from "../../functions/downloadQueue.js";

const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, evv } = msgInfoObj;

	let url = args[0] || (evv ? evv.trim().split(/\s+/)[0] : "");
	if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		const quotedText = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
		const match = quotedText.match(/https?:\/\/[^\s]+/i);
		if (match) url = match[0];
	}

	if (!url) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please provide a media link!*\n\nExample: \`${prefix}${command} https://youtube.com/watch?v=xxx\` or reply to a link.` },
			{ quoted: msg }
		);
	}

	if (!isValidHttpUrl(url)) {
		return sendMessageWTyping(from, { text: `❌ *Invalid URL.* Please provide a valid HTTP/HTTPS link.` }, { quoted: msg });
	}

	let acquired = false;
	let downloadPath = null;

	try {
		await downloadQueue.acquire(from);
		acquired = true;

		const downloadedPaths = await downloadViaCobalt(url, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Audio file was not downloaded from servers.");
		}
		downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		const stats = await fs.promises.stat(downloadPath);
		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		const mime = downloadPath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";

		const sendAudioSafely = async (payload, quotedMsg) => {
			const sendOpts = { useCachedGroupMetadata: true };
			if (quotedMsg) {
				try {
					return await sock.sendMessage(from, payload, { ...sendOpts, quoted: quotedMsg });
				} catch (qErr) {
					console.warn(`[MP3] Quoted audio send failed (${qErr.message}), retrying unquoted...`);
				}
			}
			return await sock.sendMessage(from, payload, sendOpts);
		};

		const sizeMB = stats.size / (1024 * 1024);
		try {
			if (sizeMB <= 30) {
				const buf = fs.readFileSync(downloadPath);
				await sendAudioSafely({ audio: buf, mimetype: mime, ptt: false }, msg);
			} else {
				await sendAudioSafely({ audio: { url: downloadPath }, mimetype: mime, ptt: false }, msg);
			}
			memoryManager.markFileSent(downloadPath);
		} catch (sendErr) {
			console.error("[MP3] Audio send failed, trying document fallback:", sendErr.message);
			try {
				await sendAudioSafely(
					{
						document: { url: downloadPath },
						fileName: path.basename(downloadPath) || "audio.mp3",
						mimetype: mime,
					},
					null
				);
				memoryManager.markFileSent(downloadPath);
			} catch (docErr) {
				console.error("[MP3] Document fallback also failed:", docErr.message);
				throw new Error("Failed to send audio to WhatsApp. Please try again.");
			}
		}
	} catch (error) {
		console.error("MP3 Download Error:", error.message);
		const clean = sanitizeYtDlpError(error.message);
		const userMsg = clean.startsWith("❌") ? clean : `❌ ${clean}`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
	} finally {
		if (downloadPath) {
			setTimeout(() => {
				if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
			}, 15000);
		}
		if (acquired) {
			downloadQueue.release();
		}
	}
};

export default () => ({
	cmd: ["mp3", "audio"],
	desc: "Download high quality audio via link",
	usage: "mp3 <link>",
	handler,
});
