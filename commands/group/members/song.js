import fs from "fs";
import yts from "yt-search";
import memoryManager from "../../../functions/memoryUtils.js";
import { downloadViaCobalt } from "../../../functions/cobaltHelper.js";

const findSongURL = async (name) => {
	try {
		const r = await yts(`${name}`);
		if (r && Array.isArray(r.videos) && r.videos.length > 0) {
			return r.videos[0];
		}
		if (r && r.type === "video") {
			return r;
		}
		throw new Error("No results found");
	} catch (error) {
		console.error("Search error:", error);
		throw new Error("Failed to search for song");
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
	let fileDown = null;

	try {
		let URL = "";
		let title = "Audio Track";
		let durationText = "";

		const isDirectUrl = songQuery.startsWith("http://") || songQuery.startsWith("https://");

		if (isDirectUrl) {
			URL = songQuery;
		} else {
			try {
				const videoInfo = await findSongURL(songQuery);
				URL = videoInfo.url;
				title = videoInfo.title || songQuery;
				durationText = videoInfo.timestamp ? ` (${videoInfo.timestamp})` : "";
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
		const fileSizeMB = stats.size / 1024 / 1024;

		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		if (fileSizeMB > 50) {
			throw new Error(`Audio file too large: ${fileSizeMB.toFixed(2)}MB (max 50MB)`);
		}

		await sendMessageWTyping(
			from,
			{
				audio: { url: fileDown },
				mimetype: "audio/mp4",
				ptt: false,
			},
			{ quoted: msg }
		);
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
	desc: "Download song audio",
	usage: "song <song name or link>",
	handler,
});
