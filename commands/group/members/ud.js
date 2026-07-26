import axios from "axios";

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, evv } = msgInfoObj;
	if (!args[0]) return sendMessageWTyping(from, { text: `❌ *Provide a word or phrase to search*\n\nExample: -ud flex` }, { quoted: msg });
	try {
		const term = evv || args.join(" ");
		const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`, { timeout: 10000 });
		const list = res.data?.list;
		if (!list || list.length === 0) {
			return sendMessageWTyping(from, { text: `❌ No Urban Dictionary definition found for: *${term}*` }, { quoted: msg });
		}
		const first = list[0];
		const cleanDef = (first.definition || "").replace(/\[|\]/g, "");
		const cleanExample = (first.example || "").replace(/\[|\]/g, "");

		sendMessageWTyping(
			from,
			{
				text: `📖 *Urban Dictionary*\n\n🏷️ *Term:* ${first.word}\n\n📝 *Definition:*\n${cleanDef}\n\n💬 *Example:*\n_${cleanExample || "N/A"}_`,
			},
			{ quoted: msg }
		);
	} catch (err) {
		console.error("Urban dictionary error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["ud", "urban"],
	desc: "Get Urban Dictionary meaning",
	usage: "ud <word>",
	handler,
});
