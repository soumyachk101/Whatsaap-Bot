import db from "../sqlite.js";
import { proto } from "baileys";
import { BufferJSON } from "baileys";

const useSQLiteAuthState = async () => {
	const writeData = (data, id) => {
		const value = JSON.stringify(data, BufferJSON.replacer);
		db.prepare("INSERT OR REPLACE INTO AuthState (id, value) VALUES (?, ?)").run(id, value);
	};

	const readData = (id) => {
		const row = db.prepare("SELECT value FROM AuthState WHERE id = ?").get(id);
		if (!row) return null;
		return JSON.parse(row.value, BufferJSON.reviver);
	};

	const removeData = (id) => {
		db.prepare("DELETE FROM AuthState WHERE id = ?").run(id);
	};

	const creds = readData("creds") || {
		noiseKey: proto.KeyPair.fromObject({
			public: new Uint8Array(32),
			private: new Uint8Array(32),
		}),
		signedIdentityKey: proto.KeyPair.fromObject({
			public: new Uint8Array(32),
			private: new Uint8Array(32),
		}),
		signedPreKey: {
			keyPair: proto.KeyPair.fromObject({
				public: new Uint8Array(32),
				private: new Uint8Array(32),
			}),
			signature: new Uint8Array(64),
			keyId: 0,
		},
		registrationId: 0,
		advSecretKey: "",
		nextPreKeyId: 1,
		firstUnuploadedPreKeyId: 1,
		accountSettings: { unarchiveChats: false },
	};

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
					for (const type in data) {
						for (const id in data[type]) {
							const value = data[type][id];
							if (value) {
								writeData(value, `${type}-${id}`);
							} else {
								removeData(`${type}-${id}`);
							}
						}
					}
				},
			},
		},
		saveCreds: () => {
			writeData(creds, "creds");
			console.log("💾 Credentials saved to SQLite");
		},
	};
};

const clearSQLiteAuthState = () => {
	db.prepare("DELETE FROM AuthState").run();
	console.log("🗑️ SQLite Auth State cleared");
};

export { useSQLiteAuthState, clearSQLiteAuthState };
