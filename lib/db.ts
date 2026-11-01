import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'scrum-llm.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    template_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_document_type ON documents(type);
  CREATE INDEX IF NOT EXISTS idx_embedding_document ON embeddings(document_id);
`);

export interface Document {
  id?: number;
  title: string;
  content: string;
  type: 'caso_uso' | 'manual' | 'guia' | 'otro';
  created_at?: string;
  updated_at?: string;
}

export interface Embedding {
  id?: number;
  document_id: number;
  chunk_text: string;
  chunk_index: number;
  embedding: number[];
}

export interface Template {
  id?: number;
  name: string;
  description?: string;
  template_data: any;
  created_at?: string;
}

export const documentQueries = {
  create: db.prepare(`
    INSERT INTO documents (title, content, type)
    VALUES (?, ?, ?)
  `),
  
  findAll: db.prepare(`
    SELECT * FROM documents ORDER BY created_at DESC
  `),
  
  findById: db.prepare(`
    SELECT * FROM documents WHERE id = ?
  `),
  
  findByType: db.prepare(`
    SELECT * FROM documents WHERE type = ? ORDER BY created_at DESC
  `),
  
  update: db.prepare(`
    UPDATE documents 
    SET title = ?, content = ?, type = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  
  delete: db.prepare(`
    DELETE FROM documents WHERE id = ?
  `)
};

export const embeddingQueries = {
  create: db.prepare(`
    INSERT INTO embeddings (document_id, chunk_text, chunk_index, embedding)
    VALUES (?, ?, ?, ?)
  `),
  
  findByDocument: db.prepare(`
    SELECT * FROM embeddings WHERE document_id = ? ORDER BY chunk_index
  `),
  
  findAll: db.prepare(`
    SELECT * FROM embeddings
  `),
  
  deleteByDocument: db.prepare(`
    DELETE FROM embeddings WHERE document_id = ?
  `)
};

export const templateQueries = {
  create: db.prepare(`
    INSERT INTO templates (name, description, template_data)
    VALUES (?, ?, ?)
  `),
  
  findAll: db.prepare(`
    SELECT * FROM templates ORDER BY created_at DESC
  `),
  
  findById: db.prepare(`
    SELECT * FROM templates WHERE id = ?
  `)
};

export default db;
