const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping } = msgInfoObj;
	try {
		const typeOfNews = [
			"world",
			"national",
			"business",
			"sports",
			"politics",
			"technology",
			"startup",
			"entertainment",
			"miscellaneous",
			"hatke",
			"science",
			"automobile",
		];

		sendMessageWTyping(
			from,
			{
				text: `📰 *News Categories:*\n\n` + typeOfNews.map((e, i) => `${i + 1}. ${e}`).join("\n"),
			},
			{ quoted: msg }
		);
	} catch (err) {
		console.error("News categories error:", err);
		sendMessageWTyping(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["newscategories", "newscate"],
	desc: "Get news categories",
	usage: "newscategories",
	handler,
});
