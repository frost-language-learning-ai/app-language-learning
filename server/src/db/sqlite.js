import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(__dirname, '..', '..', 'data', 'language_learning.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS core_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_en TEXT NOT NULL,
      term_de TEXT NOT NULL,
      ipa_uk TEXT,
      source_lang TEXT NOT NULL DEFAULT 'en',
      target_lang TEXT NOT NULL DEFAULT 'de',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(term_en, term_de, source_lang, target_lang)
    );

    CREATE INDEX IF NOT EXISTS idx_core_terms_lang_pair 
    ON core_terms (source_lang, target_lang, created_at DESC);

    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      tags TEXT,
      embedding_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (term_id) REFERENCES core_terms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_term_id 
    ON knowledge_nodes (term_id);

    CREATE TABLE IF NOT EXISTS audio_repository (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      self_evaluation INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (term_id) REFERENCES core_terms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audio_repository_term_id 
    ON audio_repository (term_id);

    CREATE TABLE IF NOT EXISTS term_evaluation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_id INTEGER NOT NULL,
      audio_id INTEGER,
      self_evaluation INTEGER NOT NULL,
      evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
      note TEXT,
      FOREIGN KEY (term_id) REFERENCES core_terms(id) ON DELETE CASCADE,
      FOREIGN KEY (audio_id) REFERENCES audio_repository(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_term_evaluation_history_term_id 
    ON term_evaluation_history (term_id, evaluated_at DESC);
  `);

  console.log('✅ SQLite database initialized at:', DB_PATH);
}

// Initialize on startup
initializeSchema();

// Export db instance
export default db;

// Helper function to convert SQLite results to pg-like format
export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
  
  if (isSelect) {
    const rows = stmt.all(...params);
    return { rows, rowCount: rows.length };
  } else {
    const info = stmt.run(...params);
    return { 
      rows: [{ id: info.lastInsertRowid }], 
      rowCount: info.changes 
    };
  }
}

// Transaction helper
export function withTransaction(callback) {
  return db.transaction(() => {
    return callback({
      query: (sql, params) => query(sql, params)
    });
  })();
}
