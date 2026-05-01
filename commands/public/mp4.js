import fs from "fs";
import path from "path";
import execYtdlp from "../../functions/ytdlpHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import { getYtDlpOptions, retryWithBackoff } from "../../functions/youtubeUtils.js";
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
	const statusMsg = await sendMessageWTyping(from, { text: "⏳ *Initializing Video request...*" }, { quoted: msg });
	const downloadPath = memoryManager.generateTempFileName(".mp4");

	try {
		await sendMessageWTyping(from, { text: "🚀 *Downloading...* Please wait." }, { edit: statusMsg.key });

		// Configure yt-dlp options based on the platform
		const isInstagram = url.includes("instagram.com");
		const options = getYtDlpOptions({
			format: "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
			output: downloadPath,
			maxFilesize: "100M", // Safety limit
		});

		if (isInstagram) {
			// For Instagram, sometimes simple best format works better
			options.format = "best";
		}

		await retryWithBackoff(async () => {
			await execYtdlp(url, options);
		}, 2, 2000);

		if (!fs.existsSync(downloadPath)) {
			throw new Error("File was not created after download.");
		}

		const stats = fs.statSync(downloadPath);
		const fileSizeMB = stats.size / (1024 * 1024);

		if (fileSizeMB > 100) {
			fs.unlinkSync(downloadPath);
			return sendMessageWTyping(
				from,
				{ text: `❌ *Bhai video ${fileSizeMB.toFixed(2)}MB ki hai!* WhatsApp limit 100MB hai.` },
				{ edit: statusMsg.key }
			);
		}

		await sendMessageWTyping(from, { text: "📤 *Uploading Video...*" }, { edit: statusMsg.key });

		await sock.sendMessage(
			from,
			{
				video: { url: downloadPath },
				caption: "Your video is ready! 🎬",
				mimetype: "video/mp4",
			},
			{ quoted: msg }
		);

		// Clean up
		memoryManager.safeUnlink(downloadPath);

	} catch (error) {
		console.error("MP4 Download Error:", error);
		let errorMsg = `❌ *Bhai error aagaya video download karne mein.*`;
		if (error.message.includes("403")) errorMsg = "❌ *Access Denied!* YouTube is blocking the request.";
		if (error.message.includes("429")) errorMsg = "❌ *Too Many Requests!* Try again later.";
		
		await sendMessageWTyping(from, { text: errorMsg + `\n\nReason: \`${error.message.substring(0, 50)}\`` }, { edit: statusMsg.key });
		if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
	}
};

export default () => ({
	cmd: ["mp4", "video"],
	desc: "Download HD video via link",
	usage: "mp4 <link>",
	handler,
});
