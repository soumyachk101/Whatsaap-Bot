import { getGroupData, statsDay } from "../../../sqlite-DB/groupDataDb.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

const parseDay = (input) => {
	const value = (input || "today").toLowerCase();
	if (value === "today" || value === "aaj") return statsDay();
	if (value === "yesterday" || value === "kal") {
		const date = new Date();
		date.setDate(date.getDate() - 1);
		return statsDay(date);
	}
	if (DATE_PATTERN.test(value)) return value;
	const displayMatch = value.match(DISPLAY_DATE_PATTERN);
	if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
	return null;
};

const displayDate = (date) => {
	const [year, month, day] = date.split("-");
	return `${day}-${month}-${year}`;
};

const handler = async (_sock, msg, from, args, msgInfoObj) => {
	const { sendMessageWTyping, prefix } = msgInfoObj;
	const day = parseDay(args[0]);
	if (!day) {
		return sendMessageWTyping(
			from,
			{ text: `❌ Date format sahi nahi hai.\nUsage: ${prefix}daystats [today|yesterday|YYYY-MM-DD|DD-MM-YYYY]` },
			{ quoted: msg }
		);
	}

	try {
		const groupData = await getGroupData(from);
		const entry = groupData?.dailyStats?.find((item) => item.date === day);
		if (!entry) {
			return sendMessageWTyping(
				from,
				{ text: `📊 *${displayDate(day)}* ke liye koi tracked messages nahi mile.\n_Stats is feature ke enable hone ke baad se record hote hain._` },
				{ quoted: msg }
			);
		}

		const text = [
			`📊 *Daily Group Stats — ${displayDate(day)}*`,
			`🏷️ *Group:* ${groupData.grpName || "Current Group"}`,
			"",
			`💬 *Total Messages:* ${entry.totalMsgCount || 0}`,
			`📝 Text: ${entry.texttotal || 0}`,
			`🖼️ Images: ${entry.imagetotal || 0}`,
			`🎥 Videos: ${entry.videototal || 0}`,
			`🎭 Stickers: ${entry.stickertotal || 0}`,
			`📄 Documents: ${entry.pdftotal || 0}`,
		].join("\n");

		return sendMessageWTyping(from, { text }, { quoted: msg });
	} catch (error) {
		console.error("[daystats error]", error.message);
		return sendMessageWTyping(from, { text: "❌ Daily stats fetch nahi ho paya. Please try again." }, { quoted: msg });
	}
};

export default () => ({
	cmd: ["daystats", "dailystats", "daily"],
	desc: "View group message stats for a day",
	usage: "daystats [today|yesterday|YYYY-MM-DD]",
	handler,
});
