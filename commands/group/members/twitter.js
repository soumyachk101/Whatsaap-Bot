import fs from "fs";
import memoryManager from "../../../functions/memoryUtils.js";
import { downloadViaCobalt } from "../../../functions/cobaltHelper.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { evv, sendMessageWTyping } = msgInfoObj;
	if (!args[0]) return sendMessageWTyping(from, { text: "❌ Provide Twitter/X Video URL." }, { quoted: msg });
	let tweetUrl = args[0].trim();

	if (!tweetUrl.startsWith("http")) {
		return sendMessageWTyping(from, { text: "❌ Provide valid Twitter/X Video URL." }, { quoted: msg });
	}

	let fileDown = null;
	try {
		await sendMessageWTyping(from, { text: "⏳ Downloading Twitter/X video..." }, { quoted: msg });
		const downloadedPaths = await downloadViaCobalt(tweetUrl, null, false);
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("No video found for this tweet");
		}

		fileDown = downloadedPaths[0];
		if (!fs.existsSync(fileDown)) {
			throw new Error("Downloaded video file missing");
		}

		const stats = await fs.promises.stat(fileDown);
		const fileSizeMB = stats.size / 1024 / 1024;
		if (fileSizeMB > 50) {
			throw new Error(`Video too large: ${fileSizeMB.toFixed(2)}MB (max 50MB)`);
		}

		await sendMessageWTyping(
			from,
			{ video: await fs.promises.readFile(fileDown), mimetype: "video/mp4", caption: "🎬 *Twitter Video Downloaded*" },
			{ quoted: msg }
		);
	} catch (error) {
		console.error("Twitter download error:", error);
		sendMessageWTyping(
			from,
			{ text: `❌ Failed to download Twitter video: ${error.message}` },
			{ quoted: msg }
		);
	} finally {
		if (fileDown && fs.existsSync(fileDown)) {
			memoryManager.safeUnlink(fileDown);
		}
	}
};

export default () => ({
	cmd: ["twitter", "tw", "x"],
	desc: "Download Twitter Video",
	usage: "twitter <tweet url>",
	handler,
});
