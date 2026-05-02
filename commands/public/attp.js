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

	// Generate 6 frames with different colors
	for (let i = 0; i < 6; i++) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Set font once to measure
		ctx.font = "bold 70px Arial";
		const lines = wrapText(message, 450);
		const lineHeight = 80;
		const startY = (canvas.height - (lines.length * lineHeight)) / 2 + 40;

		lines.forEach((line, index) => {
			const y = startY + (index * lineHeight);
			
			// Text Shadow/Outline for visibility
			ctx.lineWidth = 5;
			ctx.strokeStyle = "#000000";
			ctx.strokeText(line, canvas.width / 2, y);
			
			ctx.fillStyle = colors[i];
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(line, canvas.width / 2, y);
			
			// Inner white glow
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#ffffff";
			ctx.strokeText(line, canvas.width / 2, y);
		});

		frames.push(canvas.toBuffer("image/png"));
	}

	try {
		const sticker = new Sticker(frames, {
			pack: "✨ ᴅᴏᴡɴʟᴏᴀᴅʙᴜᴅᴅʏ ✨",
			author: "ᴛᴇxᴛ-ᴛᴏ-sᴛɪᴄᴋᴇʀ",
			type: "full",
			quality: 50,
		});

		const stickerBuffer = await sticker.toBuffer();
		await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
	} catch (err) {
		console.error("Sticker Error:", err);
		sendMessageWTyping(from, { text: "❌ Failed to create animated sticker." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["attp", "textsticker", "ts", "stickertext"],
	desc: "Convert text to sticker (Animated Text To Picture)",
	usage: "attp <text>",
	handler,
});
