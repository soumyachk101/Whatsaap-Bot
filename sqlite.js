import Database from "better-sqlite3";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, "database.db");

const sqliteDb = new Database(dbPath);
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
 disabledGlobally TEXT
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
		if (id && Object.keys(query).length === 1) {
			const row = sqliteDb.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
			if (!row) return null;
			if (this.tableName === 'AuthTable') return { _id: row.id, ...row, disabledGlobally: JSON.parse(row.disabledGlobally || '[]') };
			const data = JSON.parse(row.data);
			data._id = row.id;
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

	find(query = {}, options = {}) {
		const mongoResult = this._mongoOpSync(() => {
			const cursor = mongoDbInstance.collection(this.tableName).find(query, options);
			return {
				toArray: async () => await cursor.toArray(),
				limit: (n) => ({
					toArray: async () => await cursor.limit(n).toArray(),
				}),
				sort: (sortObj) => ({
					toArray: async () => await cursor.sort(sortObj).toArray(),
					skip: (s) => ({
						limit: (l) => ({
							toArray: async () => await cursor.sort(sortObj).skip(s).limit(l).toArray(),
						}),
					}),
				}),
			};
		});
		if (mongoResult) return mongoResult;

		// SQLite Fallback
		let rows;
		if (query._id && query._id.$in && Array.isArray(query._id.$in) && query._id.$in.length > 0) {
			const placeholders = query._id.$in.map(() => "?").join(",");
			const stmt = sqliteDb.prepare(`SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`);
			rows = stmt.all(...query._id.$in);
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
							limit: (l) => ({ toArray: async () => skipped.slice(0, l) })
						};
					}
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

		if (this.tableName === 'AuthTable') {
			const { _id, ...fields } = data;
			const keys = Object.keys(fields);
			let changes = 0;
			if (keys.length > 0) {
				const setClause = keys.map(k => `${k} = ?`).join(', ');
				const values = keys.map(k => k === 'disabledGlobally' ? JSON.stringify(fields[k]) : fields[k]);
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

	async insertOne(doc) {
		const mongoResult = await this._mongoOp(() => mongoDbInstance.collection(this.tableName).insertOne(doc));
		if (mongoResult !== null) return mongoResult;

		// SQLite Fallback
		const { _id, ...data } = doc;
		if (this.tableName === 'AuthTable') {
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

		sqliteDb.transaction(async () => {
			for (const op of ops) {
				if (op.updateOne) {
					const res = await this.updateOne(op.updateOne.filter, op.updateOne.update, { upsert: op.updateOne.upsert });
					if (res && res.matchedCount) matchedCount += res.matchedCount;
				} else if (op.deleteOne) {
					const res = await this.deleteMany(op.deleteOne.filter); // deletes one because id is unique
					if (res && res.deletedCount) deletedCount += res.deletedCount;
				}
			}
		})();

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
