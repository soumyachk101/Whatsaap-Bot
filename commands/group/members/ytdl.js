import fs from "fs";
import yts from "yt-search";
import memoryManager from "../../../functions/memoryUtils.js";
import { downloadViaCobalt, CobaltDownloadError } from "../../../functions/cobaltHelper.js";
import { readFileEfficiently, isValidVideoFile } from "../../../functions/fileUtils.js";

const findVideoURL = async (name) => {
	const r = await yts(`${name}`);
	return r.videos?.[0]?.url;
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, command, evv } = msgInfoObj;

	// Validate input
	if (command != "vs") {
		if (!args[0] || !args[0].startsWith("http")) {
			return sendMessageWTyping(from, { text: `Enter youtube link after yt` }, { quoted: msg });
		}
	}

	let URL = args[0];
	if (command == "vs") {
		if (!args[0]) return sendMessageWTyping(from, { text: `Enter something to search` }, { quoted: msg });
		try {
			URL = await findVideoURL(evv);
			if (!URL) {
				return sendMessageWTyping(from, { text: `❌ No video found for: ${evv}` }, { quoted: msg });
			}
		} catch (searchError) {
			console.error("Video search error:", searchError);
			return sendMessageWTyping(from, { text: `Couldn't fetch that link right now, try again in a bit` }, { quoted: msg });
		}
	} else {
		URL = args[0];
	}

	let downloadedPaths = [];
	try {
		downloadedPaths = await downloadViaCobalt(URL, null, false);
		
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("No video was downloaded.");
		}

		const fileDown = downloadedPaths[0];

		if (!fs.existsSync(fileDown)) {
			throw new Error("Video file was not created.");
		}

		const stats = await fs.promises.stat(fileDown);
		const fileSizeMB = stats.size / (1024 * 1024);

		if (fileSizeMB > 60) {
			memoryManager.safeUnlink(fileDown);
			return sendMessageWTyping(
				from,
				{
					text: `❌ Video is too large to send on WhatsApp (${fileSizeMB.toFixed(2)}MB). Limit is 60MB.`,
				},
				{ quoted: msg }
			);
		}

		try {
			await sendMessageWTyping(
				from,
				{
					video: { url: fileDown },
					caption: `🎥 Video downloaded successfully!\n📊 Size: ${fileSizeMB.toFixed(2)}MB`,
					mimetype: "video/mp4",
				},
				{ quoted: msg }
			);
		} catch (sendError) {
			console.error("Failed to send video via path, trying buffer fallback:", sendError);
			try {
				const videoBuffer = await readFileEfficiently(fileDown);
				await sendMessageWTyping(
					from,
					{
						video: videoBuffer,
						caption: `🎥 Video downloaded successfully!\n📊 Size: ${fileSizeMB.toFixed(2)}MB`,
						mimetype: "video/mp4",
					},
					{ quoted: msg }
				);
			} catch (bufferError) {
				console.error("Buffer fallback also failed:", bufferError);
				throw new Error("Failed to send video to WhatsApp.");
			}
		}

	} catch (err) {
		console.error("YTDL Handler Error:", err);
		sendMessageWTyping(from, { text: "Couldn't fetch that link right now, try again in a bit" }, { quoted: msg });
	} finally {
		if (downloadedPaths) {
			downloadedPaths.forEach(p => {
				if (fs.existsSync(p)) memoryManager.safeUnlink(p);
			});
		}
	}
};

export default () => ({
	cmd: ["yt", "ytv", "vs"],
	desc: "Download youtube video",
	usage: "yt <youtube link>",
	handler,
});
