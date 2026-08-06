import session from "express-session";
import db from "./sqlite.js";

const Store = session.Store;
const sessionsCol = db.db().collection("Sessions");

class UniversalSessionStore extends Store {
	constructor() {
		super();
	}

	async get(sid, cb) {
		try {
			const doc = await sessionsCol.findOne({ _id: sid });
			if (!doc || doc.expire < Date.now()) return cb(null, null);
			const sessData = typeof doc.sess === "string" ? JSON.parse(doc.sess) : doc.sess;
			cb(null, sessData);
		} catch (err) {
			cb(err);
		}
	}

	async set(sid, sess, cb) {
		try {
			const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			await sessionsCol.updateOne(
				{ _id: sid },
				{ $set: { sess: JSON.stringify(sess), expire } },
				{ upsert: true }
			);
			cb(null);
		} catch (err) {
			cb(err);
		}
	}

	async destroy(sid, cb) {
		try {
			await sessionsCol.deleteMany({ _id: sid });
			cb(null);
		} catch (err) {
			cb(err);
		}
	}

	async touch(sid, sess, cb) {
		try {
			const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			await sessionsCol.updateOne({ _id: sid }, { $set: { expire } });
			cb(null);
		} catch (err) {
			cb(err);
		}
	}
}

export default UniversalSessionStore;
