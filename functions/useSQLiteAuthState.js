import db from "../sqlite.js";
import { initAuthCreds, proto, BufferJSON } from "baileys";

const authCol = db.db().collection("AuthState");

const useSQLiteAuthState = async () => {
	const writeData = async (data, id) => {
		try {
			const value = JSON.stringify(data, BufferJSON.replacer);
			await authCol.updateOne({ _id: id }, { $set: { value } }, { upsert: true });
		} catch (err) {
			console.error(`[AuthState write error for ${id}]`, err.message);
		}
	};

	const readData = async (id) => {
		try {
			const row = await authCol.findOne({ _id: id });
			if (!row || !row.value) return null;
			return JSON.parse(row.value, BufferJSON.reviver);
		} catch (err) {
			console.error(`[AuthState read error for ${id}]`, err.message);
			return null;
		}
	};

	const removeData = async (id) => {
		try {
			await authCol.deleteMany({ _id: id });
		} catch (err) {
			console.error(`[AuthState remove error for ${id}]`, err.message);
		}
	};

	const credsData = await readData("creds");
	const creds = credsData || initAuthCreds();

	return {
		state: {
			creds,
			keys: {
				get: async (type, ids) => {
					const data = {};
					for (const id of ids) {
						let value = await readData(`${type}-${id}`);
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
								await writeData(value, `${type}-${id}`);
							} else {
								await removeData(`${type}-${id}`);
							}
						}
					}
				},
			},
		},
		saveCreds: async () => {
			await writeData(creds, "creds");
			console.log("💾 WhatsApp credentials saved to AuthState");
		},
		cleanup: () => {
			// Shared collection manager
		},
	};
};

const clearSQLiteAuthState = async () => {
	try {
		await authCol.deleteMany({});
		console.log("🗑️ Auth State cleared");
	} catch (err) {
		console.error("[AuthState clear error]", err.message);
	}
};

export { useSQLiteAuthState, clearSQLiteAuthState };
