import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import { downloadMediaMessage } from "baileys";
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
	const isTaggedSticker = type === "extendedTextMessage" && content.includes("stickerMessage");

	const media = getRandom(".webp");

	if (isMedia || isTaggedSticker) {
		if (msg.message?.videoMessage?.seconds > 11) {
			return sendMessageWTyping(from, { text: "Send less than 11 seconds." }, { quoted: msg });
		}
		const buffer = await downloadMediaMessage(msg, "buffer", {});
		await writeFile(media, buffer);
		await sendImage(media);
	} else {
		sendMessageWTyping(from, { text: `❌ *Reply to sticker only*` }, { quoted: msg });
		console.error("Error not replied");
	}
	async function sendImage(media) {
		const ran = getRandom(".png");
		try {
			const file = ffmpeg(media).save(ran);
			file.on("error", (err) => {
				console.log(err);
				memoryManager.safeUnlink(media);
				memoryManager.safeUnlink(ran);
				sendMessageWTyping(
					from,
					{ text: "❌ There is some problem!\nOnly non-animated stickers can be converted to image!" },
					{ quoted: msg }
				);
			}).on("end", async () => {
				try {
					await sendMessageWTyping(
						from,
						{
							image: ran,
							caption: "Sent by DownloadWorld",
							mimetype: "image/png",
						},
						{ quoted: msg }
					);
				} finally {
					memoryManager.safeUnlink(media);
					memoryManager.safeUnlink(ran);
				}
			});
		} catch (err) {
			memoryManager.safeUnlink(media);
			memoryManager.safeUnlink(ran);
			sendMessageWTyping(from, { text: err.toString() }, { quoted: msg });
			console.log(err);
		}
	}
};

export default () => ({
	cmd: ["image", "toimg"],
	desc: "Convert sticker to image",
	usage: "image | reply to a sticker",
	handler,
});
