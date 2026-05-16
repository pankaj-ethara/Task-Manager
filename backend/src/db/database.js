import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let wrapper;

function normalizeSql(sql) {
  return sql.replace(/\?/g, '?');
}

class SqlJsWrapper {
  constructor(SQL, filePath) {
    this.SQL = SQL;
    this.filePath = filePath;
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this.db = new SQL.Database(data);
    } else {
      this.db = new SQL.Database();
    }
    this.db.run('PRAGMA foreign_keys = ON');
  }

  persist() {
    const data = this.db.export();
    fs.writeFileSync(this.filePath, Buffer.from(data));
  }

  async exec(sql) {
    this.db.run(sql);
    this.persist();
  }

  async run(sql, ...params) {
    const cleanParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.db.run(normalizeSql(sql), cleanParams.map((v) => v === undefined ? null : v));
    const lastID = this.db.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] || 0;
    const changes = this.db.exec('SELECT changes() AS changes')[0]?.values?.[0]?.[0] || 0;
    this.persist();
    return { lastID, changes };
  }

  async get(sql, ...params) {
    const rows = await this.all(sql, ...params);
    return rows[0];
  }

  async all(sql, ...params) {
    const cleanParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const stmt = this.db.prepare(normalizeSql(sql));
    stmt.bind(cleanParams.map((v) => v === undefined ? null : v));
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

export async function getDb() {
  if (wrapper) return wrapper;
  const dbFile = process.env.DB_FILE || './data/app.db';
  const absolutePath = path.isAbsolute(dbFile) ? dbFile : path.join(__dirname, '../../', dbFile);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const SQL = await initSqlJs({ locateFile: (file) => path.join(__dirname, '../../node_modules/sql.js/dist', file) });
  wrapper = new SqlJsWrapper(SQL, absolutePath);
  return wrapper;
}

export async function migrate() {
  const database = await getDb();
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','member')) DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL CHECK(status IN ('active','completed','on_hold')) DEFAULT 'active',
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, user_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL,
      assigned_to INTEGER,
      status TEXT NOT NULL CHECK(status IN ('todo','in_progress','done')) DEFAULT 'todo',
      priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')) DEFAULT 'medium',
      due_date TEXT,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}
