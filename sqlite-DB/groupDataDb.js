import db from "../sqlite.js";

const group = db.db().collection("Groups");

// Fast In-Memory Cache for Group Data (30s TTL)
const groupCache = new Map();
const CACHE_TTL = 30_000;

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

const recordGroupDailyStats = async (groupJid, mediaTypeField, date = new Date()) => {
	try {
		const current = await getGroupData(groupJid);
		if (!current || current === -1) return;

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
		groupCache.delete(groupJid);
	} catch (err) {
		console.error("[daily group stats error]", err.message);
	}
};

const getGroupData = async (groupJid) => {
	const cached = groupCache.get(groupJid);
	if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
		return cached.data;
	}
	try {
		const res = await group.findOne({ _id: groupJid });
		if (res) {
			groupCache.set(groupJid, { data: res, timestamp: Date.now() });
		}
		return res;
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
		return cached ? cached.data : -1;
	}
};

const createGroupData = async (groupJid, groupMetadata) => {
	try {
		const res = await getGroupData(groupJid);
		if (res == null || res === -1) {
			const newDoc = {
				_id: groupJid,
				isBotOn: true,
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
			};
			await group.insertOne(newDoc);
			groupCache.set(groupJid, { data: newDoc, timestamp: Date.now() });
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
			groupCache.delete(groupJid);
		}
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
	}
};

const clearGroupCache = (groupJid) => {
	if (groupJid) groupCache.delete(groupJid);
	else groupCache.clear();
};

export { getGroupData, createGroupData, recordGroupDailyStats, statsDay, group, clearGroupCache };
