import { downloadMediaMessage, proto } from "baileys";
import WSF from "wa-sticker-formatter";

import fs from "fs";
const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`;
};

const forwardGroup = ""; // Group ID
// const forwardGroup = "120363419598823083@newsletter"; // Group ID

const ignoreGroup = ["", ""]; // Group ID with commas

const stickerLengthArray = [];

const stickerForward = async (sock, msg, from) => {
	if (!forwardGroup || ignoreGroup.includes(from) || from === forwardGroup) return;

	if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		msg["message"] = msg.message.extendedTextMessage.contextInfo.quotedMessage;
	}

	console.log("Message:", msg.message);

	const packName = "SOUMYA";
	const authorName = "Bot";

	if (!msg.message?.stickerMessage) return;

	const messageToChannel = proto.Message.encode({
		stickerMessage: {
			url: msg.message.stickerMessage.url,
			fileSha256: msg.message.stickerMessage.fileSha256,
			fileLength: msg.message.stickerMessage.fileLength,
			mimetype: msg.message.stickerMessage.mimetype,
			height: msg.message.stickerMessage.height,
			width: msg.message.stickerMessage.width,
			mediaKey: msg.message.stickerMessage.mediaKey,
			type: 4,
		},
	}).finish();

	const plaintextNode = {
		tag: "message",
		attrs: {
			to: forwardGroup,
			type: "text",
		},
		content: [
			{
				tag: "sticker",
				attrs: {},
				content: messageToChannel,
			},
		],
	};

	console.log("Sending sticker to group:", JSON.stringify(plaintextNode, null, 2));

	await sock.query(plaintextNode).then(async (result) => {
		console.error(result);
	}).catch((err) => console.error("Sticker forward error:", err));
};

export { stickerForward, forwardGroup };
