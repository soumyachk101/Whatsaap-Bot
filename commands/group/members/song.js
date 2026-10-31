import fs from "fs";
import path from "path";
import yts from "yt-search";
import { downloadViaCobalt, CobaltDownloadError, isSafeUrl, sanitizeYtDlpError } from "../../../functions/cobaltHelper.js";
import memoryManager from "../../../functions/memoryUtils.js";
import downloadQueue from "../../../functions/downloadQueue.js";

const findSongURL = async (name) => {
	if (!name || typeof name !== "string" || !name.trim()) {
		throw new Error("No search query provided");
	}
	try {
		const r = await yts(name.trim());
		if (!r) {
			throw new Error("No search results returned from YouTube");
		}
		if (Array.isArray(r.videos) && r.videos.length > 0) {
			const videoInfo = r.videos.find((v) => v && (v.url || v.videoId));
			if (!videoInfo) {
				throw new Error("No video URL found in search results");
			}
			const url = videoInfo.url || (videoInfo.videoId ? `https://www.youtube.com/watch?v=${videoInfo.videoId}` : null);
			if (!url) {
				throw new Error("No video URL found in search results");
			}
			return {
				...videoInfo,
				url,
				title: videoInfo.title || name.trim(),
			};
		}
		if (r.type === "video" && (r.url || r.videoId)) {
			const url = r.url || (r.videoId ? `https://www.youtube.com/watch?v=${r.videoId}` : null);
			if (!url) {
				throw new Error("No video URL found in search results");
			}
			return {
				...r,
				url,
				title: r.title || name.trim(),
			};
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

const getAudioMimeType = (filePath) => {
	const ext = path.extname(filePath || "").toLowerCase();
	switch (ext) {
		case ".mp3":
			return "audio/mpeg";
		case ".m4a":
		case ".mp4":
		case ".aac":
			return "audio/mp4";
		case ".opus":
		case ".webm":
		case ".ogg":
			return "audio/ogg; codecs=opus";
		default:
			return "audio/mpeg";
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
	let downloadedPaths = [];
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
			if (!(await isSafeUrl(URL))) {
				return sendMessageWTyping(from, { text: `❌ Unsafe URL provided. Please provide a safe public link.` }, { quoted: msg });
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

		downloadedPaths = await downloadViaCobalt(URL, null, true);

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

		const mime = getAudioMimeType(fileDown);
		let sent = false;

		// 1. Primary: send as audio message via URL
		try {
			await sendAudioSafely(
				{
					audio: { url: fileDown },
					mimetype: mime,
					ptt: false,
				},
				msg
			);
			memoryManager.markFileSent(fileDown);
			sent = true;
		} catch (urlErr) {
			console.warn(`[Song] Audio URL send failed (${urlErr.message}), attempting audio buffer fallback...`);
			// Fallback A: send audio buffer if file is within manageable memory size
			if (fileSizeMB <= 50) {
				try {
					const buf = await fs.promises.readFile(fileDown);
					await sendAudioSafely(
						{
							audio: buf,
							mimetype: mime,
							ptt: false,
						},
						msg
					);
					memoryManager.markFileSent(fileDown);
					sent = true;
				} catch (bufErr) {
					console.warn(`[Song] Audio buffer send failed (${bufErr.message}), falling back to document...`);
				}
			}
		}

		// Fallback B: if audio message send failed, send as document with audio/mpeg
		if (!sent) {
			const cleanTitle = (title || "song").replace(/[\\/:*?"<>|]/g, "").trim() || "song";
			const fileName = `${cleanTitle}.mp3`;
			try {
				await sendAudioSafely(
					{
						document: { url: fileDown },
						mimetype: "audio/mpeg",
						fileName,
					},
					msg
				);
				memoryManager.markFileSent(fileDown);
				sent = true;
			} catch (docErr) {
				console.warn(`[Song] Document URL send failed (${docErr.message}), attempting document buffer...`);
				if (fileSizeMB <= 50) {
					try {
						const buf = await fs.promises.readFile(fileDown);
						await sendAudioSafely(
							{
								document: buf,
								mimetype: "audio/mpeg",
								fileName,
							},
							msg
						);
						memoryManager.markFileSent(fileDown);
						sent = true;
					} catch (docBufErr) {
						console.error("[Song] Document buffer send failed:", docBufErr.message);
					}
				}
			}
		}

		if (!sent) {
			await sendMessageWTyping(from, { text: "❌ Failed to upload song file. Please try again later." }, { quoted: msg });
		}
	} catch (err) {
		console.error("Song download error:", err.message);
		const clean = sanitizeYtDlpError(err.message, err.code);
		const userMsg = clean.startsWith("❌") ? clean : `❌ ${clean}`;
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
		err.userNotified = true;
		throw err;
	} finally {
		const filesToClean = new Set([
			...(Array.isArray(downloadedPaths) ? downloadedPaths : []),
			...(fileDown ? [fileDown] : []),
		]);
		if (filesToClean.size > 0) {
			setTimeout(() => {
				for (const filePath of filesToClean) {
					try {
						if (filePath && fs.existsSync(filePath)) {
							memoryManager.safeUnlink(filePath);
						}
					} catch (cleanupErr) {
						console.warn(`[Song] Cleanup error for ${filePath}:`, cleanupErr.message);
					}
				}
			}, 30000);
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
