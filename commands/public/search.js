import yts from "yt-search";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, prefix } = msgInfoObj;

	let searchQuery = evv ? evv.trim() : "";
	if (!searchQuery && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
		const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
		searchQuery = (quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "").trim();
	}

	if (!searchQuery) {
		return sendMessageWTyping(
			from,
			{ text: `🔍 *Kya search karna hai?*\n\nExample: \`${prefix}search divine gully gang\` or reply to a message with \`${prefix}search\`` },
			{ quoted: msg }
		);
	}

	try {
		const r = await yts(searchQuery);

		let videos = [];
		if (r && Array.isArray(r.videos) && r.videos.length > 0) {
			videos = r.videos.slice(0, 5);
		} else if (r && r.type === "video") {
			videos = [r];
		}

		if (videos.length === 0) {
			return sendMessageWTyping(from, { text: `❌ *Kuch nahi mila for:* \`${searchQuery}\` 😔` }, { quoted: msg });
		}

		let searchMsg = `✅ *Search Results for:* \`${searchQuery}\`\n\n`;
		videos.forEach((v, i) => {
			const title = v.title || "YouTube Video";
			const duration = v.timestamp || v.duration?.timestamp || "N/A";
			const authorName = v.author?.name || v.author || "YouTube Channel";
			const url = v.url || `https://youtube.com/watch?v=${v.videoId}`;

			searchMsg += `*${i + 1}.* ${title}\n`;
			searchMsg += `⏱️ Duration: ${duration} | 👤 ${authorName}\n`;
			searchMsg += `🔗 ${url}\n\n`;
		});

		searchMsg += `💡 *Tip:* Copy any link and use \`${prefix}download <link>\` or \`${prefix}song <link>\` to download!`;

		return sendMessageWTyping(from, { text: searchMsg }, { quoted: msg });
	} catch (error) {
		console.error("Search Error:", error);
		return sendMessageWTyping(from, { text: `❌ *Search failed:* ${error.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["search", "yts"],
	desc: "Search YouTube videos",
	usage: "search <query>",
	handler,
});
