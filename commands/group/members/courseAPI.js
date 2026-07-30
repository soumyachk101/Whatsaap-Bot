import axios from "axios";

const COURSE_PAGE_LIMIT = 1000;
const REQUEST_TIMEOUT_MS = 15_000;

const handler = async (_sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix } = msgInfoObj;
	const requestedPage = args[0] || "1";
	const page = Number.parseInt(requestedPage, 10);

	if (!/^\d+$/.test(requestedPage) || page < 1 || page > COURSE_PAGE_LIMIT) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Page number 1 se ${COURSE_PAGE_LIMIT} ke beech dein.\nUsage: ${prefix}un 1` },
			{ quoted: msg }
		);
	}

	try {
		const response = await axios.get("https://cdn.real.discount/api/courses", {
			params: {
				store: "udemy",
				page,
				limit: 15,
				sortBy: "sale_start",
				sortOrder: "desc",
			},
			timeout: REQUEST_TIMEOUT_MS,
			headers: { "User-Agent": "Mozilla/5.0 (compatible; DownloadBuddy/2.2)" },
		});

		const courses = (response.data?.items || [])
			.filter((course) => (
				String(course.store || "").toLowerCase() === "udemy" &&
				course.name &&
				course.url &&
				Number(course.sale_price) === 0
			))
			.slice(0, 10);
		if (courses.length === 0) {
			return sendMessageWTyping(
				from,
				{ text: "❌ Is page par koi Udemy course offer nahi mila. Dusra page try karein." },
				{ quoted: msg }
			);
		}

		const lines = courses.map((course, index) => `${index + 1}. *${course.title}*\n🔗 ${course.url}`);
		const text = [
			"🎓 *Latest Udemy Course Offers*",
			`📄 Page: ${page}`,
			"",
			...lines,
			"",
			`Next page: *${prefix}un ${page + 1}*`,
			"_Course price/coupon checkout par verify karein._",
		].join("\n");

		return sendMessageWTyping(from, { text }, { quoted: msg });
	} catch (error) {
		console.error("[un course lookup error]", error.message);
		return sendMessageWTyping(
			from,
			{ text: "❌ Course service abhi available nahi hai. Thodi der baad try karein." },
			{ quoted: msg }
		);
	}
};

export default () => ({
	cmd: ["un", "udemy"],
	desc: "Show latest Udemy course offers",
	usage: "un [page number]",
	handler,
});
