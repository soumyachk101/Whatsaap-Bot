import fs from "fs";
import { downloadViaCobalt, CobaltDownloadError } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import downloadQueue from "../../functions/downloadQueue.js";

const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command, evv } = msgInfoObj;

	let url = args[0] || (evv ? evv.trim().split(/\s+/)[0] : "");
	if (!url && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		const quotedText = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
		const match = quotedText.match(/https?:\/\/[^\s]+/i);
		if (match) url = match[0];
	}

	if (!url) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please provide a media link!*\n\nExample: \`${prefix}${command} https://youtube.com/watch?v=xxx\` or reply to a link.` },
			{ quoted: msg }
		);
	}

	if (!isValidHttpUrl(url)) {
		return sendMessageWTyping(from, { text: `❌ *Invalid URL.* Please provide a valid HTTP/HTTPS link.` }, { quoted: msg });
	}

	let acquired = false;
	let downloadPath = null;

	try {
		await downloadQueue.acquire(from);
		acquired = true;

		const downloadedPaths = await downloadViaCobalt(url, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Audio file was not downloaded from servers.");
		}
		downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		const stats = await fs.promises.stat(downloadPath);
		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
		}

		const mime = downloadPath.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/mp4";

		try {
			await sendMessageWTyping(
				from,
				{
					audio: { url: downloadPath },
					mimetype: mime,
					ptt: false,
				},
				{ quoted: msg }
			);
		} catch (sendErr) {
			console.error("[MP3] Send with URL failed, trying buffer fallback:", sendErr.message);
			const buf = fs.readFileSync(downloadPath);
			await sendMessageWTyping(
				from,
				{
					audio: buf,
					mimetype: mime,
					ptt: false,
				},
				{ quoted: msg }
			);
		}
	} catch (error) {
		console.error("MP3 Download Error:", error);
		const userMsg = error instanceof CobaltDownloadError
			? `❌ Download failed (${error.code}): ${error.message}`
			: "❌ Couldn't fetch audio from that link. Try again with a different link.";
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
	} finally {
		if (downloadPath) {
			await new Promise(resolve => setTimeout(resolve, 8000));
			if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
		}
		if (acquired) {
			downloadQueue.release();
		}
	}
};

export default () => ({
	cmd: ["mp3", "audio"],
	desc: "Download high quality audio via link",
	usage: "mp3 <link>",
	handler,
});
