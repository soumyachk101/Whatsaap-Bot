import { downloadMediaMessage } from "baileys";

import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { writeFile } from "fs/promises";
import memoryManager from "../../../functions/memoryUtils.js";

const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg";
ffmpeg.setFfmpegPath(ffmpegPath);

const getRandom = (ext) => memoryManager.generateTempFileName(ext);

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { type, content, sendMessageWTyping } = msgInfoObj;

	if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		msg.message = msg.message.extendedTextMessage.contextInfo.quotedMessage;
	}

	const isMedia = type === "imageMessage" || type === "videoMessage";
	const isTaggedImage = type === "extendedTextMessage" && content.includes("imageMessage");
	const isTaggedVideo = type === "extendedTextMessage" && content.includes("videoMessage");

	if (isMedia || isTaggedImage || isTaggedVideo) {
		const media = getRandom(".mp4");
		const path = getRandom(".mp3");
		const buffer = await downloadMediaMessage(msg, "buffer", {});
		await writeFile(media, buffer);

		ffmpeg()
			.input(media)
			.audioCodec("libmp3lame")
			.audioBitrate("320k")
			.noVideo()
			.outputOptions(["-preset ultrafast"])
			.on("end", async () => {
				console.log("Conversion finished");
				await sock
					.sendMessage(
						from,
						{
							audio: await fs.promises.readFile(path),
							mimetype: "audio/mpeg",
							fileName: path,
						},
						{ quoted: msg }
					)
					.then(() => {
						memoryManager.safeUnlink(media);
						memoryManager.safeUnlink(path);
					});
			})
			.on("error", (err) => {
				console.error("Error:", err);
				memoryManager.safeUnlink(media);
				memoryManager.safeUnlink(path);
				sendMessageWTyping(from, { text: `Error while converting` }, { quoted: msg });
			})
			.save(path);
	} else {
		console.log("No Media tag");
		sendMessageWTyping(from, { text: `*Reply to video only*` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["mp3convt", "mp4audio", "tomp3"],
	desc: "Convert video to mp3",
	usage: "mp3 | reply to video",
	handler,
});
