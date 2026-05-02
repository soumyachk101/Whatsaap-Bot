import session from "express-session";
import db from "./sqlite.js";

const Store = session.Store;

class SQLiteSessionStore extends Store {
	constructor() {
		super();
		// The db is the better-sqlite3 instance from sqlite.js
		db.exec(`
            CREATE TABLE IF NOT EXISTS Sessions (
                sid TEXT PRIMARY KEY,
                sess TEXT NOT NULL,
                expire INTEGER NOT NULL
            )
        `);

		// Periodic cleanup of expired sessions
		setInterval(() => {
			try {
				db.prepare("DELETE FROM Sessions WHERE expire < ?").run(Date.now());
			} catch (err) {
				console.error("Session cleanup error:", err);
			}
		}, 3600000); // Every hour
	}

	get(sid, cb) {
		try {
			const row = db.prepare("SELECT sess FROM Sessions WHERE sid = ? AND expire > ?").get(sid, Date.now());
			if (!row) return cb(null, null);
			cb(null, JSON.parse(row.sess));
		} catch (err) {
			cb(err);
		}
	}

	set(sid, sess, cb) {
		try {
			const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			db.prepare("INSERT OR REPLACE INTO Sessions (sid, sess, expire) VALUES (?, ?, ?)").run(sid, JSON.stringify(sess), expire);
			cb(null);
		} catch (err) {
			cb(err);
		}
	}

	destroy(sid, cb) {
		try {
			db.prepare("DELETE FROM Sessions WHERE sid = ?").run(sid);
			cb(null);
		} catch (err) {
			cb(err);
		}
	}

	touch(sid, sess, cb) {
		try {
			const expire = sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			db.prepare("UPDATE Sessions SET expire = ? WHERE sid = ?").run(expire, sid);
			cb(null);
		} catch (err) {
			cb(err);
		}
	}
}

export default SQLiteSessionStore;
