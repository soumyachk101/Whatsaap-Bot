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

	if (!args[0]) return sendMessageWTyping(from, { text: `❌ *Enter song name*` }, { quoted: msg });

	console.log("Song request:", evv);

	let fileDown = null;
	
	try {
		// First try to find the song
		let videoInfo;
		try {
			videoInfo = await findSongURL(evv);
			console.log("Found URL:", videoInfo.url);
		} catch (searchError) {
			console.error("Search failed:", searchError);
			return sendMessageWTyping(from, { text: `❌ No songs found for: *${evv}*` }, { quoted: msg });
		}

		const URL = videoInfo.url;
		const title = videoInfo.title || "Unknown Song";

		// Download using Cobalt
		const downloadedPaths = await downloadViaCobalt(URL, null, true);
		
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("File was not downloaded from Cobalt.");
		}
		fileDown = downloadedPaths[0];

		// Check if file was created and has content
		if (!fs.existsSync(fileDown)) {
			throw new Error("Audio file was not created");
		}

		const stats = await fs.promises.stat(fileDown);
		const fileSizeMB = stats.size / 1024 / 1024;

		if (stats.size === 0) {
			throw new Error("Downloaded file is empty");
		}

		if (fileSizeMB > 50) {
			throw new Error(`File too large: ${fileSizeMB.toFixed(2)}MB (max 50MB)`);
		}

		console.log(`Audio ready: ${fileSizeMB.toFixed(2)}MB - ${title}`);

		// Send the audio file
		try {
			if (command === "song") {
				await sendMessageWTyping(from, { text: `🎵 *${title}*\n📊 Size: ${fileSizeMB.toFixed(2)}MB` }, { quoted: msg });
			}

			let sock_data = {
				audio: { url: fileDown },
				mimetype: "audio/mpeg",
			};

			await sendMessageWTyping(from, sock_data, { quoted: msg });
			console.log("Audio sent successfully");
		} catch (sendError) {
			console.error("Error sending audio:", sendError);
			throw new Error("Failed to send audio file");
		}
	} catch (err) {
		console.error("Song download error:", err);
		await sendMessageWTyping(from, { text: "Couldn't fetch that link right now, try again in a bit" }, { quoted: msg });
	} finally {
		// Always cleanup the temp file
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
