import fs from "fs";
import { downloadFromCobalt } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import { isValidVideoFile } from "../../functions/fileUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Bhai link toh bhej!*\n\nExample: \`${prefix}${command} https://youtube.com/watch?v=xxx\`` },
			{ quoted: msg }
		);
	}

	const url = args[0];
	let downloadPath = null;

	try {
		const downloadedFiles = await downloadFromCobalt(url, { audioOnly: false });

		if (!downloadedFiles || downloadedFiles.length === 0) {
			throw new Error("File was not downloaded from Cobalt.");
		}
		downloadPath = downloadedFiles[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("File was not created after download.");
		}

		const stats = fs.statSync(downloadPath);
		const fileSizeMB = stats.size / (1024 * 1024);

		if (fileSizeMB > 100) {
			memoryManager.safeUnlink(downloadPath);
			return sendMessageWTyping(
				from,
				{ text: `❌ *Bhai video ${fileSizeMB.toFixed(2)}MB ki hai!* WhatsApp limit 100MB hai.` },
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
		let errorMsg = `❌ *Bhai error aagaya video download karne mein.*`;
		if (error.message.includes("Cobalt Error")) {
			errorMsg += `\n\nReason: \`${error.message.substring(0, 100)}\``;
		}
		
		await sendMessageWTyping(from, { text: errorMsg }, { quoted: msg });
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
