import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "database.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Initialize tables
db.exec(`
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
`);

class Collection {
    constructor(tableName) {
        this.tableName = tableName;
    }

    async findOne(query) {
        const id = query._id || query.id;
        if (id && Object.keys(query).length === 1) {
            const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
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

    find(query = {}, options = {}) {
        const stmt = db.prepare(`SELECT * FROM ${this.tableName}`);
        const rows = stmt.all();

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

    async countDocuments(query = {}) {
        const rows = db.prepare(`SELECT * FROM ${this.tableName}`).all();
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
        const id = query._id || query.id;
        if (!id) return;

        let existing = await this.findOne(query);
        if (!existing && options.upsert) {
            existing = { _id: id };
        }
        if (!existing) return;

        const data = { ...existing };

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
                    data[key] = value;
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
                    data[key] = (data[key] || 0) + value;
                }
            }
        }

        if (update.$push) {
            for (const key in update.$push) {
                if (!Array.isArray(data[key])) data[key] = [];
                data[key].push(update.$push[key]);
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
                const val = update.$addToSet[key].$each || [update.$addToSet[key]];
                for (const v of val) {
                    if (!data[key].includes(v)) data[key].push(v);
                }
            }
        }

        if (this.tableName === 'AuthTable') {
            const { _id, ...fields } = data;
            const keys = Object.keys(fields);
            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => k === 'disabledGlobally' ? JSON.stringify(fields[k]) : fields[k]);
            const res = db.prepare(`UPDATE AuthTable SET ${setClause} WHERE id = ?`).run(...values, id);
            return { matchedCount: res.changes };
        } else {
            const res = db.prepare(`UPDATE ${this.tableName} SET data = ? WHERE id = ?`)
                .run(JSON.stringify(data), id);
            return { matchedCount: res.changes };
        }
    }

    async insertOne(doc) {
        const { _id, ...data } = doc;
        if (this.tableName === 'AuthTable') {
             db.prepare("INSERT OR REPLACE INTO AuthTable (id, youtube_session, disabledGlobally) VALUES (?, ?, ?)")
                .run(_id, data.youtube_session || "", JSON.stringify(data.disabledGlobally || []));
        } else {
            db.prepare(`INSERT OR REPLACE INTO ${this.tableName} (id, data) VALUES (?, ?)`)
                .run(_id, JSON.stringify(data));
        }
    }

    async deleteMany(query) {
        db.prepare(`DELETE FROM ${this.tableName}`).run();
        return { deletedCount: 1 }; // fake count
    }
}

db.connect = () => { console.log("SQLite connected (simulated)"); };
db.db = () => ({
    collection: (name) => new Collection(name)
});

export default db;
