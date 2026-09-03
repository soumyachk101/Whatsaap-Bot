import fs from "fs";
import { downloadViaCobalt } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please provide a media link!*\n\nExample: \`${prefix}${command} https://youtube.com/watch?v=xxx\`` },
			{ quoted: msg }
		);
	}

	const url = args[0];
	let downloadPath = null;

	try {
		const downloadedPaths = await downloadViaCobalt(url, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Audio file was not downloaded from Cobalt.");
		}
		downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		await sendMessageWTyping(
			from,
			{
				audio: { url: downloadPath },
				mimetype: "audio/mp4",
				ptt: false,
			},
			{ quoted: msg }
		);

	} catch (error) {
		console.error("MP3 Download Error:", error);
		await sendMessageWTyping(from, { text: "Couldn't fetch that link right now, try again in a bit" }, { quoted: msg });
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
