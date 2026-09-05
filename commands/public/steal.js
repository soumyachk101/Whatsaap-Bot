import { getMemberData } from "../../sqlite-DB/membersDataDb.js";
import { downloadContentFromMessage } from "baileys";
import WSF from "wa-sticker-formatter";

import fs from "fs";
import memoryManager from "../../functions/memoryUtils.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { evv, sendMessageWTyping, senderJid, command } = msgInfoObj;
	const memberData = await getMemberData(senderJid);

	const stickerMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;

	if (stickerMsg) {
		let packName = "SOUMYA";
		let authorName = "DownloadWorld";
		const fullArgs = args.join(" ");
		if (args.includes("pack")) {
			const afterPack = fullArgs.split(/\bpack\s+/i)[1];
			if (afterPack) packName = afterPack.split(/\bauthor\b/i)[0].trim() || packName;
		}

		if (args.includes("author")) {
			const afterAuthor = fullArgs.split(/\bauthor\s+/i)[1];
			if (afterAuthor) authorName = afterAuthor.split(/\bpack\b/i)[0].trim() || authorName;
		}

		let media = null;
		try {
			const stream = await downloadContentFromMessage(stickerMsg, "sticker");
			let buffer = Buffer.from([]);
			for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

			media = memoryManager.generateTempFileName(".webp");
			await fs.promises.writeFile(media, buffer);

			const packOrAuthor = args.includes("pack") || args.includes("author");

			let webpWithMetadata;
			try {
				webpWithMetadata =
					command === "stealn"
						? await WSF.setMetadata(undefined, undefined, media)
						: await WSF.setMetadata(
								packOrAuthor ? packName : evv ? evv : memberData?.customStealText || "SOUMYA",
								packOrAuthor
									? authorName
									: evv
									? ""
									: memberData?.customStealText
									? undefined
									: "DownloadWorld",
								media
						  );
				await sock.sendMessage(from, { sticker: Buffer.from(webpWithMetadata) }, { quoted: msg });
			} catch (error) {
				console.error("Error setting metadata:", error);
				return sendMessageWTyping(from, { text: `❌ *Error setting metadata*` }, { quoted: msg });
			}
		} finally {
			if (media) memoryManager.safeUnlink(media);
		}
	} else {
		return sendMessageWTyping(from, { text: `❌ *Reply on Sticker*` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["steal", "stealn"],
	desc: "Steal stickers with custom pack and author names or default ones.",
	usage: "steal | steal pack <name> author <name>",
	handler,
});
