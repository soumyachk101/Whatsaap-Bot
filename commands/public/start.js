const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, updateName, prefix } = msgInfoObj;
	
	const welcomeText = (
		`╭━━━━━━━━━━━━━━━━━━━╮\n` +
		`  ⚡ *EVERYTHING DOWNLOADER* ⚡\n` +
		`╰━━━━━━━━━━━━━━━━━━━╯\n\n` +
		`👋 *Hey ${updateName || "Bhai"}!*\n` +
		`_Your one-stop media downloader_ 🎬\n\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`🌟 *WHAT I CAN DO*\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`🎬  HD Video downloads\n` +
		`🎵  MP3 / Audio extraction\n` +
		`🔍  YouTube search engine\n` +
		`🤖  AI fun modes (Roast • Rap • Shayari)\n` +
		`🌐  Instant translation\n` +
		`⏰  Smart reminders\n\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`⚡ *QUICK START*\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`📌 \`${prefix}mp4 <link>\` → Download Video\n` +
		`📌 \`${prefix}mp3 <link>\` → Download Audio\n` +
		`📌 \`${prefix}search <query>\` → Find YT videos\n` +
		`📌 \`${prefix}roast <name>\` → Savage AI Roast\n\n` +
		`_Supports: YouTube • Instagram • Facebook • Twitter • TikTok_`
	);

	return sendMessageWTyping(from, { text: welcomeText }, { quoted: msg });
};

export default () => ({
	cmd: ["start", "menu"],
	desc: "Show professional welcome menu",
	usage: "start",
	handler,
});
