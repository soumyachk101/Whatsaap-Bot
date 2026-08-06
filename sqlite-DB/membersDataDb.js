import db from "../sqlite.js";

const member = db.db().collection("Members");

const createMembersData = async (jid, name) => {
	try {
		let res = await member.findOne({ _id: jid });

		if (res == null) {
			await member.insertOne({
				_id: jid,
				username: name,
				isBlock: false,
				totalmsg: 0,
				texttotal: 0,
				imagetotal: 0,
				videototal: 0,
				stickertotal: 0,
				pdftotal: 0,
				dmLimit: 99999,
				warning: [],
				xp: 0,
			});
		} else {
			await member.updateOne(
				{ _id: jid },
				{
					$set: {
						username: name,
					},
				}
			);
			// Backfill xp for users created before leveling system existed
			if (typeof res.xp !== "number") {
				await member.updateOne({ _id: jid }, { $set: { xp: 0 } });
			}
		}
	} catch (err) {
		console.error("[membersDataDb error]", err.message);
	}
};

// Fast In-Memory Cache for Member Data (30s TTL)
const memberCache = new Map();
const CACHE_TTL = 30_000;

const getMemberData = async (jid) => {
	const cached = memberCache.get(jid);
	if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
		return cached.data;
	}
	try {
		let res = await member.findOne({ _id: jid });
		if (res) {
			memberCache.set(jid, { data: res, timestamp: Date.now() });
			return res;
		}
		return -1;
	} catch (err) {
		console.error("[membersDataDb error]", err.message);
		return cached ? cached.data : -1;
	}
};

const clearMemberCache = (jid) => {
	if (jid) memberCache.delete(jid);
	else memberCache.clear();
};

export { createMembersData, getMemberData, member, clearMemberCache };

