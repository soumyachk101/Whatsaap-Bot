import fs from "fs";
import yts from "yt-search";
import { fileTypeFromFile } from "file-type";
import memoryManager from "../../functions/memoryUtils.js";
import { downloadViaCobalt, CobaltDownloadError, isSafeUrl } from "../../functions/cobaltHelper.js";
import { isValidVideoFile } from "../../functions/fileUtils.js";
import downloadQueue from "../../functions/downloadQueue.js";

const extractUrl = (text) => {
	if (!text) return null;
	const match = text.match(/https?:\/\/[^\s]+/i);
	return match ? match[0] : null;
};

const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

const findVideoURL = async (query) => {
	try {
		const r = await yts(query);
		if (r && r.videos && r.videos.length > 0) {
			return r.videos[0];
		}
		if (r && r.type === "video") {
			return r;
		}
		return null;
	} catch (err) {
		console.error("[Universal DL] YTS Search Error:", err.message);
		return null;
	}
};

const detectMediaFileType = async (filePath) => {
	try {
		const type = await fileTypeFromFile(filePath);
		if (type) {
			let detected = "other";
			if (type.mime.startsWith("video/")) {
				detected = "video";
			} else if (type.mime.startsWith("image/")) {
				if (filePath.toLowerCase().endsWith(".mp4") && isValidVideoFile(filePath)) {
					detected = "video";
				} else {
					detected = "image";
				}
			} else if (type.mime.startsWith("audio/")) {
				detected = "audio";
			} else if (isValidVideoFile(filePath) || filePath.toLowerCase().endsWith(".mp4")) {
				detected = "video";
			}
			return { ext: type.ext, mime: type.mime, detected };
		}
		const lower = filePath.toLowerCase();
		if (isValidVideoFile(filePath) || lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
			return { ext: "mp4", mime: "video/mp4", detected: "video" };
		}
		if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
			return { ext: "jpg", mime: "image/jpeg", detected: "image" };
		}
		if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav")) {
			return { ext: "mp3", mime: "audio/mp4", detected: "audio" };
		}
		return { ext: "bin", mime: "application/octet-stream", detected: "other" };
	} catch (err) {
		return { ext: "bin", mime: "application/octet-stream", detected: "other" };
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, evv } = msgInfoObj;

	let queueResult;
	try {
		queueResult = await downloadQueue.acquire(from);
	} catch (qErr) {
		return sendMessageWTyping(from, { text: "❌ Server busy. Try again later." }, { quoted: msg });
	}

	let inputQuery = evv ? evv.trim() : "";
	if (!inputQuery && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		inputQuery = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!inputQuery) {
		return sendMessageWTyping(
			from,
			{
				text: `📥 *Universal Downloader*\n\n` +
					`Download videos & media from ANY platform using 1 command!\n\n` +
					`💡 *Usage:*\n` +
					`• Direct Link: \`${prefix}download <URL>\`\n` +
					`• Search & Download: \`${prefix}download <video/song name>\`\n\n` +
					`🌐 *Supported:* YouTube, Instagram, Facebook, Twitter/X, TikTok, Pinterest, etc.`,
			},
			{ quoted: msg }
		);
	}

	let targetUrl = extractUrl(inputQuery);

	if (!targetUrl) {
		const videoMeta = await findVideoURL(inputQuery);
		if (!videoMeta || !videoMeta.url) {
			return sendMessageWTyping(from, { text: `❌ *No video found for:* \`${inputQuery}\`` }, { quoted: msg });
		}
		targetUrl = videoMeta.url;

		// SSRF: validate search-result URLs too
		if (!(await isSafeUrl(targetUrl))) {
			return sendMessageWTyping(from, { text: "❌ Unsafe URL. Only public links are supported." }, { quoted: msg });
		}
	}

	try {
		const u = new URL(targetUrl);
		if (!["http:", "https:"].includes(u.protocol)) throw new Error("Invalid protocol");
	} catch {
		return sendMessageWTyping(from, { text: "❌ Invalid URL. Please send a valid https:// link." }, { quoted: msg });
	}

	let downloadedPaths = [];
	try {
		downloadedPaths = await downloadViaCobalt(targetUrl, null, false);
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Could not download media from link.");
		}

		const validFiles = [];
		for (const filePath of downloadedPaths) {
			if (!fs.existsSync(filePath)) continue;
			const stats = await fs.promises.stat(filePath);
			const fileSizeMB = stats.size / (1024 * 1024);

			if (fileSizeMB > 95) {
				await sendMessageWTyping(
					from,
					{ text: `⚠️ File too large for WhatsApp (${fileSizeMB.toFixed(1)}MB). Limit: 95MB. Skipping.` },
					{ quoted: msg }
				);
				memoryManager.safeUnlink(filePath);
				continue;
			}
			if (stats.size === 0) {
				memoryManager.safeUnlink(filePath);
				continue;
			}
			validFiles.push(filePath);
		}

		if (validFiles.length === 0) {
			throw new Error("All downloaded files were too large or empty.");
		}

		for (const filePath of validFiles) {
			if (!fs.existsSync(filePath)) continue;
			memoryManager.markFileReady(filePath);
			const mediaInfo = await detectMediaFileType(filePath);

			try {
				if (mediaInfo.detected === "video") {
					await sock.sendMessage(from, { video: { url: filePath }, mimetype: "video/mp4" }, { quoted: msg });
				} else if (mediaInfo.detected === "image") {
					await sock.sendMessage(from, { image: { url: filePath } }, { quoted: msg });
				} else if (mediaInfo.detected === "audio") {
					const mime = filePath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
					await sock.sendMessage(from, { audio: { url: filePath }, mimetype: mime, ptt: false }, { quoted: msg });
				} else {
					await sock.sendMessage(from, { document: { url: filePath }, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime }, { quoted: msg });
				}
				memoryManager.markFileSent(filePath);
			} catch (sendErr) {
				console.error("[Universal DL] Send error with URL, trying buffer fallback:", sendErr.message);
				try {
					const buf = fs.readFileSync(filePath);
					if (mediaInfo.detected === "video") {
						await sock.sendMessage(from, { video: buf, mimetype: "video/mp4" }, { quoted: msg });
					} else if (mediaInfo.detected === "audio") {
						const mime = filePath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
						await sock.sendMessage(from, { audio: buf, mimetype: mime, ptt: false }, { quoted: msg });
					} else if (mediaInfo.detected === "image") {
						await sock.sendMessage(from, { image: buf }, { quoted: msg });
					} else {
						await sock.sendMessage(from, { document: buf, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime }, { quoted: msg });
					}
					memoryManager.markFileSent(filePath);
				} catch (bufErr) {
					console.error("[Universal DL] Buffer send fallback error:", bufErr.message);
					await sendMessageWTyping(from, { text: "❌ Failed to upload media file. Please try again." }, { quoted: msg });
				}
			}
			await new Promise((res) => setTimeout(res, 500));
		}
	} catch (err) {
		console.error("[Universal DL] Error:", err);
		const userMsg = err.message?.includes("cancelled") ? "❌ Download was cancelled."
			: err.message?.includes("Invalid URL") ? "❌ Invalid URL provided."
			: `❌ Download failed. Please try again later.`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
	} finally {
		// Wait 8s to ensure Baileys finishes streaming file to WhatsApp servers before unlinking
		await new Promise((res) => setTimeout(res, 8000));
		for (const p of downloadedPaths) {
			if (fs.existsSync(p)) memoryManager.safeUnlink(p);
		}
		downloadQueue.release();
	}
};

export default () => ({
	cmd: [
		"download", "dl", "d", "v", "video", "mp4",
		"yt", "ytv", "vs",
		"insta", "i",
		"fb", "facebook", "fbdl",
		"twitter", "tw", "x",
		"pin", "tiktok", "tt"
	],
	desc: "Universal downloader (Short commands: #dl | #d | #v)",
	usage: "dl | d | v | download <url or search>",
	handler,
});
