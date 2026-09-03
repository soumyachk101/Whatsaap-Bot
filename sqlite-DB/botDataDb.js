import db from "../sqlite.js";

const bot = db.db().collection("AuthTable");

const botCache = new Map();
const CACHE_TTL = 300_000;

const createBotData = async () => {
	try {
		const res = await bot.findOne({ _id: "bot" });
		if (res == null) {
			const newDoc = {
				_id: "bot",
				youtube_session: "",
				disabledGlobally: [],
				maintenanceMode: false,
			};
			await bot.insertOne(newDoc);
			botCache.set("bot", { data: newDoc, timestamp: Date.now() });
		} else if (!("maintenanceMode" in res)) {
			// Migrate existing records
			await bot.updateOne({ _id: "bot" }, { $set: { maintenanceMode: false } });
		}
	} catch (err) {
		console.log(err);
	}
};

const getBotData = async () => {
	const cached = botCache.get("bot");
	if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
		return cached.data;
	}
	try {
		const res = await bot.findOne({ _id: "bot" });
		if (res) {
			botCache.set("bot", { data: res, timestamp: Date.now() });
		}
		return res;
	} catch (err) {
		return cached ? cached.data : -1;
	}
};

const clearBotCache = () => {
	botCache.clear();
};

export { getBotData, createBotData, bot, clearBotCache };
