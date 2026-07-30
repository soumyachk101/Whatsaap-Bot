import db from "../sqlite.js";

const group = db.db().collection("Groups");

const statsDay = (date = new Date()) => {
	const timeZone = process.env.STATS_TIMEZONE || "Asia/Kolkata";
	const parts = new Intl.DateTimeFormat("en", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);
	const value = (type) => parts.find((part) => part.type === type)?.value;
	return `${value("year")}-${value("month")}-${value("day")}`;
};

const emptyDailyStats = (date) => ({
	date,
	totalMsgCount: 0,
	texttotal: 0,
	imagetotal: 0,
	videototal: 0,
	stickertotal: 0,
	pdftotal: 0,
});

/**
 * Stores a compact per-day aggregate. Old documents that predate this feature
 * are kept intact; the latest 180 days are retained for predictable DB size.
 */
const recordGroupDailyStats = async (groupJid, mediaTypeField, date = new Date()) => {
	try {
		const current = await group.findOne({ _id: groupJid });
		if (!current) return;

		const day = statsDay(date);
		const history = Array.isArray(current.dailyStats) ? [...current.dailyStats] : [];
		let daily = history.find((entry) => entry.date === day);
		if (!daily) {
			daily = emptyDailyStats(day);
			history.push(daily);
		}

		daily.totalMsgCount = (Number(daily.totalMsgCount) || 0) + 1;
		daily[mediaTypeField] = (Number(daily[mediaTypeField]) || 0) + 1;
		const recentHistory = history
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-180);

		await group.updateOne({ _id: groupJid }, { $set: { dailyStats: recentHistory } });
	} catch (err) {
		console.error("[daily group stats error]", err.message);
	}
};

const createGroupData = async (groupJid, groupMetadata) => {
	try {
		const res = await group.findOne({ _id: groupJid });
		if (res == null) {
			await group.insertOne({
				_id: groupJid,
				isBotOn: false,
				isImgOn: false,
				isChatBotOn: false,
				is91Only: false,
				antilink: false,
				nsfw: false,
				adminOnly: false,
				grpName: groupMetadata.subject,
				desc: groupMetadata.desc ? groupMetadata.desc.toString() : "",
				cmdBlocked: [],
				welcome: "",
				totalMsgCount: 0,
				memberWarnCount: [],
				members: [],
				chatHistory: [],
				dailyStats: [],
			});
		} else {
			await group.updateOne(
				{ _id: groupJid },
				{
					$set: {
						grpName: groupMetadata.subject,
						desc: groupMetadata.desc ? groupMetadata.desc.toString() : "",
					},
				}
			);
		}
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
	}
};

const getGroupData = async (groupJid) => {
	try {
		const res = await group.findOne({ _id: groupJid });
		return res;
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
		return -1;
	}
};

export { getGroupData, createGroupData, recordGroupDailyStats, statsDay, group };
