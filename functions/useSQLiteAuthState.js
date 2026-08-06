import db from "../sqlite.js";
import { initAuthCreds, proto, BufferJSON } from "baileys";

const authCol = db.db().collection("AuthState");

// Fast in-memory key cache for Baileys Signal session keys
const keyCache = new Map();

const useSQLiteAuthState = async () => {
	const writeData = async (data, id) => {
		const value = JSON.stringify(data, BufferJSON.replacer);
		keyCache.set(id, data);
		try {
			await authCol.updateOne({ _id: id }, { $set: { value } }, { upsert: true });
		} catch (err) {
			console.error(`[AuthState write error for ${id}]`, err.message);
		}
	};

	const readData = async (id) => {
		if (keyCache.has(id)) {
			return keyCache.get(id);
		}
		try {
			const row = await authCol.findOne({ _id: id });
			if (!row || !row.value) return null;
			const parsed = JSON.parse(row.value, BufferJSON.reviver);
			keyCache.set(id, parsed);
			return parsed;
		} catch (err) {
			console.error(`[AuthState read error for ${id}]`, err.message);
			return null;
		}
	};

	const removeData = async (id) => {
		keyCache.delete(id);
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
					const missingIds = [];

					// 1. Instant Memory Fetch
					for (const id of ids) {
						const cacheKey = `${type}-${id}`;
						if (keyCache.has(cacheKey)) {
							let value = keyCache.get(cacheKey);
							if (type === "app-state-sync-key" && value) {
								value = proto.Message.AppStateSyncKeyData.fromObject(value);
							}
							data[id] = value;
						} else {
							missingIds.push(id);
						}
					}

					// 2. Single Bulk Fetch for any un-cached keys
					if (missingIds.length > 0) {
						try {
							const fullDbKeys = missingIds.map(id => `${type}-${id}`);
							const rows = await authCol.find({ _id: { $in: fullDbKeys } }).toArray();
							const rowMap = new Map(rows.map(r => [r._id, r.value]));

							for (const id of missingIds) {
								const cacheKey = `${type}-${id}`;
								const rawVal = rowMap.get(cacheKey);
								if (rawVal) {
									let value = JSON.parse(rawVal, BufferJSON.reviver);
									keyCache.set(cacheKey, value);
									if (type === "app-state-sync-key" && value) {
										value = proto.Message.AppStateSyncKeyData.fromObject(value);
									}
									data[id] = value;
								} else {
									data[id] = null;
								}
							}
						} catch (err) {
							console.error("[AuthState bulk get error]", err.message);
						}
					}

					return data;
				},
				set: async (data) => {
					const bulkOps = [];
					for (const type in data) {
						for (const id in data[type]) {
							const value = data[type][id];
							const cacheKey = `${type}-${id}`;
							if (value) {
								keyCache.set(cacheKey, value);
								const strVal = JSON.stringify(value, BufferJSON.replacer);
								bulkOps.push({
									updateOne: {
										filter: { _id: cacheKey },
										update: { $set: { value: strVal } },
										upsert: true
									}
								});
							} else {
								keyCache.delete(cacheKey);
								bulkOps.push({
									deleteOne: {
										filter: { _id: cacheKey }
									}
								});
							}
						}
					}

					if (bulkOps.length > 0) {
						try {
							await authCol.bulkWrite(bulkOps, { ordered: false });
						} catch (err) {
							console.error("[AuthState bulk write error]", err.message);
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
			keyCache.clear();
		},
	};
};

const clearSQLiteAuthState = async () => {
	try {
		keyCache.clear();
		await authCol.deleteMany({});
		console.log("🗑️ Auth State cleared");
	} catch (err) {
		console.error("[AuthState clear error]", err.message);
	}
};

export { useSQLiteAuthState, clearSQLiteAuthState };
