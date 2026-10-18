import Database from "better-sqlite3";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
				console.log(`✅ Seeded database from ${defaultDb} to persistent volume at ${process.env.DATABASE_PATH}`);
			}
		}
		resolvedDbPath = process.env.DATABASE_PATH;
	} catch (e) {
		console.warn(`⚠️ Could not access DATABASE_PATH (${process.env.DATABASE_PATH}), falling back to local database:`, e.message);
		resolvedDbPath = join(__dirname, "database.db");
	}
}

const sqliteDb = new Database(resolvedDbPath);
sqliteDb.pragma("journal_mode = WAL");

// Initialize SQLite tables as fallback
sqliteDb.exec(`
 CREATE TABLE IF NOT EXISTS AuthState (
 id TEXT PRIMARY KEY,
 value TEXT
 );

 CREATE TABLE IF NOT EXISTS AuthTable (
 id TEXT PRIMARY KEY,
 youtube_session TEXT,
 disabledGlobally TEXT,
 maintenanceMode INTEGER,
 plugins TEXT
 );

 CREATE TABLE IF NOT EXISTS Groups (
 id TEXT PRIMARY KEY,
 data TEXT
 );

 CREATE TABLE IF NOT EXISTS Members (
 id TEXT PRIMARY KEY,
 data TEXT
 );

 CREATE TABLE IF NOT EXISTS UserData (
 id TEXT PRIMARY KEY,
 data TEXT
 );
`);

try { sqliteDb.exec("ALTER TABLE AuthTable ADD COLUMN plugins TEXT;"); } catch {}
try { sqliteDb.exec("ALTER TABLE AuthTable ADD COLUMN maintenanceMode INTEGER;"); } catch {}

let mongoDbInstance = null;

