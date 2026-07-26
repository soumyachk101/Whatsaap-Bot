import fs from "fs";
import yts from "yt-search";
import memoryManager from "../../../functions/memoryUtils.js";
import { downloadViaCobalt } from "../../../functions/cobaltHelper.js";

const findSongURL = async (name) => {
	try {
		const r = await yts(`${name}`);
		if (!r.videos || r.videos.length === 0) {
			throw new Error("No results found");
		}
		return r.videos[0];
	} catch (error) {
		console.error("Search error:", error);
		throw new Error("Failed to search for song");
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { evv, command, sendMessageWTyping } = msgInfoObj;

	let songQuery = evv ? evv.trim() : "";
	if (!songQuery && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		songQuery = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!songQuery) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please enter a song name or YouTube link!*\n\nExample: \`-song Kesariya\` or reply to a link/name.` },
			{ quoted: msg }
		);
	}

	console.log("Song request query:", songQuery);
	let fileDown = null;

	try {
		let URL = "";
		let title = "Audio Track";
		let durationText = "";
		let authorName = "";

		const isDirectUrl = songQuery.startsWith("http://") || songQuery.startsWith("https://");

		if (isDirectUrl) {
			URL = songQuery;
		} else {
			try {
				const videoInfo = await findSongURL(songQuery);
				URL = videoInfo.url;
				title = videoInfo.title || songQuery;
				durationText = videoInfo.timestamp ? ` (${videoInfo.timestamp})` : "";
				authorName = videoInfo.author?.name ? `\n👤 Artist: _${videoInfo.author.name}_` : "";
				console.log("Found URL:", URL);
			} catch (searchError) {
				console.error("Search failed:", searchError);
				return sendMessageWTyping(from, { text: `❌ No songs found for: *${songQuery}*` }, { quoted: msg });
			}
		}

		await sendMessageWTyping(from, { text: `🔎 *Searching & Downloading...*\n🎵 *${title}*${durationText}` }, { quoted: msg });

		// Download using Cobalt API (with yt-dlp fallback)
		const downloadedPaths = await downloadViaCobalt(URL, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Failed to download audio from stream servers.");
		}
		fileDown = downloadedPaths[0];

		if (!fs.existsSync(fileDown)) {
			throw new Error("Audio file was not created on disk.");
		}

		const stats = await fs.promises.stat(fileDown);
		const fileSizeMB = stats.size / 1024 / 1024;

		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		if (fileSizeMB > 50) {
			throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 50MB)`);
		}

		console.log(`Audio ready: ${fileSizeMB.toFixed(2)}MB - ${title}`);

		// Send audio file (pass file path string so sendMessageWTyping reads it to Buffer)
		await sendMessageWTyping(
			from,
			{
				audio: fileDown,
				mimetype: "audio/mp4",
				ptt: false,
			},
			{ quoted: msg }
		);
		console.log("Audio sent successfully");
	} catch (err) {
		console.error("Song download error:", err);
		await sendMessageWTyping(from, { text: `❌ Failed to download song: ${err.message}` }, { quoted: msg });
	} finally {
		if (fileDown && fs.existsSync(fileDown)) {
			memoryManager.safeUnlink(fileDown);
		}
	}
};

export default () => ({
	cmd: ["song", "play"],
	desc: "Download song",
	usage: "song | play | song [song name]",
	handler,
});
