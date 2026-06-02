import dotenv from "dotenv";
dotenv.config();
const REMOVE_BG_KEY = process.env.REMOVE_BG_KEY || "";

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
const removebgAPI = REMOVE_BG_KEY;
import { writeFile } from "fs/promises";

import { downloadContentFromMessage } from "baileys";

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const getRemoveBg = async (Path, outputPath) => {
	const inputPath = `./${Path}`;
	const formData = new FormData();
	formData.append("size", "auto");
	formData.append("image_file", fs.createReadStream(inputPath), path.basename(inputPath));
	const response = await axios({
		method: "post",
		url: "https://api.remove.bg/v1.0/removebg",
		data: formData,
		responseType: "arraybuffer",
		headers: {
			...formData.getHeaders(),
			"X-Api-Key": removebgAPI,
		},
		encoding: null,
	});
	if (response.status != 200) throw new Error("Remove.bg API returned status " + response.status);
	await fs.promises.writeFile(outputPath, response.data);
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { type, content, sendMessageWTyping } = msgInfoObj;

	if (!REMOVE_BG_KEY)
		return sendMessageWTyping(from, { text: "```Remove BG API Key is Missing```" }, { quoted: msg });

	const isTaggedImage = type === "extendedTextMessage" && content.includes("imageMessage");

	if (isTaggedImage || msg.message.imageMessage) {
		let downloadFilePath;
		if (msg.message.imageMessage) {
			downloadFilePath = msg.message.imageMessage;
		} else {
			downloadFilePath = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
		}
		const stream = await downloadContentFromMessage(downloadFilePath, "image");
		let buffer = Buffer.from([]);
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk]);
		}
		const media = getRandom(".jpeg");
		const outputFile = getRandom(".png");
		await writeFile(media, buffer);
		try {
			await getRemoveBg(media, outputFile);
			await sock.sendMessage(from, {
				image: await fs.promises.readFile(outputFile),
				mimetype: "image/png",
				caption: `*Sent by DownloadWorld*`,
			}, { quoted: msg });
		} catch (err) {
			sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		} finally {
			try { fs.unlinkSync(media); } catch {}
			try { fs.unlinkSync(outputFile); } catch {}
		}
	} else {
		sendMessageWTyping(from, { text: `*Reply to image only*` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["removebg", "bg"],
	desc: "Remove background from image",
	usage: "removebg | reply to image",
	handler,
});
