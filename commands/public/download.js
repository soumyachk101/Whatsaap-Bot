import fs from "fs";
import path from "path";
import yts from "yt-search";
import { fileTypeFromFile } from "file-type";
import memoryManager from "../../functions/memoryUtils.js";
import { downloadViaCobalt, CobaltDownloadError, isSafeUrl, sanitizeYtDlpError } from "../../functions/cobaltHelper.js";
import { isValidVideoFile } from "../../functions/fileUtils.js";
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
		if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp")) {
			return { ext: "jpg", mime: "image/jpeg", detected: "image" };
		}
		if (
			lower.endsWith(".mp3") ||
			lower.endsWith(".m4a") ||
			lower.endsWith(".wav") ||
			lower.endsWith(".ogg") ||
			lower.endsWith(".opus") ||
			lower.endsWith(".aac") ||
			lower.endsWith(".flac")
		) {
			return { ext: "mp3", mime: "audio/mp4", detected: "audio" };
		}
		return { ext: "bin", mime: "application/octet-stream", detected: "other" };
	} catch (err) {
		return { ext: "bin", mime: "application/octet-stream", detected: "other" };
	}
};

const sendMediaSafely = async (sock, from, payload, quotedMsg) => {
	const sendOpts = { useCachedGroupMetadata: true };
	if (quotedMsg) {
		try {
			return await sock.sendMessage(from, payload, { ...sendOpts, quoted: quotedMsg });
		} catch (qErr) {
			console.warn(`[Universal DL] Quoted send failed (${qErr.message}), retrying unquoted...`);
		}
	}
	return await sock.sendMessage(from, payload, sendOpts);
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, evv } = msgInfoObj;

	let inputQuery = (evv ? evv.trim() : "") || (args && args.length > 0 ? args.join(" ").trim() : "");
	if (!inputQuery && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		inputQuery = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!inputQuery) {
		return sendMessageWTyping(
			from,
			{
				text:
					`📥 *Universal Downloader*\n\n` +
					`Download videos & media from ANY platform using 1 command!\n\n` +
					`💡 *Usage:*\n` +
					`• Direct Link: \`${prefix}${command || "download"} <URL>\`\n` +
					`• Audio / MP3: \`${prefix}${command || "download"} <URL or name> mp3\`\n` +
					`• Search & Download: \`${prefix}${command || "download"} <video/song name>\`\n\n` +
					`🌐 *Supported:* YouTube, Instagram, Facebook, Twitter/X, TikTok, Pinterest, etc.`,
			},
			{ quoted: msg }
		);
	}

	let isAudioOnly = ["mp3", "audio", "song", "yta"].includes(command?.toLowerCase());

	// Detect audio download triggers from input query or args
	if (/\b(?:--mp3|--audio|-a)\b/i.test(inputQuery)) {
		isAudioOnly = true;
		inputQuery = inputQuery.replace(/\b(?:--mp3|--audio|-a)\b/gi, "").trim();
	} else if (/^(?:mp3|audio)\s+/i.test(inputQuery)) {
		isAudioOnly = true;
		inputQuery = inputQuery.replace(/^(?:mp3|audio)\s+/i, "").trim();
	} else if (/\s+(?:mp3|audio)$/i.test(inputQuery)) {
		isAudioOnly = true;
		inputQuery = inputQuery.replace(/\s+(?:mp3|audio)$/i, "").trim();
	} else if (inputQuery.toLowerCase() === "mp3" || inputQuery.toLowerCase() === "audio") {
		isAudioOnly = true;
		inputQuery = "";
	}

	let targetUrl = extractUrl(inputQuery);

	if (targetUrl) {
		const remaining = inputQuery.replace(targetUrl, "").trim();
		if (/\b(?:mp3|audio)\b/i.test(remaining)) {
			isAudioOnly = true;
		}
		// SSRF: validate direct URL
		if (!(await isSafeUrl(targetUrl))) {
			return sendMessageWTyping(from, { text: "❌ Unsafe URL. Only public links are supported." }, { quoted: msg });
		}
	} else {
		if (!inputQuery) {
			return sendMessageWTyping(from, { text: "❌ *Please provide a URL or search query!*" }, { quoted: msg });
		}
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

	if (!isValidHttpUrl(targetUrl)) {
		return sendMessageWTyping(from, { text: "❌ Invalid URL. Please send a valid https:// link." }, { quoted: msg });
	}

	let acquired = false;
	let downloadedPaths = [];
	try {
		await downloadQueue.acquire(from);
		acquired = true;

		downloadedPaths = await downloadViaCobalt(targetUrl, null, isAudioOnly, msgInfoObj?.signal || null, () => downloadQueue.heartbeat(from));
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Could not download media from link.");
		}

		const validFiles = [];
		for (const filePath of downloadedPaths) {
			if (!fs.existsSync(filePath)) continue;
			const stats = await fs.promises.stat(filePath);
			const fileSizeMB = stats.size / (1024 * 1024);

			if (fileSizeMB > 200) {
				await sendMessageWTyping(
					from,
					{ text: `⚠️ File too large for WhatsApp (${fileSizeMB.toFixed(1)}MB). Limit: 200MB. Skipping.` },
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
			const isAudio = isAudioOnly || mediaInfo.detected === "audio";
			const stats = await fs.promises.stat(filePath).catch(() => ({ size: 0 }));
			const sizeMB = stats.size / (1024 * 1024);

			try {
				if (isAudio) {
					const mime = filePath.toLowerCase().endsWith(".mp3")
						? "audio/mpeg"
						: mediaInfo.mime?.startsWith("audio/")
						? mediaInfo.mime
						: "audio/mp4";
					if (sizeMB <= 30) {
						const audioBuf = fs.readFileSync(filePath);
						await sendMediaSafely(sock, from, { audio: audioBuf, mimetype: mime, ptt: false }, msg);
					} else {
						await sendMediaSafely(sock, from, { audio: { url: filePath }, mimetype: mime, ptt: false }, msg);
					}
				} else if (mediaInfo.detected === "video") {
					if (sizeMB <= 35) {
						const videoBuf = fs.readFileSync(filePath);
						await sendMediaSafely(sock, from, { video: videoBuf, mimetype: "video/mp4" }, msg);
					} else {
						await sendMediaSafely(sock, from, { video: { url: filePath }, mimetype: "video/mp4" }, msg);
					}
				} else if (mediaInfo.detected === "image") {
					if (sizeMB <= 15) {
						const imgBuf = fs.readFileSync(filePath);
						await sendMediaSafely(sock, from, { image: imgBuf }, msg);
					} else {
						await sendMediaSafely(sock, from, { image: { url: filePath } }, msg);
					}
				} else {
					await sendMediaSafely(
						sock,
						from,
						{ document: { url: filePath }, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime },
						msg
					);
				}
				memoryManager.markFileSent(filePath);
			} catch (sendErr) {
				console.error("[Universal DL] Send error, trying stream-based buffer fallback:", sendErr.message);
				let fallbackStats;
				try {
					fallbackStats = await fs.promises.stat(filePath);
				} catch (_) {
					fallbackStats = { size: 0 };
				}
				const fallbackMB = fallbackStats.size / (1024 * 1024);
				if (fallbackMB > 200) {
					console.warn(`[Universal DL] Buffer fallback skipped: ${fallbackMB.toFixed(1)}MB exceeds 200MB limit.`);
					await sendMessageWTyping(
						from,
						{ text: `⚠️ File too large for direct upload (${fallbackMB.toFixed(1)}MB). Limit: 200MB. Please try again later.` },
						{ quoted: msg }
					);
					continue;
				}
				try {
					const readStream = memoryManager.createOptimizedReadStream(filePath);
					if (isAudio) {
						const mime = filePath.toLowerCase().endsWith(".mp3")
							? "audio/mpeg"
							: mediaInfo.mime?.startsWith("audio/")
							? mediaInfo.mime
							: "audio/mp4";
						await sendMediaSafely(sock, from, { audio: readStream, mimetype: mime, ptt: false }, null);
					} else if (mediaInfo.detected === "video") {
						await sendMediaSafely(sock, from, { video: readStream, mimetype: "video/mp4" }, null);
					} else if (mediaInfo.detected === "image") {
						await sendMediaSafely(sock, from, { image: readStream }, null);
					} else {
						await sendMediaSafely(
							sock,
							from,
							{ document: readStream, fileName: `media.${mediaInfo.ext}`, mimetype: mediaInfo.mime },
							null
						);
					}
					memoryManager.markFileSent(filePath);
				} catch (fallbackErr) {
					console.error("[Universal DL] Media send failed, trying document fallback (up to 200MB/2GB):", fallbackErr.message);
					try {
						const isDocAudio = isAudioOnly || mediaInfo.detected === "audio";
						const docMime = isDocAudio
							? filePath.toLowerCase().endsWith(".mp3")
								? "audio/mpeg"
								: mediaInfo.mime?.startsWith("audio/")
								? mediaInfo.mime
								: "audio/mp4"
							: mediaInfo.mime || "application/octet-stream";
						const ext = isDocAudio ? (filePath.toLowerCase().endsWith(".mp3") ? "mp3" : "m4a") : mediaInfo.ext || "mp4";
						const docPayload =
							sizeMB <= 30 && fs.existsSync(filePath)
								? { document: fs.readFileSync(filePath), fileName: path.basename(filePath) || `media.${ext}`, mimetype: docMime }
								: { document: { url: filePath }, fileName: path.basename(filePath) || `media.${ext}`, mimetype: docMime };
						await sendMediaSafely(sock, from, docPayload, null);
						memoryManager.markFileSent(filePath);
					} catch (docErr) {
						console.error("[Universal DL] Document fallback also failed:", docErr.message);
						await sendMessageWTyping(from, { text: "❌ Failed to upload media file. Please try again later." }, { quoted: msg });
					}
				}
			}
			await new Promise((res) => setTimeout(res, 500));
		}
	} catch (err) {
		console.error("[Universal DL] Error:", err.message);
		let clean = sanitizeYtDlpError(err.message);
		let userMsg = clean.startsWith("❌") ? clean : `❌ ${clean}`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg }).catch(() => {});
		err.userNotified = true;
		throw err;
	} finally {
		if (acquired) {
			downloadQueue.release();
		}
		if (downloadedPaths && downloadedPaths.length > 0) {
			setTimeout(() => {
				for (const p of downloadedPaths) {
					if (fs.existsSync(p)) memoryManager.safeUnlink(p);
				}
			}, 10000);
		}
	}
};

export default () => ({
	cmd: [
		"download",
		"dl",
		"d",
		"v",
		"video",
		"mp4",
		"yt",
		"ytv",
		"vs",
		"insta",
		"i",
		"fb",
		"facebook",
		"fbdl",
		"twitter",
		"tw",
		"x",
		"pin",
		"tiktok",
		"tt",
	],
	desc: "Universal downloader (Short commands: #dl | #d | #v)",
	usage: "dl | d | v | download <url or search>",
	handler,
});
