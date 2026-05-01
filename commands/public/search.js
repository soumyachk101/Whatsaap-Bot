import yts from "yt-search";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv, prefix } = msgInfoObj;

	if (!evv) {
		return sendMessageWTyping(from, { text: `🔍 *Kya search karna hai?*\n\nExample: \`${prefix}search divine gully gang\`` }, { quoted: msg });
	}

	try {
		await sendMessageWTyping(from, { text: `🔍 *Searching for:* \`${evv}\`...` }, { quoted: msg });

		const r = await yts(evv);
		const videos = r.videos.slice(0, 5);

		if (videos.length === 0) {
			return sendMessageWTyping(from, { text: "❌ *Kuch nahi mila!* 😔" }, { quoted: msg });
		}

		let searchMsg = `✅ *Search Results for:* \`${evv}\`\n\n`;
		videos.forEach((v, i) => {
			searchMsg += `*${i + 1}.* ${v.title}\n`;
			searchMsg += `⏱️ Duration: ${v.timestamp} | 👤 ${v.author.name}\n`;
			searchMsg += `🔗 ${v.url}\n\n`;
		});

		searchMsg += `💡 *Tip:* Use \`${prefix}mp4 <link>\` or \`${prefix}mp3 <link>\` to download!`;

		return sendMessageWTyping(from, { text: searchMsg }, { quoted: msg });
	} catch (error) {
		console.error("Search Error:", error);
		return sendMessageWTyping(from, { text: "❌ *Search failed!* 🙏" }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["search", "yts"],
	desc: "Search YouTube videos",
	usage: "search <query>",
	handler,
});
