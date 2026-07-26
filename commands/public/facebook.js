import fs from "fs";
import { downloadViaCobalt } from "../../functions/cobaltHelper.js";
import memoryManager from "../../functions/memoryUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix, command } = msgInfoObj;

	if (args.length === 0) {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Please provide a Facebook video link!*\n\nExample: \`${prefix}${command} https://www.facebook.com/watch/?v=xxx\`` },
			{ quoted: msg }
		);
	}

	const url = args[0];
	if (!url.includes("facebook.com") && !url.includes("fb.watch") && !url.includes("fb.com") && !url.includes("fb.gg")) {
		return sendMessageWTyping(from, { text: "❌ *Please provide a valid Facebook video link!*" }, { quoted: msg });
	}

	let downloadedPaths = [];
	try {
		downloadedPaths = await downloadViaCobalt(url, null, false);
		
		if (!downloadedPaths || downloadedPaths.length === 0) {
			throw new Error("No video was downloaded.");
		}

		const downloadPath = downloadedPaths[0];

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
				caption: "Your Facebook Video is ready! 🎬",
				mimetype: "video/mp4",
			},
			{ quoted: msg }
		);

	} catch (error) {
		console.error("Facebook Download Error:", error);
		await sendMessageWTyping(from, { text: `Couldn't fetch that link right now, try again in a bit` }, { quoted: msg });
	} finally {
		if (downloadedPaths) {
			downloadedPaths.forEach(p => {
				if (fs.existsSync(p)) memoryManager.safeUnlink(p);
			});
		}
	}
};

export default () => ({
	cmd: ["fb", "facebook", "fbdl"],
	desc: "Download Facebook videos via link",
	usage: "fb <link>",
	handler,
});
