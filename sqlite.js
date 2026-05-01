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
        if (id) {
            const row = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
            if (!row) return null;
            if (this.tableName === 'AuthTable') return { _id: row.id, ...row, disabledGlobally: JSON.parse(row.disabledGlobally || '[]') };
            const data = JSON.parse(row.data);
            data._id = row.id;
            return data;
        }
        const rows = this.find(query);
        return rows.length > 0 ? rows[0] : null;
    }

    find(query = {}, options = {}) {
        let sql = `SELECT * FROM ${this.tableName}`;
        const params = [];
        
        const queryKeys = Object.keys(query).filter(k => k !== '$or' && k !== '$regex');
        if (queryKeys.length > 0) {
            sql += " WHERE ";
            sql += queryKeys.map(k => {
                const key = k === '_id' ? 'id' : k;
                if (this.tableName === 'AuthTable') {
                     return `${key} = ?`;
                } else {
                     // For Groups/Members, we have to filter inside the JSON data column
                     // but since we already loaded all rows in memory for this simple shim:
                     return "1=1"; 
                }
            }).join(" AND ");
            // We'll actually filter in memory for simplicity in this shim
        }

        const stmt = db.prepare(`SELECT * FROM ${this.tableName}`);
        const rows = stmt.all();
        
        let results = rows.map(row => {
            if (this.tableName === 'AuthTable') return { _id: row.id, ...row, disabledGlobally: JSON.parse(row.disabledGlobally || '[]') };
            const data = JSON.parse(row.data);
            data._id = row.id;
            return data;
        });

        // In-memory filtering for the shim
        if (Object.keys(query).length > 0) {
            results = results.filter(item => {
                for (const key in query) {
                    const searchKey = key === '_id' ? '_id' : key;
                    if (query[key] !== item[searchKey]) return false;
                }
                return true;
            });
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
                results.sort((a, b) => (a[field] > b[field] ? 1 : -1) * dir);
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
        const row = db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get();
        return row.count;
    }

    async updateOne(query, update, options = {}) {
        const id = query._id || query.id;
        if (!id) return;

        let existing = await this.findOne(query);
        if (!existing && options.upsert) {
            existing = { _id: id };
        }
        if (!existing) return;

        // Handle $set, $push, etc (very basic)
        const data = { ...existing };
        if (update.$set) Object.assign(data, update.$set);
        if (update.$push) {
            for (const key in update.$push) {
                if (!Array.isArray(data[key])) data[key] = [];
                data[key].push(update.$push[key]);
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