const rawMongoUri = process.env.MONGO_URI ? process.env.MONGO_URI.replace(/^["']|["']$/g, "").trim() : null;

if (rawMongoUri) {
	try {
		const client = new MongoClient(rawMongoUri, {
			serverSelectionTimeoutMS: 5000,
		});
		await client.connect();
		mongoDbInstance = client.db();
		console.log(`✅ CONNECTED TO MONGODB ATLAS SUCCESSFULLY! (DB: ${mongoDbInstance.databaseName})`);
	} catch (err) {
		console.error("⚠️ Could not connect to MongoDB Atlas. Falling back to local SQLite:", err.message);
		mongoDbInstance = null;
	}
} else {
	console.log("ℹ️ No MONGO_URI provided. Using local SQLite database.");
}

class Collection {
	constructor(tableName) {
		this.tableName = tableName;
	}

	async _mongoOp(op) {
		if (!mongoDbInstance) return null;
		try {
			const res = await Promise.race([
				op(),
				new Promise((_, reject) => setTimeout(() => reject(new Error("Mongo operation timeout (2500ms)")), 2500))
			]);
			return res;
		} catch (err) {
			console.error(`[Mongo ${this.tableName} error]`, err.message);
			if (
				err.name === "MongoNetworkError" ||
				err.name === "MongoServerSelectionError" ||
				err.name === "MongoTopologyClosedError" ||
				err.message?.includes("connection closed") ||
				err.message?.includes("timeout")
			) {
				console.warn("⚠️ Mongo slow/network error. Switching to SQLite fallback.");
				mongoDbInstance = null;
			}
			return null;
		}
	}

	async findOne(query = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).findOne(query));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		const id = query._id || query.id;
		if (id) {
			const row = sqliteDb.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
			if (!row) return null;
			if (this.tableName === 'AuthState') {
				return { _id: row.id, value: row.value };
			}
			if (this.tableName === 'AuthTable') {
				const item = { _id: row.id, ...row, disabledGlobally: JSON.parse(row.disabledGlobally || '[]'), plugins: JSON.parse(row.plugins || '{}') };
				if (Object.keys(query).length > 1 && !this._matchItem(item, query)) return null;
				return item;
			}
			const data = JSON.parse(row.data);
			data._id = row.id;
			if (Object.keys(query).length > 1 && !this._matchItem(data, query)) return null;
			return data;
		}
		const results = (await (this.find(query)).toArray());
		return results.length > 0 ? results[0] : null;
	}

	_matchNestedValue(obj, parts, idx, expected) {
		if (idx >= parts.length) return obj === expected;
		if (obj == null) return false;
		const val = obj[parts[idx]];
		if (Array.isArray(val)) {
			return val.some(el => this._matchNestedValue(el, parts, idx + 1, expected));
		}
		return this._matchNestedValue(val, parts, idx + 1, expected);
	}

	_matchItem(item, query) {
		for (const key in query) {
			if (key === '$or') {
				const orResult = query.$or.some(orClause => this._matchItem(item, orClause));
				if (!orResult) return false;
				continue;
			}
			const searchKey = key === '_id' ? '_id' : key;
			const expected = query[key];

			if (expected && typeof expected === 'object' && !Array.isArray(expected) && expected.$elemMatch) {
				const value = item[searchKey];
				if (!Array.isArray(value) || !value.some(entry => this._matchItem(entry, expected.$elemMatch))) return false;
				continue;
			}

			if (expected && typeof expected === 'object' && !Array.isArray(expected) && expected.$in) {
				const value = item[searchKey];
				if (Array.isArray(value)) {
					if (!value.some(entry => expected.$in.includes(entry))) return false;
				} else if (!expected.$in.includes(value)) {
					return false;
				}
				continue;
			}

			if (expected && typeof expected === 'object' && !Array.isArray(expected) && expected.$regex) {
				const re = new RegExp(expected.$regex, expected.$options || '');
				if (!re.test(String(item[searchKey] || ''))) return false;
				continue;
			}

			if (searchKey.includes('.')) {
				const parts = searchKey.split('.');
				if (!this._matchNestedValue(item, parts, 0, expected)) return false;
			} else {
				if (item[searchKey] !== expected) return false;
			}
		}
		return true;
	}

	_setPath(data, dottedKey, value) {
		const parts = dottedKey.split('.');
		let target = data;
		for (let i = 0; i < parts.length - 1; i++) {
			if (target[parts[i]] == null || typeof target[parts[i]] !== 'object') target[parts[i]] = {};
			target = target[parts[i]];
		}
		target[parts[parts.length - 1]] = value;
	}

	_incrementPath(data, dottedKey, value) {
		const parts = dottedKey.split('.');
		let target = data;
		for (let i = 0; i < parts.length - 1; i++) {
			if (target[parts[i]] == null || typeof target[parts[i]] !== 'object') target[parts[i]] = {};
			target = target[parts[i]];
		}
		const lastKey = parts[parts.length - 1];
		target[lastKey] = (Number(target[lastKey]) || 0) + value;
	}

	_sqliteFind(query = {}) {
		if (this.tableName === 'AuthState') {
			let rows;
			if (query._id && query._id.$in && Array.isArray(query._id.$in) && query._id.$in.length > 0) {
				const placeholders = query._id.$in.map(() => "?").join(",");
				const stmt = sqliteDb.prepare(`SELECT * FROM AuthState WHERE id IN (${placeholders})`);
				rows = stmt.all(...query._id.$in);
			} else if (query._id && typeof query._id === 'string') {
				const stmt = sqliteDb.prepare(`SELECT * FROM AuthState WHERE id = ?`);
				rows = stmt.all(query._id);
			} else {
				const stmt = sqliteDb.prepare(`SELECT * FROM AuthState`);
				rows = stmt.all();
			}
			return rows.map(r => ({ _id: r.id, value: r.value }));
		}

		let rows;
		if (query._id && query._id.$in && Array.isArray(query._id.$in) && query._id.$in.length > 0) {
			const placeholders = query._id.$in.map(() => "?").join(",");
			const stmt = sqliteDb.prepare(`SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`);
			rows = stmt.all(...query._id.$in);
		} else if (query._id && typeof query._id === 'string') {
			const stmt = sqliteDb.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
			rows = stmt.all(query._id);
		} else {
			const stmt = sqliteDb.prepare(`SELECT * FROM ${this.tableName}`);
			rows = stmt.all();
		}

		let results = rows.map(row => {
			if (this.tableName === 'AuthTable') return { _id: row.id, ...row, disabledGlobally: JSON.parse(row.disabledGlobally || '[]') };
			const data = JSON.parse(row.data);
			data._id = row.id;
			return data;
		});

		if (Object.keys(query).length > 0) {
			results = results.filter(item => this._matchItem(item, query));
		}
		return results;
	}

	find(query = {}, options = {}) {
		const mongoResult = this._mongoOpSync(() => {
			const cursor = mongoDbInstance.collection(this.tableName).find(query, options);
			return {
				toArray: async () => {
					try {
						return await cursor.toArray();
					} catch (err) {
						console.warn(`⚠️ [Mongo ${this.tableName}] cursor.toArray failed, falling back to SQLite:`, err.message);
						return this._sqliteFind(query);
					}
				},
				limit: (n) => ({
					toArray: async () => {
						try {
							return await cursor.limit(n).toArray();
						} catch (err) {
							console.warn(`⚠️ [Mongo ${this.tableName}] cursor.limit.toArray failed, falling back to SQLite:`, err.message);
							return this._sqliteFind(query).slice(0, n);
						}
					},
				}),
				sort: (sortObj) => ({
					toArray: async () => {
						try {
							return await cursor.sort(sortObj).toArray();
						} catch (err) {
							console.warn(`⚠️ [Mongo ${this.tableName}] cursor.sort.toArray failed, falling back to SQLite:`, err.message);
							const res = this._sqliteFind(query);
							const field = Object.keys(sortObj)[0];
							const dir = sortObj[field];
							return res.sort((a, b) => ((a[field] ?? 0) > (b[field] ?? 0) ? 1 : -1) * dir);
						}
					},
					skip: (s) => ({
						limit: (l) => ({
							toArray: async () => {
								try {
									return await cursor.sort(sortObj).skip(s).limit(l).toArray();
								} catch (err) {
									const res = this._sqliteFind(query);
									const field = Object.keys(sortObj)[0];
									const dir = sortObj[field];
									return res.sort((a, b) => ((a[field] ?? 0) > (b[field] ?? 0) ? 1 : -1) * dir).slice(s, s + l);
								}
							},
						}),
					}),
				}),
			};
		});
		if (mongoResult) return mongoResult;

		// SQLite Fallback
		const results = this._sqliteFind(query);
		return {
			toArray: async () => results,
			limit: (n) => {
				const limited = results.slice(0, n);
				return { toArray: async () => limited };
			},
			sort: (sortObj) => {
				const field = Object.keys(sortObj)[0];
				const dir = sortObj[field];
				results.sort((a, b) => {
					const av = a[field] ?? 0;
					const bv = b[field] ?? 0;
					return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
				});
				return {
					toArray: async () => results,
					skip: (s) => {
						const skipped = results.slice(s);
						return {
							limit: (l) => ({
								toArray: async () => skipped.slice(0, l),
							}),
						};
					},
				};
			},
		};
	}

	_mongoOpSync(op) {
		// Synchronous check — if mongo died, return null immediately
		if (!mongoDbInstance) return null;
		try {
			return op();
		} catch (err) {
			console.error(`[Mongo ${this.tableName} sync error]`, err.message);
			if (
				err.name === "MongoNetworkError" ||
				err.name === "MongoServerSelectionError" ||
				err.name === "MongoTopologyClosedError" ||
				err.message?.includes("connection closed")
			) {
				console.warn("⚠️ Mongo network error (sync). Switching to SQLite fallback.");
				mongoDbInstance = null;
			}
			return null;
		}
	}

	async countDocuments(query = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).countDocuments(query));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		const rows = sqliteDb.prepare(`SELECT * FROM ${this.tableName}`).all();
		if (Object.keys(query).length === 0) return rows.length;
		const mapped = rows.map(row => {
			if (this.tableName === 'AuthTable') return { _id: row.id, ...row };
			const data = JSON.parse(row.data);
			data._id = row.id;
			return data;
		});
		return mapped.filter(item => this._matchItem(item, query)).length;
	}

	_applyPositional(data, dottedKey, query, updater) {
		const dotIdx = dottedKey.indexOf('.$.');
		if (dotIdx === -1) return false;

		const arrayField = dottedKey.slice(0, dotIdx);
		const nestedPath = dottedKey.slice(dotIdx + 3);

		const matchKey = Object.keys(query).find(k =>
			k.startsWith(arrayField + '.') && !k.includes('.$') && k !== '_id'
		);
		if (!matchKey) return false;

		const matchField = matchKey.slice(arrayField.length + 1);
		const matchValue = query[matchKey];

		if (!Array.isArray(data[arrayField])) return false;

		for (let i = 0; i < data[arrayField].length; i++) {
			if (data[arrayField][i][matchField] === matchValue) {
				updater(data[arrayField][i], nestedPath);
				return true;
			}
		}
		return false;
	}

	async updateOne(query, update, options = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).updateOne(query, update, options));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		const id = query._id || query.id;
		if (!id) return { matchedCount: 0 };

		let existing = await this.findOne(query);
		let wasUpserted = false;
		if (!existing && options.upsert) {
			existing = { _id: id };
			wasUpserted = true;
		}
		if (!existing) return { matchedCount: 0 };

		const data = { ...existing };

		if (wasUpserted && update.$setOnInsert) {
			for (const [key, value] of Object.entries(update.$setOnInsert)) {
				data[key] = value;
			}
		}

		if (update.$set) {
			for (const [key, value] of Object.entries(update.$set)) {
				if (key.includes('.$.')) {
					this._applyPositional(data, key, query, (obj, path) => {
						const parts = path.split('.');
						let target = obj;
						for (let i = 0; i < parts.length - 1; i++) {
							if (target[parts[i]] == null) target[parts[i]] = {};
							target = target[parts[i]];
						}
						target[parts[parts.length - 1]] = value;
					});
				} else {
					this._setPath(data, key, value);
				}
			}
		}

		if (update.$inc) {
			for (const [key, value] of Object.entries(update.$inc)) {
				if (key.includes('.$.')) {
					this._applyPositional(data, key, query, (obj, path) => {
						const parts = path.split('.');
						let target = obj;
						for (let i = 0; i < parts.length - 1; i++) {
							if (target[parts[i]] == null) target[parts[i]] = {};
							target = target[parts[i]];
						}
						const lastKey = parts[parts.length - 1];
						target[lastKey] = (target[lastKey] || 0) + value;
					});
				} else {
					this._incrementPath(data, key, value);
				}
			}
		}

		if (update.$push) {
			for (const key in update.$push) {
				if (!Array.isArray(data[key])) data[key] = [];
				const value = update.$push[key];
				if (value && typeof value === 'object' && Array.isArray(value.$each)) {
					data[key].push(...value.$each);
				} else {
					data[key].push(value);
				}
			}
		}

		if (update.$pull) {
			for (const key in update.$pull) {
				if (!Array.isArray(data[key])) continue;
				const pullSpec = update.$pull[key];
				if (pullSpec && typeof pullSpec === 'object' && !Array.isArray(pullSpec)) {
					data[key] = data[key].filter(el =>
						!Object.keys(pullSpec).every(k => el[k] === pullSpec[k])
					);
				} else {
					data[key] = data[key].filter(v => v !== pullSpec);
				}
			}
		}

		if (update.$pullAll) {
			for (const key in update.$pullAll) {
				if (Array.isArray(data[key])) {
					const vals = update.$pullAll[key];
					data[key] = data[key].filter(v => !vals.includes(v));
				}
			}
		}

		if (update.$addToSet) {
			for (const key in update.$addToSet) {
				if (!Array.isArray(data[key])) data[key] = [];
				const val = update.$addToSet[key]?.$each || [update.$addToSet[key]];
				for (const v of val) {
					if (!data[key].includes(v)) data[key].push(v);
				}
			}
		}

		if (this.tableName === 'AuthState') {
			let val = update.$set?.value !== undefined ? update.$set.value : (update.value !== undefined ? update.value : JSON.stringify(update));
			if (typeof val !== 'string') val = JSON.stringify(val);
			let res = sqliteDb.prepare(`UPDATE AuthState SET value = ? WHERE id = ?`).run(val, id);
			let changes = res.changes;
			if (changes === 0 && options.upsert) {
				res = sqliteDb.prepare(`INSERT INTO AuthState (id, value) VALUES (?, ?)`).run(id, val);
				changes = res.changes;
			}
			return { matchedCount: changes };
		} else if (this.tableName === 'AuthTable') {
			const { _id, ...fields } = data;
			const keys = Object.keys(fields);
			let changes = 0;
			if (keys.length > 0) {
				const setClause = keys.map(k => `${k} = ?`).join(', ');
				const values = keys.map(k => (k === 'disabledGlobally' || k === 'plugins') ? JSON.stringify(fields[k]) : fields[k]);
				let res = sqliteDb.prepare(`UPDATE AuthTable SET ${setClause} WHERE id = ?`).run(...values, id);
				changes = res.changes;
				if (changes === 0 && options.upsert) {
					const placeholders = keys.map(() => '?').join(', ');
					res = sqliteDb.prepare(`INSERT INTO AuthTable (id, ${keys.join(', ')}) VALUES (?, ${placeholders})`).run(id, ...values);
					changes = res.changes;
				}
			}
			return { matchedCount: changes };
		} else {
			let res = sqliteDb.prepare(`UPDATE ${this.tableName} SET data = ? WHERE id = ?`)
				.run(JSON.stringify(data), id);
			if (res.changes === 0 && options.upsert) {
				res = sqliteDb.prepare(`INSERT INTO ${this.tableName} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(data));
			}
			return { matchedCount: res.changes };
		}
	}

	async updateMany(query, update, options = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).updateMany(query, update, options));
		if (mongoResult !== null) return mongoResult;

		const items = await this.find(query).toArray();
		let modifiedCount = 0;
		for (const item of items) {
			if (item._id) {
				const res = await this.updateOne({ _id: item._id }, update, options);
				if (res?.matchedCount) modifiedCount++;
			}
		}
		return { matchedCount: items.length, modifiedCount };
	}

	async insertOne(doc) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).insertOne(doc));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		const { _id, ...data } = doc;
		if (this.tableName === 'AuthState') {
			let val = data.value !== undefined ? data.value : JSON.stringify(data);
			if (typeof val !== 'string') val = JSON.stringify(val);
			sqliteDb.prepare(`INSERT OR REPLACE INTO AuthState (id, value) VALUES (?, ?)`).run(_id, val);
		} else if (this.tableName === 'AuthTable') {
			 sqliteDb.prepare("INSERT OR REPLACE INTO AuthTable (id, youtube_session, disabledGlobally) VALUES (?, ?, ?)")
				.run(_id, data.youtube_session || "", JSON.stringify(data.disabledGlobally || []));
		} else {
			sqliteDb.prepare(`INSERT OR REPLACE INTO ${this.tableName} (id, data) VALUES (?, ?)`)
				.run(_id, JSON.stringify(data));
		}
	}

	async deleteMany(query = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).deleteMany(query));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		if (this.tableName === 'AuthState') {
			const id = query._id || query.id;
			if (id) {
				const res = sqliteDb.prepare(`DELETE FROM AuthState WHERE id = ?`).run(id);
				return { deletedCount: res.changes };
			}
			const res = sqliteDb.prepare(`DELETE FROM AuthState`).run();
			return { deletedCount: res.changes };
		}

		if (!query || Object.keys(query).length === 0) {
			const res = sqliteDb.prepare(`DELETE FROM ${this.tableName}`).run();
			return { deletedCount: res.changes };
		}
		const items = (await this.find(query).toArray());
		if (items.length === 0) return { deletedCount: 0 };
		let deletedCount = 0;
		const stmt = sqliteDb.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
		for (const item of items) {
			const id = item._id || item.id;
			if (id) {
				const res = stmt.run(id);
				deletedCount += res.changes;
			}
		}
		return { deletedCount };
	}

	async bulkWrite(ops, options = {}) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).bulkWrite(ops, options));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		let matchedCount = 0;
		let modifiedCount = 0;
		let deletedCount = 0;

		if (this.tableName === 'AuthState') {
			const runTx = sqliteDb.transaction((operations) => {
				for (const op of operations) {
					if (op.updateOne) {
						const filter = op.updateOne.filter;
						const id = filter._id || filter.id;
						if (!id) continue;
						const val = op.updateOne.update.$set?.value !== undefined ? op.updateOne.update.$set.value : (op.updateOne.update.value !== undefined ? op.updateOne.update.value : JSON.stringify(op.updateOne.update));
						const strVal = typeof val === 'string' ? val : JSON.stringify(val);
						let res = sqliteDb.prepare(`UPDATE AuthState SET value = ? WHERE id = ?`).run(strVal, id);
						if (res.changes === 0 && op.updateOne.upsert) {
							res = sqliteDb.prepare(`INSERT INTO AuthState (id, value) VALUES (?, ?)`).run(id, strVal);
						}
						matchedCount += res.changes;
					} else if (op.deleteOne) {
						const id = op.deleteOne.filter?._id || op.deleteOne.filter?.id;
						if (id) {
							const res = sqliteDb.prepare(`DELETE FROM AuthState WHERE id = ?`).run(id);
							deletedCount += res.changes;
						}
					}
				}
			});
			try {
				runTx(ops);
				return { matchedCount, modifiedCount, deletedCount };
			} catch (err) {
				console.error(`[bulkWrite error on AuthState]`, err.message);
			}
		}

		for (const op of ops) {
			if (op.updateOne) {
				const res = await this.updateOne(op.updateOne.filter, op.updateOne.update, { upsert: op.updateOne.upsert });
				if (res && res.matchedCount) matchedCount += res.matchedCount;
			} else if (op.deleteOne) {
				const res = await this.deleteMany(op.deleteOne.filter); // deletes one because id is unique
				if (res && res.deletedCount) deletedCount += res.deletedCount;
			}
		}

		return { matchedCount, modifiedCount, deletedCount };
	}
}

const db = {
	connect: () => { console.log(mongoDbInstance ? "MongoDB Atlas active." : "SQLite active."); },
	db: () => ({
		collection: (name) => new Collection(name)
	})
};

export default db;
