import fs from "fs";
import execYtdlp from "../../functions/ytdlpHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import { getYtDlpOptions, retryWithBackoff } from "../../functions/youtubeUtils.js";

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
	const statusMsg = await sendMessageWTyping(from, { text: "⏳ *Initializing MP3 request...*" }, { quoted: msg });
	const downloadPath = memoryManager.generateTempFileName(".mp3");

	try {
		await sendMessageWTyping(from, { text: "🚀 *Downloading & Extracting Audio...* Please wait." }, { edit: statusMsg.key });

		const options = getYtDlpOptions({
			extractAudio: true,
			audioFormat: "mp3",
			audioQuality: "0",
			output: downloadPath,
		});

		await retryWithBackoff(async () => {
			await execYtdlp(url, options);
		}, 2, 2000);

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		await sendMessageWTyping(from, { text: "📤 *Uploading Audio...*" }, { edit: statusMsg.key });

		await sock.sendMessage(
			from,
			{
				audio: { url: downloadPath },
				mimetype: "audio/mpeg",
				ptt: false,
			},
			{ quoted: msg }
		);

		// Clean up
		memoryManager.safeUnlink(downloadPath);

	} catch (error) {
		console.error("MP3 Download Error:", error);
		await sendMessageWTyping(from, { text: `❌ *Bhai error aagaya MP3 banane mein.* \n\nReason: \`${error.message.substring(0, 50)}\`` }, { edit: statusMsg.key });
		if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
	}
};

export default () => ({
	cmd: ["mp3", "audio", "song"],
	desc: "Download high quality audio via link",
	usage: "mp3 <link>",
	handler,
});
