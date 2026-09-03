import fs from "fs";
import { downloadViaCobalt, CobaltDownloadError } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";
import downloadQueue from "../../functions/downloadQueue.js";

const USER_COOLDOWN = 10000;
const userLastDownload = new Map();
function checkUserCooldown(jid) {
	const last = userLastDownload.get(jid);
	if (last && Date.now() - last < USER_COOLDOWN) return false;
	userLastDownload.set(jid, Date.now());
	if (userLastDownload.size > 1000) {
		const now = Date.now();
		for (const [k, v] of userLastDownload) if (now - v > 60000) userLastDownload.delete(k);
	}
	return true;
}

const isValidHttpUrl = (url) => {
	try {
		const u = new URL(url);
		return ["http:", "https:"].includes(u.protocol) && u.hostname.length > 2;
	} catch {
		return false;
	}
};

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
	if (!isValidHttpUrl(url)) {
		return sendMessageWTyping(from, { text: `❌ *Invalid URL.* Please provide a valid HTTP/HTTPS link.` }, { quoted: msg });
	}

	if (!checkUserCooldown(from)) {
		return sendMessageWTyping(from, { text: "⏳ Please wait 10 seconds before another download." }, { quoted: msg });
	}

	let queueResult;
	try {
		queueResult = await downloadQueue.acquire(from);
		if (queueResult.queued) {
			await sendMessageWTyping(from, { text: `⏳ You're #${queueResult.position} in queue. Please wait...` }, { quoted: msg });
		}
	} catch (qErr) {
		if (qErr.message?.startsWith("cooldown:")) {
			return sendMessageWTyping(from, { text: `⏳ Please wait ${qErr.message.split(":")[1]}s before another download.` }, { quoted: msg });
		}
		return sendMessageWTyping(from, { text: "❌ Server busy. Try again later." }, { quoted: msg });
	}

	let downloadPath = null;

	try {
		await sendMessageWTyping(from, { text: "⏳ Downloading audio... Please wait." }, { quoted: msg });

		const downloadedPaths = await downloadViaCobalt(url, null, true);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("Audio file was not downloaded from Cobalt.");
		}
		downloadPath = downloadedPaths[0];

		if (!fs.existsSync(downloadPath)) {
			throw new Error("Audio file was not created.");
		}

		const stats = await fs.promises.stat(downloadPath);
		if (stats.size === 0) {
			throw new Error("Downloaded audio file is empty.");
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
		const userMsg = error instanceof CobaltDownloadError
			? `❌ Download failed (${error.code}): ${error.message}`
			: "❌ Couldn't fetch audio from that link. Try again in a bit.";
		await sendMessageWTyping(from, { text: userMsg }, { quoted: msg });
	} finally {
		if (downloadPath) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			if (fs.existsSync(downloadPath)) memoryManager.safeUnlink(downloadPath);
		}
		downloadQueue.release();
	}
};

export default () => ({
	cmd: ["mp3", "audio"],
	desc: "Download high quality audio via link",
	usage: "mp3 <link>",
	handler,
});
