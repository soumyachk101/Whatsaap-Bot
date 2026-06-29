import fs from "fs";
import cp from "child_process";
import ffmpeg from "ffmpeg-static";
import yts from "yt-search";
import ytdl from "@distube/ytdl-core";
import execYtdlp from "../../../functions/ytdlpHelper.js";
import memoryManager from "../../../functions/memoryUtils.js";
import { readFileEfficiently, isValidAudioFile } from "../../../functions/fileUtils.js";
import {
	getYtDlpOptions,
	getYtdlCoreOptions,
	retryWithBackoff,
	isBotDetectionError,
	isYtdlCoreParsingError,
	checkYtDlpBinary,
	isPyInstallerError,
	getNextSharedAgent,
} from "../../../functions/youtubeUtils.js";


const getRandom = (ext) => {
	return memoryManager.generateTempFileName(ext);
};

const findSongURL = async (name) => {
	try {
		const r = await yts(`${name}`);
		if (!r.all || r.all.length === 0) {
			throw new Error("No results found");
		}
		return r.all[0];
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
		const { downloadFromCobalt } = await import("../../../functions/cobaltHelper.js");
		const downloadedFiles = await downloadFromCobalt(URL, { audioOnly: true });
		
		if (!downloadedFiles || downloadedFiles.length === 0) {
			throw new Error("File was not downloaded from Cobalt.");
		}
		fileDown = downloadedFiles[0];

		// Check if file was created and has content
		if (!fs.existsSync(fileDown)) {
			throw new Error("Audio file was not created");
		}

		// Validate the audio file
		if (!isValidAudioFile(fileDown)) {
			throw new Error("Invalid audio file generated");
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

		// Send user-friendly error message
		let errorMsg = "❌ Download failed. ";
		if (err.message.includes("No songs found")) {
			errorMsg += "Try a different search term.";
		} else if (err.message.includes("too large")) {
			errorMsg += err.message;
		} else if (err.message.includes("Cobalt Error")) {
			errorMsg += err.message;
		} else {
			errorMsg += "Please try again with a different song.";
		}

		await sendMessageWTyping(from, { text: errorMsg }, { quoted: msg });
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
