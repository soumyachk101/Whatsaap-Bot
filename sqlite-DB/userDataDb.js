import db from "../sqlite.js";

const userData = db.db().collection("UserData");

const ensureUserData = async (jid) => {
	try {
		const res = await userData.findOne({ _id: jid });
		if (res == null) {
			await userData.insertOne({
				_id: jid,
				todos: [],
				notes: [],
				birthday: null, // { day, month, year? }
			});
		} else {
			// Backfill any missing fields
			const updates = {};
			if (!Array.isArray(res.todos)) updates.todos = [];
			if (!Array.isArray(res.notes)) updates.notes = [];
			if (res.birthday === undefined) updates.birthday = null;
			if (Object.keys(updates).length > 0) {
				await userData.updateOne({ _id: jid }, { $set: updates });
			}
		}
	} catch (err) {
		console.error("[userDataDb error]", err.message);
	}
};

const getUserData = async (jid) => {
	try {
		const res = await userData.findOne({ _id: jid });
		if (res) return res;
		return -1;
	} catch (err) {
		console.error("[userDataDb error]", err.message);
		return -1;
	}
};

export { ensureUserData, getUserData, userData };
