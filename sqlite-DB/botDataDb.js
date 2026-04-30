import db from "../sqlite.js";

const bot = db.db().collection("AuthTable");

const createBotData = async () => {
	try {
		const res = await bot.findOne({ _id: "bot" });
		if (res == null) {
			await bot.insertOne({
				_id: "bot",
				youtube_session: "",
				disabledGlobally: [],
			});
		}
	} catch (err) {
		console.log(err);
	}
};

const getBotData = async () => {
	try {
		const res = await bot.findOne({ _id: "bot" });
		return res;
	} catch (err) {
		return -1;
	}
};

export { getBotData, createBotData, bot };
