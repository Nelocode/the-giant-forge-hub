import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'hub.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      role       TEXT    NOT NULL DEFAULT 'user',
      avatar     TEXT,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT,
      start_time  TEXT    NOT NULL,
      end_time    TEXT,
      all_day     INTEGER NOT NULL DEFAULT 0,
      color       TEXT    DEFAULT '#f91117',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS google_tokens (
      user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      access_token  TEXT NOT NULL,
      refresh_token TEXT,
      expires_at    INTEGER,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#d4772c',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS company_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      event_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id   INTEGER NOT NULL REFERENCES company_events(id) ON DELETE CASCADE,
      task       TEXT NOT NULL,
      done       INTEGER NOT NULL DEFAULT 0,
      ai_note    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed default admins if no users exist
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (count.cnt === 0) {
    const hash1 = bcrypt.hashSync('admin123', 12);
    db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`)
      .run('Administrador', 'admin@forge.local', hash1, 'admin');

    const hash2 = bcrypt.hashSync('Elefanteazul.01', 12);
    db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`)
      .run('Nelson Carvajal', 'nelsondcarvajal@gmail.com', hash2, 'admin');

    console.log('[DB] Seed admins created: admin@forge.local / admin123 | nelsondcarvajal@gmail.com');
  }
}

export function getUsers() {
  return getDb().prepare(
    'SELECT id, name, email, role, avatar, active, created_at FROM users ORDER BY created_at DESC'
  ).all();
}

export function getUserById(id: number) {
  return getDb().prepare(
    'SELECT id, name, email, role, avatar, active, created_at FROM users WHERE id = ?'
  ).get(id) as { id: number; name: string; email: string; role: string; avatar: string | null; active: number } | undefined;
}

export function getUserByEmail(email: string) {
  return getDb().prepare(
    'SELECT * FROM users WHERE email = ? AND active = 1'
  ).get(email) as { id: number; name: string; email: string; password: string; role: string; avatar: string | null } | undefined;
}

export function createUser(name: string, email: string, password: string, role: 'admin' | 'user' = 'user') {
  const hash = bcrypt.hashSync(password, 12);
  const result = getDb().prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hash, role);
  return result.lastInsertRowid;
}

export function updateUser(id: number, fields: { name?: string; avatar?: string; role?: string; active?: number }) {
  const updates = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(fields).filter(v => v !== undefined);
  if (!updates) return;
  getDb().prepare(`UPDATE users SET ${updates} WHERE id = ?`).run(...values, id);
}

export function deleteUser(id: number) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function updatePassword(id: number, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 12);
  getDb().prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
}

// Events
export function getEvents(userId: number) {
  return getDb().prepare(
    'SELECT * FROM events WHERE user_id = ? ORDER BY start_time ASC'
  ).all(userId);
}

export function createEvent(userId: number, data: {
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  all_day?: boolean;
  color?: string;
}) {
  const result = getDb().prepare(`
    INSERT INTO events (user_id, title, description, start_time, end_time, all_day, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    data.title,
    data.description ?? null,
    data.start_time,
    data.end_time ?? null,
    data.all_day ? 1 : 0,
    data.color ?? '#f91117'
  );
  return result.lastInsertRowid;
}

export function deleteEvent(id: number, userId: number) {
  getDb().prepare('DELETE FROM events WHERE id = ? AND user_id = ?').run(id, userId);
}

/* ── Companies ───────────────────────────────────────────── */
export interface Company { id: number; name: string; color: string; created_at: string; }

export function getCompanies(): Company[] {
  return getDb().prepare('SELECT * FROM companies ORDER BY created_at ASC').all() as Company[];
}

export function createCompany(name: string, color: string): number {
  const result = getDb().prepare(
    'INSERT INTO companies (name, color) VALUES (?, ?)'
  ).run(name, color);
  return result.lastInsertRowid as number;
}

export function deleteCompany(id: number) {
  getDb().prepare('DELETE FROM companies WHERE id = ?').run(id);
}

/* ── Company Events ──────────────────────────────────────── */
export interface CompanyEvent { id: number; company_id: number; title: string; event_date: string; created_at: string; }

export function getCompanyEvents(companyId: number): CompanyEvent[] {
  return getDb().prepare(
    'SELECT * FROM company_events WHERE company_id = ? ORDER BY event_date ASC'
  ).all(companyId) as CompanyEvent[];
}

export function createCompanyEvent(companyId: number, title: string, eventDate: string): number {
  const result = getDb().prepare(
    'INSERT INTO company_events (company_id, title, event_date) VALUES (?, ?, ?)'
  ).run(companyId, title, eventDate);
  return result.lastInsertRowid as number;
}

export function updateCompanyEvent(id: number, fields: { title?: string; event_date?: string }) {
  const updates = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(fields).filter(v => v !== undefined);
  if (!updates) return;
  getDb().prepare(`UPDATE company_events SET ${updates} WHERE id = ?`).run(...values, id);
}

export function deleteCompanyEvent(id: number) {
  getDb().prepare('DELETE FROM company_events WHERE id = ?').run(id);
}

/* ── Checklist Items ─────────────────────────────────────── */
export interface ChecklistItem { id: number; event_id: number; task: string; done: number; ai_note: string | null; created_at: string; }

export function getChecklistItems(eventId: number): ChecklistItem[] {
  return getDb().prepare(
    'SELECT * FROM checklist_items WHERE event_id = ? ORDER BY created_at ASC'
  ).all(eventId) as ChecklistItem[];
}

export function createChecklistItem(eventId: number, task: string): number {
  const result = getDb().prepare(
    'INSERT INTO checklist_items (event_id, task) VALUES (?, ?)'
  ).run(eventId, task);
  return result.lastInsertRowid as number;
}

export function updateChecklistItem(id: number, fields: { done?: number; ai_note?: string }) {
  const updates = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`)
    .join(', ');
  const values = Object.values(fields).filter(v => v !== undefined);
  if (!updates) return;
  getDb().prepare(`UPDATE checklist_items SET ${updates} WHERE id = ?`).run(...values, id);
}

export function deleteChecklistItem(id: number) {
  getDb().prepare('DELETE FROM checklist_items WHERE id = ?').run(id);
}
