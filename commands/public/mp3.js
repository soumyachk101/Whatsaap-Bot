import fs from "fs";
import { downloadFromCobalt } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";

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
		const downloadedFiles = await downloadFromCobalt(url, { audioOnly: true });

		if (!downloadedFiles || downloadedFiles.length === 0) {
			throw new Error("Audio file was not downloaded from Cobalt.");
		}
		downloadPath = downloadedFiles[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		await sock.sendMessage(
			from,
			{
				audio: { url: downloadPath },
				mimetype: "audio/mpeg",
				ptt: false,
			},
			{ quoted: msg }
		);

	} catch (error) {
		console.error("MP3 Download Error:", error);
		let errorMsg = `❌ *Bhai error aagaya MP3 banane mein.*`;
		if (error.message.includes("Cobalt Error")) {
			errorMsg += `\n\nReason: \`${error.message.substring(0, 100)}\``;
		} else {
			errorMsg += `\n\nReason: \`${error.message.substring(0, 50)}\``;
		}
		
		await sendMessageWTyping(from, { text: errorMsg }, { quoted: msg });
	} finally {
		if (downloadPath && fs.existsSync(downloadPath)) {
			memoryManager.safeUnlink(downloadPath);
		}
	}
};

export default () => ({
	cmd: ["mp3", "audio"],
	desc: "Download high quality audio via link",
	usage: "mp3 <link>",
	handler,
});
