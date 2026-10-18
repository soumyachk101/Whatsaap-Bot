import fs from "fs";
import yts from "yt-search";
import { downloadViaCobalt, CobaltDownloadError, isSafeUrl, sanitizeYtDlpError } from "../../../functions/cobaltHelper.js";
import memoryManager from "../../../functions/memoryUtils.js";
import downloadQueue from "../../../functions/downloadQueue.js";

const findSongURL = async (name) => {
	try {
		const r = await yts(`${name}`);
		if (r && Array.isArray(r.videos) && r.videos.length > 0) {
			const videoInfo = r.videos[0];
			if (!videoInfo || !videoInfo.url) {
				throw new Error("No video URL found in search results");
			}
			return videoInfo;
		}
		if (r && r.type === "video") {
			const videoInfo = r;
			if (!videoInfo || !videoInfo.url) {
				throw new Error("No video URL found in search results");
			}
			return videoInfo;
		}
		throw new Error("No results found");
	} catch (error) {
		console.error("Search error:", error);
		throw new Error(error.message || "Failed to search for song");
	}
};

const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { evv, prefix, sendMessageWTyping } = msgInfoObj;

	let songQuery = evv ? evv.trim() : "";
	if (!songQuery && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		songQuery = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!songQuery) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please enter a song name or audio link!*\n\nExample: \`${prefix}song Kesariya\` or reply to a song link/name.` },
			{ quoted: msg }
		);
	}

	console.log("Song request query:", songQuery);

	let acquired = false;
	let fileDown = null;

	try {
		await downloadQueue.acquire(from);
		acquired = true;

		let URL = "";
		let title = "Audio Track";
		let durationText = "";

		const isDirectUrl = songQuery.startsWith("http://") || songQuery.startsWith("https://");

		if (isDirectUrl) {
			URL = songQuery;
			if (!isValidHttpUrl(URL)) {
				return sendMessageWTyping(from, { text: `❌ *Invalid URL.* Please provide a valid link.` }, { quoted: msg });
			}
		} else {
			try {
				const videoInfo = await findSongURL(songQuery);
				URL = videoInfo.url;
				title = videoInfo.title || songQuery;
				durationText = videoInfo.timestamp ? ` (${videoInfo.timestamp})` : "";
				// SSRF: validate search-result URL
				if (!(await isSafeUrl(URL))) {
					return sendMessageWTyping(from, { text: `❌ Unsafe URL found for: *${songQuery}*. Try another.` }, { quoted: msg });
				}
			} catch (searchError) {
				console.error("Search failed:", searchError);
				return sendMessageWTyping(from, { text: `❌ No songs found for: *${songQuery}*` }, { quoted: msg });
			}
		}

		const downloadedPaths = await downloadViaCobalt(URL, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Failed to download audio from stream servers.");
		}
		fileDown = downloadedPaths[0];

		if (!fs.existsSync(fileDown)) {
			throw new Error("Audio file was not created on disk.");
		}

		const stats = await fs.promises.stat(fileDown);

		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		const fileSizeMB = stats.size / 1024 / 1024;
		if (fileSizeMB > 200) {
			throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 200MB)`);
		}

		const sendAudioSafely = async (payload, quotedMsg) => {
			const sendOpts = { useCachedGroupMetadata: true };
			if (quotedMsg) {
				try {
					return await sock.sendMessage(from, payload, { ...sendOpts, quoted: quotedMsg });
				} catch (qErr) {
					console.warn(`[Song] Quoted send failed (${qErr.message}), retrying unquoted...`);
				}
			}
			return await sock.sendMessage(from, payload, sendOpts);
		};

		try {
			const mime = fileDown.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
			await sendAudioSafely(
				{
					audio: { url: fileDown },
					mimetype: mime,
					ptt: false,
				},
				msg
			);
			memoryManager.markFileSent(fileDown);
		} catch (sendErr) {
			console.error("[Song] Send with URL failed, trying buffer/stream fallback:", sendErr.message);
			const mime = fileDown.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";
			try {
				if (fileSizeMB <= 35) {
					const buf = fs.readFileSync(fileDown);
					await sendAudioSafely({ audio: buf, mimetype: mime, ptt: false }, null);
				} else {
					const readStream = memoryManager.createOptimizedReadStream(fileDown);
					await sendAudioSafely({ audio: readStream, mimetype: mime, ptt: false }, null);
				}
				memoryManager.markFileSent(fileDown);
			} catch (fallbackErr) {
				console.error("[Song] Audio fallback failed, trying document fallback:", fallbackErr.message);
				try {
					await sendAudioSafely({
						document: { url: fileDown },
						fileName: `${title || "song"}.mp3`,
						mimetype: "audio/mpeg"
					}, null);
					memoryManager.markFileSent(fileDown);
				} catch (docErr) {
					console.error("[Song] Document fallback also failed:", docErr.message);
					await sendMessageWTyping(from, { text: "❌ Failed to upload song file. Please try again later." }, { quoted: msg });
				}
			}
		}
	} catch (err) {
		console.error("Song download error:", err.message);
		const clean = sanitizeYtDlpError(err.message);
		const userMsg = clean.startsWith("❌") ? clean : `❌ ${clean}`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
	} finally {
		if (fileDown) {
			setTimeout(() => {
				if (fs.existsSync(fileDown)) memoryManager.safeUnlink(fileDown);
			}, 60000);
		}
		if (acquired) {
			downloadQueue.release();
		}
	}
};

export default () => ({
	cmd: ["song", "play"],
	desc: "Download song audio",
	usage: "song <song name or link>",
	handler,
});
