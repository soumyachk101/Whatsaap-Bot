import { BufferJSON, initAuthCreds, proto } from "baileys";
import db from "../sqlite.js";

const useSQLiteAuthState = async () => {
	const readData = (id) => {
		const row = db.prepare("SELECT value FROM AuthState WHERE id = ?").get(id);
		if (!row) return null;
		return JSON.parse(row.value, BufferJSON.reviver);
	};

	const writeData = (id, value) => {
		const jsonValue = JSON.stringify(value, BufferJSON.replacer);
		db.prepare("INSERT OR REPLACE INTO AuthState (id, value) VALUES (?, ?)").run(id, jsonValue);
	};

	const creds = readData("creds") || initAuthCreds();

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data = {};
					for (const id of ids) {
						let value = readData(`${type}-${id}`);
						if (type === "app-state-sync-key" && value) {
							value = proto.Message.AppStateSyncKeyData.fromObject(value);
						}
						data[id] = value;
					}
					return data;
				},
				set: async (data) => {
					for (const category in data) {
						for (const id in data[category]) {
							const value = data[category][id];
							const key = `${category}-${id}`;
							if (value == null) {
								db.prepare("DELETE FROM AuthState WHERE id = ?").run(key);
							} else {
								writeData(key, value);
							}
						}
					}
				},
			},
		},
		saveCreds: async () => {
			writeData("creds", creds);
		},
		cleanup: () => {
			// SQLite doesn't need much cleanup here since we aren't using a background flush for now
		},
	};
};

const clearSQLiteAuthState = () => {
	db.prepare("DELETE FROM AuthState").run();
	console.log("🗑️ SQLite Auth State cleared");
};

export { useSQLiteAuthState, clearSQLiteAuthState };
