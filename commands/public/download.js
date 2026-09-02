import fs from "fs";
import yts from "yt-search";
import { fileTypeFromFile } from "file-type";
import memoryManager from "../../functions/memoryUtils.js";
import { downloadViaCobalt } from "../../functions/cobaltHelper.js";
import { isValidVideoFile } from "../../functions/fileUtils.js";

const extractUrl = (text) => {
	if (!text) return null;
	const match = text.match(/https?:\/\/[^\s]+/i);
	return match ? match[0] : null;
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
	let videoMeta = null;

	if (!targetUrl) {
		// Not a direct URL -> Search YouTube
		await sendMessageWTyping(from, { text: `🔍 *Searching for:* \`${inputQuery}\`...` }, { quoted: msg });
		videoMeta = await findVideoURL(inputQuery);
		if (!videoMeta || !videoMeta.url) {
			return sendMessageWTyping(from, { text: `❌ *No video found for:* \`${inputQuery}\`` }, { quoted: msg });
		}
		targetUrl = videoMeta.url;
	}

	let downloadedPaths = [];
	try {
		downloadedPaths = await downloadViaCobalt(targetUrl, null, false);
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Could not download media from link.");
		}

		for (const filePath of downloadedPaths) {
			if (!fs.existsSync(filePath)) continue;

			const stats = await fs.promises.stat(filePath);
			const fileSizeMB = stats.size / (1024 * 1024);

			if (fileSizeMB > 95) {
				await sendMessageWTyping(
					from,
					{ text: `⚠️ File is too large to send on WhatsApp (${fileSizeMB.toFixed(2)}MB). Limit is 95MB.` },
					{ quoted: msg }
				);
				continue;
			}

			const mediaInfo = await detectMediaFileType(filePath);

			if (mediaInfo.detected === "video") {
				await sock.sendMessage(
					from,
					{
						video: { url: filePath },
						mimetype: "video/mp4",
					},
					{ quoted: msg }
				);
			} else if (mediaInfo.detected === "image") {
				await sock.sendMessage(
					from,
					{
						image: { url: filePath },
					},
					{ quoted: msg }
				);
			} else if (mediaInfo.detected === "audio") {
				await sock.sendMessage(
					from,
					{
						audio: { url: filePath },
						mimetype: "audio/mp4",
						ptt: false,
					},
					{ quoted: msg }
				);
			} else {
				await sock.sendMessage(
					from,
					{
						document: { url: filePath },
						fileName: `media.${mediaInfo.ext}`,
						mimetype: mediaInfo.mime,
					},
					{ quoted: msg }
				);
			}
			await new Promise((res) => setTimeout(res, 500));
		}
	} catch (err) {
		console.error("[Universal DL] Download Error:", err);
		return sendMessageWTyping(
			from,
			{ text: `❌ *Download failed!* Couldn't fetch media right now: ${err.message}` },
			{ quoted: msg }
		);
	} finally {
		if (downloadedPaths && downloadedPaths.length > 0) {
			downloadedPaths.forEach((p) => {
				if (fs.existsSync(p)) memoryManager.safeUnlink(p);
			});
		}
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
