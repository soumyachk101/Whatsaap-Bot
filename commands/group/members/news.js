import axios from "axios";
import inshorts from "inshorts-api";
const readMore = String.fromCharCode(8206).repeat(4000);

const fetchInshortsNews = async (category) => {
	const cat = category || "all";
	try {
		const res = await axios.get(`https://inshortsapi.vercel.app/news?category=${cat}`, { timeout: 10000 });
		if (res.data && res.data.success && Array.isArray(res.data.data)) {
			return res.data.data.map(item => ({
				title: item.title,
				author: item.author || "Inshorts",
				content: item.content,
			}));
		}
	} catch (e) {
		console.warn("Direct Inshorts API failed, trying legacy package:", e.message);
	}

	return new Promise((resolve) => {
		try {
			inshorts.get({ lang: "en", category: category || "", numOfResults: 10 }, (result) => {
				if (result && Array.isArray(result) && result.length > 0) {
					resolve(result);
				} else {
					resolve(null);
				}
			});
		} catch (_) {
			resolve(null);
		}
	});
};

const handler = async (sock, msg, from, args, msgInfoObj) => {
	const { prefix, command, sendMessageWTyping } = msgInfoObj;

	let arr = [
		"national",
		"business",
		"sports",
		"world",
		"politics",
		"technology",
		"startup",
		"entertainment",
		"miscellaneous",
		"hatke",
		"science",
		"automobile",
	];

	if (command == "categories") {
		return sendMessageWTyping(
			from,
			{
				text: `📋 *News Categories*\n\n${arr.map((e, i) => `${i + 1}. ${e.charAt(0).toUpperCase() + e.slice(1)}`).join("\n")}\n\n_Usage: news <category>_`,
			},
			{ quoted: msg }
		);
	}

	let newsType = (args[0] || "").toLowerCase();

	if (!arr.includes(newsType) && newsType != "") {
		return sendMessageWTyping(
			from,
			{ text: `❌ *Invalid category:* _${newsType}_\n\nUse *${prefix}categories* to see all available categories.` },
			{ quoted: msg }
		);
	}

	try {
		const articles = await fetchInshortsNews(newsType);
		if (!articles || articles.length === 0) {
			return sendMessageWTyping(from, { text: "❌ No news found for this category right now." }, { quoted: msg });
		}

		const categoryName = newsType === "" ? "Top Stories" : newsType.charAt(0).toUpperCase() + newsType.slice(1);
		let message = `📰 *${categoryName} News*\n${readMore}`;
		articles.slice(0, 10).forEach((news, i) => {
			message += `${i + 1}. *${news.title || "Untitled"}*\n   _— ${news.author || "Unknown"}_\n\n`;
		});

		sendMessageWTyping(from, { text: message.trim() }, { quoted: msg });
	} catch (err) {
		console.error("News error:", err);
		sendMessageWTyping(from, { text: `❌ Error fetching news: ${err.message}` }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["news", "categories", "cate"],
	desc: "Get news",
	usage: "news | news <category> | categories",
	handler,
});
