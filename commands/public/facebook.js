import fs from "fs";
import execYtdlp from "../../functions/ytdlpHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import { getYtDlpOptions, retryWithBackoff } from "../../functions/youtubeUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Bhai Facebook video link toh bhej!*\n\nExample: \`${prefix}${command} https://www.facebook.com/watch/?v=xxx\`` },
			{ quoted: msg }
		);
	}

	const url = args[0];
	if (!url.includes("facebook.com") && !url.includes("fb.watch") && !url.includes("fb.com")) {
		return sendMessageWTyping(from, { text: "❌ *Please provide a valid Facebook video link!*" }, { quoted: msg });
	}

	const statusMsg = await sendMessageWTyping(from, { text: "⏳ *Initializing Facebook Download...*" }, { quoted: msg });
	const downloadPath = memoryManager.generateTempFileName(".mp4");

	try {
		await sendMessageWTyping(from, { text: "🚀 *Downloading Facebook video...*" }, { edit: statusMsg.key });

		const options = getYtDlpOptions({
			format: "best",
			output: downloadPath,
			maxFilesize: "100M",
			recodeVideo: "mp4",
		});

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
				caption: "Your Facebook Video is ready! 🎬",
				mimetype: "video/mp4",
			},
			{ quoted: msg }
		);

		// Clean up
		memoryManager.safeUnlink(downloadPath);

	} catch (error) {
		console.error("Facebook Download Error:", error);
		await sendMessageWTyping(from, { text: `❌ *Error downloading Facebook video.*\n\nReason: \`${error.message.substring(0, 50)}\`` }, { edit: statusMsg.key });
		if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
	}
};

export default () => ({
	cmd: ["fb", "facebook", "fbdl"],
	desc: "Download Facebook videos via link",
	usage: "fb <link>",
	handler,
});
