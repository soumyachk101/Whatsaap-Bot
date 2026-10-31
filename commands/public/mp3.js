import fs from "fs";
import path from "path";
import yts from "yt-search";
import { downloadViaCobalt, CobaltDownloadError, isSafeUrl, sanitizeYtDlpError } from "../../functions/cobaltHelper.js";
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

const extractUrl = (text) => {
	if (!text) return null;
	const match = text.match(/https?:\/\/[^\s]+/i);
	if (match) return match[0];

	// Check for URL without http(s) prefix (e.g., youtube.com/watch?v=..., youtu.be/...)
	const words = text.trim().split(/\s+/);
	for (const word of words) {
		const cleaned = word.replace(/^[<(\[]|[>)\].,;]$/g, "");
		if (
			/^(?:www\.|[a-zA-Z0-9-]+\.(?:com|org|net|io|co|be|app|me|tv|ai|gg|cc|ly|in|it|to|is))\b/i.test(cleaned) ||
			/^(?:youtu\.be|youtube\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|facebook\.com|fb\.watch|pin\.it|pinterest\.com|spotify\.com|soundcloud\.com)/i.test(cleaned)
		) {
			const candidate = `https://${cleaned}`;
			if (isValidHttpUrl(candidate)) {
				return candidate;
			}
		}
	}
	return null;
};

const findVideoURL = async (query) => {
	try {
		const r = await yts(query);
		if (!r) return null;

		let video = null;
		if (Array.isArray(r.videos) && r.videos.length > 0) {
			video = r.videos[0];
		} else if (Array.isArray(r.all) && r.all.length > 0) {
			video = r.all.find((item) => item.type === "video") || null;
		} else if (r.type === "video") {
			video = r;
		}

		if (video) {
			const videoUrl = video.url || (video.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : null);
			if (videoUrl) {
				return {
					...video,
					url: videoUrl,
					title: video.title || query,
				};
			}
		}
		return null;
	} catch (err) {
		console.error("[MP3] YTS Search Error:", err.message);
		return null;
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, evv } = msgInfoObj;

	let input = (evv ? evv.trim() : "") || (args && args.length > 0 ? args.join(" ").trim() : "");
	if (!input && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		input = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!input) {
		return sendMessageWTyping(
			from,
			{
				text:
					`🎵 *MP3 & Audio Downloader*\n\n` +
					`Download high quality audio from link or search query!\n\n` +
					`💡 *Usage:*\n` +
					`• Direct Link: \`${prefix}${command} https://youtube.com/watch?v=xxx\`\n` +
					`• Search & Download: \`${prefix}${command} <song name>\`\n` +
					`• Or reply to any link with \`${prefix}${command}\``,
			},
			{ quoted: msg }
		);
	}

	let targetUrl = extractUrl(input);

	if (!targetUrl) {
		const searchResult = await findVideoURL(input);
		if (!searchResult || !searchResult.url) {
			return sendMessageWTyping(from, { text: `❌ *No audio found for:* \`${input}\`` }, { quoted: msg });
		}
		targetUrl = searchResult.url;

		if (!(await isSafeUrl(targetUrl))) {
			return sendMessageWTyping(from, { text: "❌ Unsafe URL. Only public links are supported." }, { quoted: msg });
		}
	} else {
		if (!(await isSafeUrl(targetUrl))) {
			return sendMessageWTyping(from, { text: "❌ Unsafe URL. Only public links are supported." }, { quoted: msg });
		}
	}

	if (!isValidHttpUrl(targetUrl)) {
		return sendMessageWTyping(from, { text: `❌ *Invalid URL.* Please provide a valid HTTP/HTTPS link.` }, { quoted: msg });
	}

	let acquired = false;
	let downloadedPaths = [];

	try {
		await downloadQueue.acquire(from);
		acquired = true;

		downloadedPaths = await downloadViaCobalt(targetUrl, null, true, msgInfoObj?.signal || null, () => downloadQueue.heartbeat(from));

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Audio file was not downloaded from servers.");
		}
		const downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		const stats = await fs.promises.stat(downloadPath);
		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		const sizeMB = stats.size / (1024 * 1024);
		if (sizeMB > 200) {
			throw new Error(`Audio file too large for WhatsApp (${sizeMB.toFixed(1)}MB). Limit: 200MB.`);
		}

		memoryManager.markFileReady(downloadPath);

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
				const docPayload = sizeMB <= 30 && fs.existsSync(downloadPath)
					? { document: fs.readFileSync(downloadPath), fileName: path.basename(downloadPath) || "audio.mp3", mimetype: mime }
					: { document: { url: downloadPath }, fileName: path.basename(downloadPath) || "audio.mp3", mimetype: mime };
				await sendAudioSafely(docPayload, null);
				memoryManager.markFileSent(downloadPath);
			} catch (docErr) {
				console.error("[MP3] Document fallback also failed:", docErr.message);
				throw new Error("Failed to send audio to WhatsApp. Please try again.");
			}
		}
	} catch (error) {
		console.error("MP3 Download Error:", error.message);
		const clean = sanitizeYtDlpError(error.message, error.code);
		const userMsg = clean.startsWith("❌") ? clean : `❌ ${clean}`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg }).catch(() => {});
		error.userNotified = true;
		throw error;
	} finally {
		if (acquired) {
			downloadQueue.release();
		}
		if (downloadedPaths && downloadedPaths.length > 0) {
			setTimeout(() => {
				for (const p of downloadedPaths) {
					if (fs.existsSync(p)) memoryManager.safeUnlink(p);
				}
			}, 12000);
		}
	}
};

export default () => ({
	cmd: ["mp3", "audio"],
	desc: "Download high quality audio via link or search",
	usage: "mp3 <link or search>",
	handler,
});
