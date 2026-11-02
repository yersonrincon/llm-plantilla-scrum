const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config, DOCUMENT_TYPES } = require('./config');

let db;
let statements;

function columnNames(database, table) {
  return database.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
}

function ensureColumn(database, table, column, definition) {
  if (!columnNames(database, table).includes(column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function openDatabase() {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const database = new DatabaseSync(config.dbPath);
  database.exec('PRAGMA journal_mode = WAL');
  database.exec('PRAGMA foreign_keys = ON');
  database.exec('PRAGMA busy_timeout = 5000');
  database.transaction = (fn) => () => {
    database.exec('BEGIN IMMEDIATE');
    try {
      fn();
      database.exec('COMMIT');
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  };

  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      project TEXT NOT NULL DEFAULT 'general',
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
      project TEXT NOT NULL DEFAULT 'general',
      template_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_document_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project);
    CREATE INDEX IF NOT EXISTS idx_embedding_document ON embeddings(document_id);
    CREATE INDEX IF NOT EXISTS idx_templates_project ON templates(project);
  `);

  ensureColumn(database, 'documents', 'project', "TEXT NOT NULL DEFAULT 'general'");
  ensureColumn(database, 'templates', 'project', "TEXT NOT NULL DEFAULT 'general'");
  database.exec('CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project)');
  database.exec('CREATE INDEX IF NOT EXISTS idx_templates_project ON templates(project)');
  return database;
}

function getDb() {
  if (!db) db = openDatabase();
  return db;
}

function getStatements() {
  if (statements) return statements;
  const database = getDb();
  statements = {
    insertDocument: database.prepare(`
      INSERT INTO documents (title, content, type, project)
      VALUES (?, ?, ?, ?)
    `),
    listDocuments: database.prepare(`
      SELECT id, title, type, project, created_at, updated_at,
             length(content) AS content_length
      FROM documents
      ORDER BY created_at DESC, id DESC
    `),
    listByProject: database.prepare(`
      SELECT id, title, content, type, project, created_at, updated_at
      FROM documents
      WHERE project = ?
      ORDER BY id
    `),
    findDocument: database.prepare(`
      SELECT id, title, content, type, project, created_at, updated_at
      FROM documents
      WHERE id = ?
    `),
    insertEmbedding: database.prepare(`
      INSERT INTO embeddings (document_id, chunk_text, chunk_index, embedding)
      VALUES (?, ?, ?, ?)
    `),
    deleteEmbeddings: database.prepare(`
      DELETE FROM embeddings WHERE document_id = ?
    `),
    countEmbeddings: database.prepare(`
      SELECT COUNT(*) AS total FROM embeddings WHERE document_id = ?
    `),
    insertTemplate: database.prepare(`
      INSERT INTO templates (name, description, project, template_data)
      VALUES (?, ?, ?, ?)
    `),
    listTemplates: database.prepare(`
      SELECT id, name, description, project, created_at
      FROM templates
      ORDER BY created_at DESC, id DESC
    `),
    listTemplatesByProject: database.prepare(`
      SELECT id, name, description, project, created_at
      FROM templates
      WHERE project = ?
      ORDER BY created_at DESC, id DESC
    `),
    findTemplate: database.prepare(`
      SELECT id, name, description, project, template_data, created_at
      FROM templates
      WHERE id = ?
    `),
  };
  return statements;
}

function assertKnownTypes(types) {
  for (const type of types) {
    if (!DOCUMENT_TYPES.includes(type)) {
      const error = new Error(`Tipo inválido: ${type}`);
      error.status = 400;
      throw error;
    }
  }
}

const documentQueries = {
  create(title, content, type, project) {
    const result = getStatements().insertDocument.run(title, content, type, project);
    return Number(result.lastInsertRowid);
  },
  list(project) {
    if (project) return getStatements().listByProject.all(project);
    return getStatements().listDocuments.all();
  },
  listByProjectTypes(project, types) {
    assertKnownTypes(types);
    const marks = types.map(() => '?').join(', ');
    return getDb().prepare(`
      SELECT id, title, content, type, project, created_at
      FROM documents
      WHERE project = ? AND type IN (${marks})
      ORDER BY id
    `).all(project, ...types);
  },
  findById(id) {
    return getStatements().findDocument.get(id);
  },
};

const embeddingQueries = {
  create(documentId, chunkText, chunkIndex, embedding) {
    getStatements().insertEmbedding.run(documentId, chunkText, chunkIndex, embedding);
  },
  deleteByDocument(documentId) {
    getStatements().deleteEmbeddings.run(documentId);
  },
  countByDocument(documentId) {
    return getStatements().countEmbeddings.get(documentId).total;
  },
  listFor(project, types) {
    assertKnownTypes(types);
    const marks = types.map(() => '?').join(', ');
    return getDb().prepare(`
      SELECT e.id, e.document_id, e.chunk_text, e.chunk_index, e.embedding,
             d.title, d.type, d.project
      FROM embeddings e
      JOIN documents d ON d.id = e.document_id
      WHERE d.project = ? AND d.type IN (${marks})
    `).all(project, ...types);
  },
};

const templateQueries = {
  create(name, description, project, templateData) {
    const result = getStatements().insertTemplate.run(name, description, project, templateData);
    return Number(result.lastInsertRowid);
  },
  list(project) {
    if (project) return getStatements().listTemplatesByProject.all(project);
    return getStatements().listTemplates.all();
  },
  findById(id) {
    const row = getStatements().findTemplate.get(id);
    if (!row) return null;
    return {
      ...row,
      template_data: JSON.parse(row.template_data),
    };
  },
};

function deleteProject(project) {
  const database = getDb();
  const tx = database.transaction(() => {
    database.prepare(`
      DELETE FROM embeddings
      WHERE document_id IN (SELECT id FROM documents WHERE project = ?)
    `).run(project);
    database.prepare('DELETE FROM documents WHERE project = ?').run(project);
    database.prepare('DELETE FROM templates WHERE project = ?').run(project);
  });
  tx();
}

function counts() {
  const database = getDb();
  return {
    documents: database.prepare('SELECT COUNT(*) AS total FROM documents').get().total,
    embeddings: database.prepare('SELECT COUNT(*) AS total FROM embeddings').get().total,
    templates: database.prepare('SELECT COUNT(*) AS total FROM templates').get().total,
  };
}

module.exports = {
  getDb,
  documentQueries,
  embeddingQueries,
  templateQueries,
  deleteProject,
  counts,
};
