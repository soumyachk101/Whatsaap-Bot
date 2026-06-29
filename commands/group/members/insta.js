import { fileTypeFromFile } from "file-type";
import { downloadFromCobalt } from "../../../functions/cobaltHelper.js";
import fs from "fs";
import memoryManager from "../../../functions/memoryUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, sendMessageWTyping, ig } = msgInfoObj;

	if (args.length === 0)
		return sendMessageWTyping(from, { text: `❌ URL is empty! \nSend ${prefix}insta url` }, { quoted: msg });
	let urlInstagram = args[0];

	if (
		!(
			urlInstagram.includes("instagram.com/") ||
			urlInstagram.includes("instagram.com/p/") ||
			urlInstagram.includes("instagram.com/reel/") ||
			urlInstagram.includes("instagram.com/tv/")
		)
	)
		return sendMessageWTyping(
			from,
			{ text: `❌ Wrong URL! Only Instagram posted videos, tv and reels can be downloaded.` },
			{ quoted: msg }
		);

	if (urlInstagram.includes("?")) urlInstagram = urlInstagram.split("/?")[0];
	console.log(urlInstagram);

	try {
		const downloadedFiles = await downloadFromCobalt(urlInstagram, { audioOnly: false });

		if (!downloadedFiles || downloadedFiles.length === 0) {
			return sendMessageWTyping(from, { text: "No Data Found!!" }, { quoted: msg });
		}

		for (const fileDown of downloadedFiles) {
			const detected = await detectUrlTypeLocal(fileDown);

			if (detected.detected === "video") {
				await sock.sendMessage(from, { video: { url: fileDown } }, { quoted: msg });
			} else if (detected.detected === "image") {
				await sock.sendMessage(from, { image: { url: fileDown } }, { quoted: msg });
			} else {
				await sock.sendMessage(
					from,
					{ document: { url: fileDown }, mimetype: detected.mime, fileName: `file.${detected.ext}` },
					{ quoted: msg }
				);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
			memoryManager.safeUnlink(fileDown);
		}
	} catch (err) {
		console.log(err);
		let errorMsg = "Error!! Maybe private account or invalid URL.";
		if (err.message.includes("Cobalt Error")) {
			errorMsg = `Cobalt API Error: ${err.message}`;
		}
		sendMessageWTyping(from, { text: errorMsg }, { quoted: msg });
	}
};

async function detectUrlTypeLocal(filePath) {
	try {
		const type = await fileTypeFromFile(filePath);

		if (!type) {
			return { type: "unknown", reason: "no magic bytes detected", ext: "bin", mime: "application/octet-stream", detected: "other" };
		}

		return {
			ext: type.ext,
			mime: type.mime,
			detected: type.mime.startsWith("image/") ? "image" : type.mime.startsWith("video/") ? "video" : "other",
		};
	} catch (err) {
		return { error: err.message, detected: "other", mime: "application/octet-stream", ext: "bin" };
	}
}

export default () => ({
	cmd: ["insta", "i"],
	desc: "Download Instagram post",
	usage: "insta | i <url>",
	handler,
});
