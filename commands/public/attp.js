import { createCanvas, loadImage } from "canvas";
import { Sticker } from "wa-sticker-formatter";
import fs from "fs";

const getRandom = (ext) => `${Math.floor(Math.random() * 10000)}${ext}`;

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;

	if (!args[0] && !msg.message.extendedTextMessage) {
		return sendMessageWTyping(from, { text: `❌ *Enter some text*` }, { quoted: msg });
	}

	let message = evv || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || "";
	if (!message) return;
	message = message.split(":").join("\n");

	const canvas = createCanvas(512, 512);
	const ctx = canvas.getContext("2d");

	// Colors for animation
	const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
	const frames = [];

	// Helper to wrap text
	const wrapText = (text, maxWidth) => {
		const words = text.split(" ");
		const lines = [];
		let currentLine = words[0];

		for (let i = 1; i < words.length; i++) {
			const word = words[i];
			const width = ctx.measureText(currentLine + " " + word).width;
			if (width < maxWidth) {
				currentLine += " " + word;
			} else {
				lines.push(currentLine);
				currentLine = word;
			}
		}
		lines.push(currentLine);
		return lines;
	};

	// Generate 3 frames with different colors (Reduced for stability)
	for (let i = 0; i < 3; i++) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Use sans-serif as it's more likely to be available
		ctx.font = "bold 50px sans-serif";
		const lines = wrapText(message, 280);
		const lineHeight = 60;
		const startY = (canvas.height - (lines.length * lineHeight)) / 2 + 30;

		lines.forEach((line, index) => {
			const y = startY + (index * lineHeight);
			
			ctx.lineWidth = 4;
			ctx.strokeStyle = "#000000";
			ctx.strokeText(line, canvas.width / 2, y);
			
			ctx.fillStyle = colors[i];
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(line, canvas.width / 2, y);
			
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#ffffff";
			ctx.strokeText(line, canvas.width / 2, y);
		});

		frames.push(canvas.toBuffer());
	}

	try {
		// Try to create animated sticker
		const sticker = new Sticker(frames, {
			pack: "✨ ᴅᴏᴡɴʟᴏᴀᴅʙᴜᴅᴅʏ ✨",
			author: "ᴛᴇxᴛ-ᴛᴏ-sᴛɪᴄᴋᴇʀ",
			quality: 20, // Lower quality for animation stability
		});

		const stickerBuffer = await sticker.toBuffer();
		await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
	} catch (err) {
		console.error("Sticker Animation Error:", err);
		
		// FALLBACK: Try to create a high-quality static sticker if animation fails
		try {
			const staticSticker = new Sticker(frames[0], {
				pack: "✨ ᴅᴏᴡɴʟᴏᴀᴅʙᴜᴅᴅʏ ✨",
				author: "ᴛᴇxᴛ-ᴛᴏ-sᴛɪᴄᴋᴇʀ",
				quality: 80,
			});
			const staticBuffer = await staticSticker.toBuffer();
			await sock.sendMessage(from, { sticker: staticBuffer }, { quoted: msg });
		} catch (staticErr) {
			console.error("Static Fallback Error:", staticErr);
			sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
		}
	}
};

export default () => ({
	cmd: ["attp", "textsticker", "ts", "stickertext"],
	desc: "Convert text to sticker (Animated Text To Picture)",
	usage: "attp <text>",
	handler,
});
