import session from "express-session";
import Database from "better-sqlite3";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
let resolvedDbPath = join(__dirname, "database.db");
if (process.env.DATABASE_PATH) {
	try {
		const targetDir = dirname(process.env.DATABASE_PATH);
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}
		if (!fs.existsSync(process.env.DATABASE_PATH)) {
			const defaultDb = join(__dirname, "database.db");
			if (fs.existsSync(defaultDb)) {
				fs.copyFileSync(defaultDb, process.env.DATABASE_PATH);
			}
		}
		resolvedDbPath = process.env.DATABASE_PATH;
	} catch (e) {
		console.warn("⚠️ Could not access persistent database in session store, using local fallback:", e.message);
		resolvedDbPath = join(__dirname, "database.db");
	}
}

const sqliteDb = new Database(resolvedDbPath);

sqliteDb.exec(`
	CREATE TABLE IF NOT EXISTS Sessions (
		sid TEXT PRIMARY KEY,
		sess TEXT NOT NULL,
		expire INTEGER NOT NULL
	);
`);

class SQLiteSessionStore extends session.Store {
	get(sid, cb) {
		try {
			const row = sqliteDb.prepare("SELECT * FROM Sessions WHERE sid = ?").get(sid);
			if (!row || row.expire < Date.now()) return cb(null, null);
			const data = JSON.parse(row.sess);
			cb(null, data);
		} catch (err) {
			console.warn("Session read warning:", err.message);
			cb(null, null);
		}
	}

	set(sid, sess, cb) {
		try {
			const expire = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			sqliteDb.prepare("INSERT OR REPLACE INTO Sessions (sid, sess, expire) VALUES (?, ?, ?)").run(
				sid,
				JSON.stringify(sess),
				expire
			);
			if (cb) cb(null);
		} catch (err) {
			console.warn("Session write warning:", err.message);
			if (cb) cb(null);
		}
	}

	destroy(sid, cb) {
		try {
			sqliteDb.prepare("DELETE FROM Sessions WHERE sid = ?").run(sid);
			if (cb) cb(null);
		} catch (err) {
			if (cb) cb(null);
		}
	}

	touch(sid, sess, cb) {
		try {
			const expire = sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 86400000;
			sqliteDb.prepare("UPDATE Sessions SET expire = ? WHERE sid = ?").run(expire, sid);
			if (cb) cb(null);
		} catch (err) {
			if (cb) cb(null);
		}
	}
}

export default SQLiteSessionStore;
