import { downloadMediaMessage } from "baileys";
import { checkNSFW } from "../../../functions/nsfwFilter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { type, content, sendMessageWTyping } = msgInfoObj;

	let messageToDownload = msg;
	if (msg.message.extendedTextMessage) {
		messageToDownload = {
			key: msg.key,
			message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
		};
	}

	const isImage = type === "imageMessage" || (type === "extendedTextMessage" && content.includes("imageMessage"));

	if (!isImage && !msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
		return sendMessageWTyping(from, { text: "❌ Please reply to an image to check for NSFW content." }, { quoted: msg });
	}

	try {
		await sendMessageWTyping(from, { text: "🔍 Analyzing image... please wait." }, { quoted: msg });
		
		const buffer = await downloadMediaMessage(messageToDownload, "buffer", {});
		if (!buffer) throw new Error("Failed to download image.");

		const isNSFW = await checkNSFW(buffer);
		
		const resultText = isNSFW 
			? "🔞 *Result:* NSFW Detected! This image contains sexually explicit content." 
			: "✅ *Result:* Clean. No NSFW content detected.";
			
		await sendMessageWTyping(from, { text: resultText }, { quoted: msg });
	} catch (error) {
		console.error("[NSFW Command Error]", error.message);
		await sendMessageWTyping(from, { text: "❌ Error analyzing image. Make sure GOOGLE_API_KEY is set." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["nsfw"],
	desc: "Check if an image is NSFW (sexually explicit).",
	usage: "nsfw (reply to an image)",
	handler,
});
