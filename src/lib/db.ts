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

    -- ── Executive Sync Engine — Biblia del equipo ─────────────────────────────
    CREATE TABLE IF NOT EXISTS ese_documents (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT    NOT NULL UNIQUE,
      title      TEXT    NOT NULL,
      content    TEXT    NOT NULL DEFAULT '',
      version    INTEGER NOT NULL DEFAULT 1,
      published  INTEGER NOT NULL DEFAULT 0,
      author_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ese_notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES ese_documents(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      message     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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

    // CEO — Ian Harris (Copper Giant)
    const hash3 = bcrypt.hashSync('CopperCEO#2025', 12);
    db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`)
      .run('Ian Harris', 'ian.harris@coppergiant.com', hash3, 'ceo');

    console.log('[DB] Seed admins created: admin@forge.local / admin123 | nelsondcarvajal@gmail.com');
    console.log('[DB] CEO created: ian.harris@coppergiant.com / CopperCEO#2025');
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

export function createUser(name: string, email: string, password: string, role: 'admin' | 'ceo' | 'user' = 'user') {
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

/* ── ESE Documents (Biblia del equipo) ───────────────────── */
export interface EseDocument {
  id: number;
  slug: string;
  title: string;
  content: string;
  version: number;
  published: number;
  author_id: number | null;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export function getEseDocuments(publishedOnly = true): EseDocument[] {
  const query = publishedOnly
    ? `SELECT d.*, u.name as author_name FROM ese_documents d
       LEFT JOIN users u ON u.id = d.author_id
       WHERE d.published = 1 ORDER BY d.updated_at DESC`
    : `SELECT d.*, u.name as author_name FROM ese_documents d
       LEFT JOIN users u ON u.id = d.author_id
       ORDER BY d.updated_at DESC`;
  return getDb().prepare(query).all() as EseDocument[];
}

export function getEseDocumentBySlug(slug: string): EseDocument | undefined {
  return getDb().prepare(
    `SELECT d.*, u.name as author_name FROM ese_documents d
     LEFT JOIN users u ON u.id = d.author_id WHERE d.slug = ?`
  ).get(slug) as EseDocument | undefined;
}

export function createEseDocument(data: {
  slug: string; title: string; content?: string; authorId?: number;
}): number {
  const result = getDb().prepare(
    `INSERT INTO ese_documents (slug, title, content, author_id) VALUES (?, ?, ?, ?)`
  ).run(data.slug, data.title, data.content ?? '', data.authorId ?? null);
  return result.lastInsertRowid as number;
}

export function updateEseDocument(slug: string, fields: {
  title?: string; content?: string; published?: number;
}) {
  const sets: string[] = ['updated_at = datetime("now")', 'version = version + 1'];
  const vals: any[]   = [];
  if (fields.title     !== undefined) { sets.push('title = ?');     vals.push(fields.title); }
  if (fields.content   !== undefined) { sets.push('content = ?');   vals.push(fields.content); }
  if (fields.published !== undefined) { sets.push('published = ?'); vals.push(fields.published); }
  vals.push(slug);
  getDb().prepare(`UPDATE ese_documents SET ${sets.join(', ')} WHERE slug = ?`).run(...vals);
}

export function deleteEseDocument(slug: string) {
  getDb().prepare('DELETE FROM ese_documents WHERE slug = ?').run(slug);
}

export function publishEseDocument(slug: string): EseDocument | undefined {
  getDb().prepare(
    `UPDATE ese_documents SET published = 1, updated_at = datetime('now'), version = version + 1 WHERE slug = ?`
  ).run(slug);
  return getEseDocumentBySlug(slug);
}

/* ── ESE Notifications ───────────────────────────────────── */
export interface EseNotification {
  id: number;
  document_id: number;
  title: string;
  message: string;
  created_at: string;
}

export function createEseNotification(documentId: number, title: string, message: string): number {
  const result = getDb().prepare(
    `INSERT INTO ese_notifications (document_id, title, message) VALUES (?, ?, ?)`
  ).run(documentId, title, message);
  return result.lastInsertRowid as number;
}

export function getRecentEseNotifications(limit = 20): EseNotification[] {
  return getDb().prepare(
    `SELECT * FROM ese_notifications ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as EseNotification[];
}
