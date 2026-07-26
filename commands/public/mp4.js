import fs from "fs";
import { downloadViaCobalt } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import { isValidVideoFile } from "../../functions/fileUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please provide a video link!*\n\nExample: \`${prefix}${command} https://youtube.com/watch?v=xxx\`` },
			{ quoted: msg }
		);
	}

	const url = args[0];
	let downloadPath = null;

	try {
		const downloadedPaths = await downloadViaCobalt(url, null, false);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("File was not downloaded from Cobalt.");
		}
		downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("File was not created after download.");
		}

		const stats = fs.statSync(downloadPath);
		const fileSizeMB = stats.size / (1024 * 1024);

		if (fileSizeMB > 100) {
			memoryManager.safeUnlink(downloadPath);
			return sendMessageWTyping(
				from,
				{ text: `❌ *Video is ${fileSizeMB.toFixed(2)}MB!* WhatsApp limit is 100MB.` },
				{ quoted: msg }
			);
		}

		await sock.sendMessage(
			from,
			{
				video: { url: downloadPath },
				caption: "Your video is ready! 🎬",
				mimetype: "video/mp4",
			},
			{ quoted: msg }
		);

	} catch (error) {
		console.error("MP4 Download Error:", error);
		await sendMessageWTyping(from, { text: "Couldn't fetch that link right now, try again in a bit" }, { quoted: msg });
	} finally {
		if (downloadPath && fs.existsSync(downloadPath)) {
			memoryManager.safeUnlink(downloadPath);
		}
	}
};

export default () => ({
	cmd: ["mp4", "video"],
	desc: "Download HD video via link",
	usage: "mp4 <link>",
	handler,
});
