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
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`✅ Created data directory: ${dataDir}`);
  } catch (error) {
    console.error(`❌ Failed to create data directory: ${error.message}`);
    throw error;
  }
}

// Create database connection
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log(`✅ SQLite database connection opened: ${DB_PATH}`);
} catch (error) {
  console.error(`❌ Failed to open database: ${error.message}`);
  throw error;
}

// Initialize schema
function initializeSchema() {
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS core_terms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_en TEXT NOT NULL,
      term_de TEXT NOT NULL,
      ipa_uk TEXT,
      source_lang TEXT NOT NULL DEFAULT 'en',
      target_lang TEXT NOT NULL DEFAULT 'de',
      part_of_speech TEXT,
      details TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0,
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

    console.log('✅ SQLite database schema initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    throw error;
  }
}

// Migration function to add new columns if they don't exist
function migrateSchema() {
  try {
    // Check if pinned column exists, if not add it
    const tableInfo = db.prepare("PRAGMA table_info(core_terms)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('pinned')) {
      db.exec("ALTER TABLE core_terms ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0");
      console.log('✅ Added pinned column to core_terms');
    }
    
    if (!columnNames.includes('priority')) {
      db.exec("ALTER TABLE core_terms ADD COLUMN priority INTEGER NOT NULL DEFAULT 0");
      console.log('✅ Added priority column to core_terms');
    }

    if (!columnNames.includes('part_of_speech')) {
      db.exec("ALTER TABLE core_terms ADD COLUMN part_of_speech TEXT");
      console.log('✅ Added part_of_speech column to core_terms');
    }

    if (!columnNames.includes('details')) {
      db.exec("ALTER TABLE core_terms ADD COLUMN details TEXT");
      console.log('✅ Added details column to core_terms');
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    // Don't throw - column might already exist from previous run
  }
}

// Initialize on startup
initializeSchema();
migrateSchema();

// PostgreSQL-compatible pool interface
export const pool = {
  query: (sql, params = []) => {
    // Convert PostgreSQL $1, $2 placeholders to ? for SQLite
    let sqliteSql = sql.replace(/\$\d+/g, '?');
    
    try {
      const stmt = db.prepare(sqliteSql);
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const rows = stmt.all(...params);
        return Promise.resolve({ rows, rowCount: rows.length });
      } else {
        // For INSERT/UPDATE/DELETE, try to run and get RETURNING if present
        const info = stmt.run(...params);
        
        // SQLite 3.35+ supports RETURNING, but if not, fetch manually
        if (sqliteSql.toUpperCase().includes('RETURNING') && info.lastInsertRowid) {
          const tableName = getTableName(sqliteSql);
          const returningMatch = sqliteSql.match(/RETURNING\s+(.+?)$/i);
          const columns = returningMatch ? returningMatch[1].split(',').map(c => c.trim()) : ['*'];
          
          const selectSql = `SELECT ${columns.join(', ')} FROM ${tableName} WHERE id = ?`;
          const selectStmt = db.prepare(selectSql);
          const rows = selectStmt.all(info.lastInsertRowid);
          return Promise.resolve({ rows, rowCount: rows.length });
        }
        
        return Promise.resolve({ 
          rows: [{ id: info.lastInsertRowid }], 
          rowCount: info.changes 
        });
      }
    } catch (error) {
      console.error('❌ SQLite query error:', error.message);
      console.error('SQL:', sqliteSql);
      console.error('Params:', params);
      return Promise.reject(error);
    }
  }
};

// Helper to extract table name from SQL
function getTableName(sql) {
  const match = sql.match(/(?:INSERT INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
  return match ? match[1] : 'core_terms';
}

// Transaction helper
export function withTransaction(callback) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(() => {
      try {
        const client = {
          query: pool.query
        };
        const result = callback(client);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    try {
      transaction();
    } catch (error) {
      reject(error);
    }
  });
}
