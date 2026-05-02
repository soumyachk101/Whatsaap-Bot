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

	// Generate 4 frames with high-end effects
	for (let i = 0; i < 4; i++) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// Dynamic font scaling
		let fontSize = message.length > 50 ? 30 : message.length > 20 ? 40 : 55;
		ctx.font = `bold ${fontSize}px sans-serif`;
		
		const lines = wrapText(message, 350);
		const lineHeight = fontSize + 10;
		const startY = (canvas.height - (lines.length * lineHeight)) / 2 + (fontSize/2);

		lines.forEach((line, index) => {
			const y = startY + (index * lineHeight);
			
			// 1. Neon Glow Shadow
			ctx.shadowColor = colors[i];
			ctx.shadowBlur = 15;
			ctx.lineWidth = 6;
			ctx.strokeStyle = "#000000";
			ctx.strokeText(line, canvas.width / 2, y);
			
			// 2. Main Rainbow Text
			const gradient = ctx.createLinearGradient(0, y - fontSize/2, canvas.width, y + fontSize/2);
			gradient.addColorStop(0, colors[i]);
			gradient.addColorStop(0.5, colors[(i + 1) % colors.length]);
			gradient.addColorStop(1, colors[(i + 2) % colors.length]);
			
			ctx.shadowBlur = 0; // Reset blur for main text
			ctx.fillStyle = gradient;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(line, canvas.width / 2, y);
			
			// 3. Inner Glossy Detail
			ctx.lineWidth = 1;
			ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
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

		await sticker.build();
		const stickerBuffer = await sticker.get();
		await sock.sendMessage(from, { sticker: Buffer.from(stickerBuffer) }, { quoted: msg });
	} catch (err) {
		console.error("Sticker Animation Error:", err);
		
		// FALLBACK: Try to create a high-quality static sticker if animation fails
		try {
			const staticSticker = new Sticker(frames[0], {
				pack: "✨ ᴅᴏᴡɴʟᴏᴀᴅʙᴜᴅᴅʏ ✨",
				author: "ᴛᴇxᴛ-ᴛᴏ-sᴛɪᴄᴋᴇʀ",
				quality: 80,
			});
			await staticSticker.build();
			const staticBuffer = await staticSticker.get();
			await sock.sendMessage(from, { sticker: Buffer.from(staticBuffer) }, { quoted: msg });
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
