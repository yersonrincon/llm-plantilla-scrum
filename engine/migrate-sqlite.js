const fs = require('fs');
const path = require('path');
const { config } = require('./config');
const { transaction } = require('./db');

function utc(value) {
  return value ? `${value}+00` : null;
}

async function migrateFromSqlite(file) {
  const source = path.resolve(file || config.sqlitePath);
  if (!fs.existsSync(source)) {
    const error = new Error(`No existe la base SQLite: ${source}`);
    error.status = 400;
    throw error;
  }
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(source, { readOnly: true });
  const hasModel = sqlite.prepare('PRAGMA table_info(embeddings)').all().some((column) => column.name === 'model');
  const documents = sqlite.prepare('SELECT * FROM documents ORDER BY id').all();
  const embeddings = sqlite.prepare('SELECT * FROM embeddings ORDER BY document_id, chunk_index').all();
  const templates = sqlite.prepare('SELECT * FROM templates ORDER BY id').all();
  sqlite.close();

  const summary = { origen: source, documentos: 0, embeddings: 0, plantillas: 0, omitidos: 0 };
  await transaction(async (client) => {
    const ids = new Map();
    for (const document of documents) {
      const project = document.project || 'general';
      const existing = await client.query(
        'SELECT id FROM documents WHERE project = $1 AND title = $2 AND content = $3 LIMIT 1',
        [project, document.title, document.content]
      );
      if (existing.rows.length) {
        summary.omitidos += 1;
        continue;
      }
      const { rows } = await client.query(`
        INSERT INTO documents (title, content, type, project, created_at, updated_at)
        VALUES ($1, $2, $3, $4, COALESCE($5::timestamptz, now()), COALESCE($6::timestamptz, now()))
        RETURNING id
      `, [document.title, document.content, document.type, project, utc(document.created_at), utc(document.updated_at)]);
      ids.set(document.id, rows[0].id);
      summary.documentos += 1;
    }

    for (const embedding of embeddings) {
      const documentId = ids.get(embedding.document_id);
      if (!documentId) continue;
      await client.query(`
        INSERT INTO embeddings (document_id, chunk_text, chunk_index, model, embedding)
        VALUES ($1, $2, $3, $4, $5::real[])
      `, [
        documentId,
        embedding.chunk_text,
        embedding.chunk_index,
        hasModel ? embedding.model : config.embedModel,
        JSON.parse(embedding.embedding).map(Number),
      ]);
      summary.embeddings += 1;
    }

    for (const template of templates) {
      const project = template.project || 'general';
      const existing = await client.query(
        'SELECT id FROM templates WHERE project = $1 AND name = $2 AND created_at = $3::timestamptz LIMIT 1',
        [project, template.name, utc(template.created_at)]
      );
      if (existing.rows.length) {
        summary.omitidos += 1;
        continue;
      }
      await client.query(`
        INSERT INTO templates (name, description, project, template_data, created_at)
        VALUES ($1, $2, $3, $4::jsonb, COALESCE($5::timestamptz, now()))
      `, [template.name, template.description, project, template.template_data, utc(template.created_at)]);
      summary.plantillas += 1;
    }
  });
  return summary;
}

module.exports = { migrateFromSqlite };
