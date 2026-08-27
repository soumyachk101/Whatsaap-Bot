import {
	box,
	brandedFooter,
	sectionHeader,
	sendWithTyping,
} from "../../functions/messageFormatter.js";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, updateName, prefix } = msgInfoObj;
	try {
		const response =
`🎬 *DOWNLOADBUDDY*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hey *${updateName || "User"}*! 👋
Your one-stop WhatsApp media downloader

${sectionHeader("🎬", "Media")}
 ▸ \`${prefix}mp4 <link>\` — HD Video
 ▸ \`${prefix}mp3 <link>\` — Audio extract
 ▸ \`${prefix}attp <text>\` — Sticker text

${sectionHeader("🔍", "Search")}
 ▸ \`${prefix}search <query>\` — Find YouTube
 ▸ \`${prefix}yts <query>\` — YT Search
 ▸ \`${prefix}news\` — Latest headlines

${sectionHeader("🤖", "AI & Chat")}
 ▸ \`${prefix}chatbot <text>\` — Talk to AI
 ▸ \`${prefix}gemini <text>\` — Gemini
 ▸ \`${prefix}imagine <prompt>\` — AI Image

${sectionHeader("🛠️", "Tools")}
 ▸ \`${prefix}sticker\` — Image → sticker
 ▸ \`${prefix}qr\` — QR Code gen
 ▸ \`${prefix}weather <city>\` — Forecast

📲 *Supports:* YouTube · Instagram · Facebook · Twitter · TikTok${brandedFooter()}`;

		return sendMessageWTyping(from, { text: response }, { quoted: msg });
	} catch (err) {
		console.error("Start command error:", err);
		return sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["start"],
	desc: "Show welcome menu",
	usage: "start",
	handler,
});
