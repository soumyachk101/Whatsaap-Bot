import { fileTypeFromFile } from "file-type";
import { downloadViaCobalt } from "../../../functions/cobaltHelper.js";
import fs from "fs";
import memoryManager from "../../../functions/memoryUtils.js";
import { isValidVideoFile } from "../../../functions/fileUtils.js";

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
		const downloadedPaths = await downloadViaCobalt(urlInstagram, null, false);

		if (!downloadedPaths || downloadedPaths.length === 0) {
			return sendMessageWTyping(from, { text: "No Data Found!!" }, { quoted: msg });
		}

		// Detect media type for all downloaded files
		const detectedFiles = [];
		for (const fileDown of downloadedPaths) {
			const detected = await detectUrlTypeLocal(fileDown);
			detectedFiles.push({ path: fileDown, ...detected });
		}

		const isReelOrTv = urlInstagram.includes("/reel/") || urlInstagram.includes("/tv/");
		const hasVideo = detectedFiles.some((f) => f.detected === "video");

		// Filter out preview/thumbnail images if a video is present or if the URL is a Reel/TV
		const filesToSend = (isReelOrTv || hasVideo)
			? detectedFiles.filter((f) => f.detected === "video")
			: detectedFiles;

		const finalFiles = filesToSend.length > 0 ? filesToSend : detectedFiles;

		for (const fileObj of finalFiles) {
			const fileDown = fileObj.path;
			if (fileObj.detected === "video") {
				await sock.sendMessage(from, { video: { url: fileDown } }, { quoted: msg });
			} else if (fileObj.detected === "image") {
				await sock.sendMessage(from, { image: { url: fileDown } }, { quoted: msg });
			} else {
				await sock.sendMessage(
					from,
					{ document: { url: fileDown }, mimetype: fileObj.mime, fileName: `file.${fileObj.ext}` },
					{ quoted: msg }
				);
			}
			await new Promise((resolve) => setTimeout(resolve, 1000));
			memoryManager.safeUnlink(fileDown);
		}
	} catch (err) {
		console.log("Insta Handler Error:", err);
		sendMessageWTyping(from, { text: "Couldn't fetch that link right now, try again in a bit" }, { quoted: msg });
	}
};

async function detectUrlTypeLocal(filePath) {
	try {
		const type = await fileTypeFromFile(filePath);

		if (type) {
			let detected = "other";
			if (type.mime.startsWith("video/")) {
				detected = "video";
			} else if (type.mime.startsWith("image/")) {
				if (filePath.toLowerCase().endsWith(".mp4") && isValidVideoFile(filePath)) {
					detected = "video";
				} else {
					detected = "image";
				}
			} else if (isValidVideoFile(filePath) || filePath.toLowerCase().endsWith(".mp4")) {
				detected = "video";
			}

			return {
				ext: type.ext,
				mime: detected === "video" ? "video/mp4" : type.mime,
				detected,
			};
		}

		const lower = filePath.toLowerCase();
		if (isValidVideoFile(filePath) || lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
			return { ext: "mp4", mime: "video/mp4", detected: "video" };
		}
		if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png")) {
			return { ext: "jpg", mime: "image/jpeg", detected: "image" };
		}

		return { type: "unknown", reason: "no magic bytes detected", ext: "bin", mime: "application/octet-stream", detected: "other" };
	} catch (err) {
		const lower = filePath.toLowerCase();
		if (isValidVideoFile(filePath) || lower.endsWith(".mp4")) {
			return { ext: "mp4", mime: "video/mp4", detected: "video" };
		}
		return { error: err.message, detected: "other", mime: "application/octet-stream", ext: "bin" };
	}
}

export default () => ({
	cmd: ["insta", "i"],
	desc: "Download Instagram post",
	usage: "insta | i <url>",
	handler,
});
