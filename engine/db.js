const { Client, Pool } = require('pg');
const { config, DOCUMENT_TYPES, describeDatabase } = require('./config');

let ready;

function connectionFor(database) {
  return {
    host: config.pg.host,
    port: config.pg.port,
    user: config.pg.user,
    password: config.pg.password,
    database,
  };
}

function friendly(error) {
  let message;
  if (error.code === 'ECONNREFUSED') {
    message = `PostgreSQL no responde en ${config.pg.host}:${config.pg.port}. Revisa que el servicio esté iniciado.`;
  } else if (error.code === '28P01' || error.code === '28000') {
    message = `PostgreSQL rechazó el usuario "${config.pg.user}". Revisa PGUSER y PGPASSWORD en el archivo .env.`;
  }
  if (!message) return error;
  const wrapped = new Error(message);
  wrapped.status = 503;
  wrapped.cause = error;
  return wrapped;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function createDatabaseIfMissing() {
  const probe = new Client(connectionFor(config.pg.database));
  try {
    await probe.connect();
    await probe.end();
    return;
  } catch (error) {
    await probe.end().catch(() => {});
    if (error.code !== '3D000') throw friendly(error);
  }
  const admin = new Client(connectionFor('postgres'));
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE ${quoteIdent(config.pg.database)}`);
  } catch (error) {
    if (error.code !== '42P04') throw friendly(error);
  } finally {
    await admin.end().catch(() => {});
  }
}

async function createSchema(pool) {
  await pool.query(`
    CREATE OR REPLACE FUNCTION cosine_similarity(a REAL[], b REAL[])
    RETURNS DOUBLE PRECISION
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $$
      SELECT CASE WHEN norm_a = 0 OR norm_b = 0 THEN 0 ELSE dot / (sqrt(norm_a) * sqrt(norm_b)) END
      FROM (
        SELECT sum(x::float8 * y) AS dot, sum(x::float8 * x) AS norm_a, sum(y::float8 * y) AS norm_b
        FROM unnest(a, b) AS pair(x, y)
      ) totals
    $$;

    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      project TEXT NOT NULL DEFAULT 'general',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS embeddings (
      id SERIAL PRIMARY KEY,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      chunk_text TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      model TEXT NOT NULL,
      embedding REAL[] NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      project TEXT NOT NULL DEFAULT 'general',
      template_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_embeddings_document ON embeddings(document_id, model);
    CREATE INDEX IF NOT EXISTS idx_templates_project ON templates(project);
  `);
}

async function open() {
  await createDatabaseIfMissing();
  const pool = new Pool({ ...connectionFor(config.pg.database), max: 5 });
  pool.on('error', (error) => console.error('PostgreSQL:', error.message));
  try {
    await createSchema(pool);
  } catch (error) {
    await pool.end().catch(() => {});
    throw friendly(error);
  }
  return pool;
}

function getPool() {
  if (!ready) {
    ready = open().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

async function query(sql, params) {
  const pool = await getPool();
  try {
    return await pool.query(sql, params);
  } catch (error) {
    throw friendly(error);
  }
}

async function transaction(fn) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw friendly(error);
  } finally {
    client.release();
  }
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

const INDEXED = `EXISTS (
  SELECT 1 FROM embeddings e WHERE e.document_id = d.id AND e.model = $1
) AS indexed`;

const documentQueries = {
  async create(title, content, type, project) {
    const { rows } = await query(
      'INSERT INTO documents (title, content, type, project) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, content, type, project]
    );
    return rows[0].id;
  },
  async list(project) {
    if (project) {
      const { rows } = await query(`
        SELECT d.id, d.title, d.content, d.type, d.project, d.created_at, d.updated_at, ${INDEXED}
        FROM documents d
        WHERE d.project = $2
        ORDER BY d.id
      `, [config.embedModel, project]);
      return rows;
    }
    const { rows } = await query(`
      SELECT d.id, d.title, d.type, d.project, d.created_at, d.updated_at,
             length(d.content) AS content_length, ${INDEXED}
      FROM documents d
      ORDER BY d.created_at DESC, d.id DESC
    `, [config.embedModel]);
    return rows;
  },
  async pending(project) {
    const { rows } = await query(`
      SELECT d.id, d.title, d.content, d.type, d.project
      FROM documents d
      WHERE d.project = $2 AND NOT EXISTS (
        SELECT 1 FROM embeddings e WHERE e.document_id = d.id AND e.model = $1
      )
      ORDER BY d.id
    `, [config.embedModel, project]);
    return rows;
  },
  async findSameContent(project, content) {
    const { rows } = await query(
      'SELECT id, title FROM documents WHERE project = $1 AND md5(content) = md5($2) LIMIT 1',
      [project, content]
    );
    return rows[0] || null;
  },
  async titles(project) {
    const { rows } = await query('SELECT title FROM documents WHERE project = $1', [project]);
    return rows.map((row) => row.title);
  },
  async findById(id) {
    const { rows } = await query(`
      SELECT id, title, content, type, project, created_at, updated_at
      FROM documents WHERE id = $1
    `, [id]);
    return rows[0];
  },
  async delete(id) {
    await query('DELETE FROM documents WHERE id = $1', [id]);
  },
  async all(project) {
    const { rows } = await query(`
      SELECT id, title, content, type, project FROM documents
      ${project ? 'WHERE project = $1' : ''}
      ORDER BY id
    `, project ? [project] : []);
    return rows;
  },
  async replaceContent(id, content) {
    await transaction(async (client) => {
      await client.query('UPDATE documents SET content = $2, updated_at = now() WHERE id = $1', [id, content]);
      await client.query('DELETE FROM embeddings WHERE document_id = $1', [id]);
    });
  },
};

async function storageSize() {
  const { rows } = await query(`
    SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS bytes
    FROM pg_class c
    WHERE c.relname IN ('documents', 'embeddings', 'templates') AND c.relkind = 'r'
  `);
  return Number(rows[0].bytes);
}

async function cleanStorage() {
  const removed = await transaction(async (client) => {
    const staleModels = await client.query('DELETE FROM embeddings WHERE model <> $1', [config.embedModel]);
    const duplicates = await client.query(`
      DELETE FROM documents d
      USING documents keep
      WHERE d.project = keep.project
        AND md5(d.content) = md5(keep.content)
        AND d.id > keep.id
      RETURNING d.id, d.title, d.project
    `);
    const empty = await client.query(`
      DELETE FROM documents WHERE length(regexp_replace(content, '\\s', '', 'g')) < 20
      RETURNING id, title, project
    `);
    const checks = await client.query(
      "DELETE FROM documents WHERE project = '__verificar_rag__' RETURNING id"
    );
    return {
      embeddings_de_otros_modelos: staleModels.rowCount,
      documentos_duplicados: duplicates.rows,
      documentos_vacios: empty.rows,
      restos_de_verificacion: checks.rowCount,
    };
  });
  const pool = await getPool();
  await pool.query('VACUUM (FULL, ANALYZE) documents, embeddings, templates');
  return removed;
}

const embeddingQueries = {
  async replaceForDocument(documentId, chunks, vectors, model = config.embedModel) {
    await transaction(async (client) => {
      await client.query('DELETE FROM embeddings WHERE document_id = $1', [documentId]);
      for (let index = 0; index < chunks.length; index += 1) {
        await client.query(`
          INSERT INTO embeddings (document_id, chunk_text, chunk_index, model, embedding)
          VALUES ($1, $2, $3, $4, $5::real[])
        `, [documentId, chunks[index], index, model, vectors[index].map(Number)]);
      }
    });
  },
  async countByDocument(documentId, model = config.embedModel) {
    const { rows } = await query(
      'SELECT COUNT(*)::int AS total FROM embeddings WHERE document_id = $1 AND model = $2',
      [documentId, model]
    );
    return rows[0].total;
  },
  async search(project, types, vector, model = config.embedModel, limit = null) {
    assertKnownTypes(types);
    const { rows } = await query(`
      SELECT e.id, e.document_id, e.chunk_text, e.chunk_index,
             d.title, d.type, d.project,
             cosine_similarity(e.embedding, $1::real[]) AS similarity
      FROM embeddings e
      JOIN documents d ON d.id = e.document_id
      WHERE d.project = $2 AND d.type = ANY($3::text[]) AND e.model = $4
      ORDER BY similarity DESC
      LIMIT $5
    `, [vector.map(Number), project, types, model, limit]);
    return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
  },
  async projectStats(project, model = config.embedModel) {
    const { rows } = await query(`
      SELECT COUNT(*)::int AS documentos,
             COUNT(*) FILTER (WHERE EXISTS (
               SELECT 1 FROM embeddings e WHERE e.document_id = d.id AND e.model = $2
             ))::int AS indexados,
             (SELECT COUNT(*)::int FROM embeddings e JOIN documents x ON x.id = e.document_id
              WHERE x.project = $1 AND e.model = $2) AS fragmentos
      FROM documents d
      WHERE d.project = $1
    `, [project, model]);
    return rows[0];
  },
};

const templateQueries = {
  async create(name, description, project, templateData) {
    const { rows } = await query(`
      INSERT INTO templates (name, description, project, template_data)
      VALUES ($1, $2, $3, $4::jsonb) RETURNING id
    `, [name, description, project, JSON.stringify(templateData)]);
    return rows[0].id;
  },
  async list(project) {
    const { rows } = await query(`
      SELECT id, name, description, project, created_at
      FROM templates
      ${project ? 'WHERE project = $1' : ''}
      ORDER BY created_at DESC, id DESC
    `, project ? [project] : []);
    return rows;
  },
  async findById(id) {
    const { rows } = await query(`
      SELECT id, name, description, project, template_data, created_at
      FROM templates WHERE id = $1
    `, [id]);
    return rows[0] || null;
  },
};

async function deleteProject(project) {
  await transaction(async (client) => {
    await client.query('DELETE FROM documents WHERE project = $1', [project]);
    await client.query('DELETE FROM templates WHERE project = $1', [project]);
  });
}

async function counts() {
  const { rows } = await query(`
    SELECT (SELECT COUNT(*)::int FROM documents) AS documents,
           (SELECT COUNT(*)::int FROM embeddings) AS embeddings,
           (SELECT COUNT(*)::int FROM templates) AS templates
  `);
  return rows[0];
}

async function close() {
  if (!ready) return;
  const pool = await ready.catch(() => null);
  ready = undefined;
  if (pool) await pool.end();
}

module.exports = {
  getPool,
  query,
  transaction,
  documentQueries,
  embeddingQueries,
  templateQueries,
  deleteProject,
  storageSize,
  cleanStorage,
  counts,
  close,
  describeDatabase,
};
