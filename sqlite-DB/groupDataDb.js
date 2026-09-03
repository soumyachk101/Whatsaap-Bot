import db from "../sqlite.js";

const group = db.db().collection("Groups");

// Fast In-Memory Cache for Group Data (30s TTL)
const groupCache = new Map();
const CACHE_TTL = 30_000;

const defaultGroupDoc = (groupJid, groupMetadata = {}) => ({
	_id: groupJid,
	isBotOn: false,
	isImgOn: false,
	isChatBotOn: false,
	is91Only: false,
	antilink: false,
	nsfw: false,
	adminOnly: false,
	grpName: groupMetadata?.subject || "Group",
	desc: groupMetadata?.desc ? groupMetadata.desc.toString() : "",
	cmdBlocked: [],
	welcome: "",
	totalMsgCount: 0,
	memberWarnCount: [],
	members: [],
	chatHistory: [],
	dailyStats: [],
});

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

const pendingStatsWrites = new Map();

const flushDailyStats = async (groupJid) => {
	const pending = pendingStatsWrites.get(groupJid);
	if (!pending) return;
	pendingStatsWrites.delete(groupJid);
	try {
		await group.updateOne(
			{ _id: groupJid },
			{ $set: { dailyStats: pending.history } },
			{ upsert: true }
		);
	} catch (err) {
		console.error("[daily group stats flush error]", err.message);
	}
};

const recordGroupDailyStats = async (groupJid, mediaTypeField, date = new Date()) => {
	try {
		const current = await getGroupData(groupJid);
		if (!current || current === -1) return;

		const day = statsDay(date);
		const history = Array.isArray(current.dailyStats) ? current.dailyStats : [];
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

		current.dailyStats = recentHistory;
		const cached = groupCache.get(groupJid);
		if (cached?.data) {
			cached.data.dailyStats = recentHistory;
			cached.timestamp = Date.now();
		}

		if (pendingStatsWrites.has(groupJid)) {
			clearTimeout(pendingStatsWrites.get(groupJid).timer);
		}
		const timer = setTimeout(() => flushDailyStats(groupJid), 5000);
		if (timer.unref) timer.unref();
		pendingStatsWrites.set(groupJid, { history: recentHistory, timer });
	} catch (err) {
		console.error("[daily group stats error]", err.message);
	}
};

const getGroupData = async (groupJid) => {
	if (!groupJid) return null;
	const cached = groupCache.get(groupJid);
	if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
		return cached.data;
	}
	try {
		let res = await group.findOne({ _id: groupJid });
		if (!res) {
			const newDoc = defaultGroupDoc(groupJid);
			try {
				await group.insertOne(newDoc);
				res = newDoc;
			} catch (insertErr) {
				res = await group.findOne({ _id: groupJid }) || newDoc;
			}
		}
		if (res) {
			groupCache.set(groupJid, { data: res, timestamp: Date.now() });
		}
		return res;
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
		return cached ? cached.data : -1;
	}
};

const createGroupData = async (groupJid, groupMetadata = {}) => {
	if (!groupJid) return;
	try {
		const res = await group.findOne({ _id: groupJid });
		if (res == null) {
			const newDoc = defaultGroupDoc(groupJid, groupMetadata);
			try {
				await group.insertOne(newDoc);
			} catch (insertErr) {
				// Concurrent insert occurred
			}
			groupCache.set(groupJid, { data: newDoc, timestamp: Date.now() });
			return newDoc;
		} else {
			const updateFields = {};
			if (groupMetadata?.subject) updateFields.grpName = groupMetadata.subject;
			if (groupMetadata?.desc) updateFields.desc = groupMetadata.desc.toString();
			if (Object.keys(updateFields).length > 0) {
				await group.updateOne({ _id: groupJid }, { $set: updateFields });
			}
			groupCache.delete(groupJid);
			return await getGroupData(groupJid);
		}
	} catch (err) {
		console.error("[groupDataDb error]", err.message);
	}
};

const setGroupWelcome = async (groupJid, welcomeText) => {
	if (!groupJid) return;
	try {
		await getGroupData(groupJid);
		await group.updateOne(
			{ _id: groupJid },
			{ $set: { welcome: welcomeText } },
			{ upsert: true }
		);
		const cached = groupCache.get(groupJid);
		if (cached?.data) {
			cached.data.welcome = welcomeText;
			cached.timestamp = Date.now();
		} else {
			groupCache.delete(groupJid);
		}
	} catch (err) {
		console.error("[setGroupWelcome error]", err.message);
		groupCache.delete(groupJid);
		throw err;
	}
};

const updateGroupData = async (groupJid, update, options = {}) => {
	if (!groupJid) return;
	try {
		await getGroupData(groupJid);
		const res = await group.updateOne({ _id: groupJid }, update, { upsert: true, ...options });
		groupCache.delete(groupJid);
		return res;
	} catch (err) {
		console.error("[updateGroupData error]", err.message);
		groupCache.delete(groupJid);
		throw err;
	}
};

const clearGroupCache = (groupJid) => {
	if (groupJid) groupCache.delete(groupJid);
	else groupCache.clear();
};

export {
	getGroupData,
	createGroupData,
	setGroupWelcome,
	updateGroupData,
	recordGroupDailyStats,
	statsDay,
	group,
	clearGroupCache,
};
