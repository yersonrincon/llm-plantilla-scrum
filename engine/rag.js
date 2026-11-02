const { config } = require('./config');
const { getDb, documentQueries, embeddingQueries, deleteProject } = require('./db');
const { embedText, assertModels } = require('./ollama');

function chunkText(text, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
  if (chunkSize <= overlap) {
    throw new Error('RAG_CHUNK_SIZE debe ser mayor que RAG_CHUNK_OVERLAP');
  }
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const chunks = [];
  const step = chunkSize - overlap;
  for (let index = 0; index < words.length; index += step) {
    const chunk = words.slice(index, index + chunkSize).join(' ').trim();
    if (chunk) chunks.push(chunk);
    if (index + chunkSize >= words.length) break;
  }
  return chunks;
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function selectContext(rows, queryVector, budgetChars) {
  const scored = rows.map((row) => ({
    id: row.id,
    document_id: row.document_id,
    title: row.title,
    type: row.type,
    chunk_index: row.chunk_index,
    chunk_text: row.chunk_text,
    similarity: cosineSimilarity(queryVector, row.vector),
  }));

  const byDocument = new Map();
  for (const row of scored) {
    const list = byDocument.get(row.document_id);
    if (list) list.push(row);
    else byDocument.set(row.document_id, [row]);
  }

  const coverage = [];
  for (const list of byDocument.values()) {
    list.sort((a, b) => b.similarity - a.similarity);
    coverage.push(list[0]);
  }
  coverage.sort((a, b) => b.similarity - a.similarity);

  const picked = [];
  const seen = new Set();
  let used = 0;
  const share = Math.max(500, Math.floor(budgetChars / Math.max(byDocument.size, 1)));

  function addPiece(row, limit) {
    if (seen.has(row.id)) return;
    const room = Math.min(limit, budgetChars - used);
    if (room < 80) return;
    const piece = row.chunk_text.length > room ? row.chunk_text.slice(0, room) : row.chunk_text;
    picked.push({ ...row, chunk_text: piece });
    seen.add(row.id);
    used += piece.length;
  }

  for (const row of coverage) addPiece(row, share);
  const ranked = [...scored].sort((a, b) => b.similarity - a.similarity);
  for (const row of ranked) addPiece(row, budgetChars - used);

  const usedDocs = new Set(picked.map((row) => row.document_id));
  const omitted = coverage
    .filter((row) => !usedDocs.has(row.document_id))
    .map((row) => row.title);

  return { picked, omitted };
}

async function indexDocument(document, onChunk) {
  const chunks = chunkText(document.content);
  if (!chunks.length) {
    const error = new Error(`El documento "${document.title}" no tiene texto`);
    error.status = 400;
    throw error;
  }
  const vectors = [];
  for (let index = 0; index < chunks.length; index += 1) {
    if (onChunk) onChunk(index + 1, chunks.length);
    vectors.push(await embedText(chunks[index]));
  }
  const tx = getDb().transaction(() => {
    embeddingQueries.deleteByDocument(document.id);
    vectors.forEach((vector, index) => {
      embeddingQueries.create(document.id, chunks[index], index, JSON.stringify(vector));
    });
  });
  tx();
  return { id: document.id, title: document.title, fragmentos: chunks.length };
}

async function indexProject(project, onProgress) {
  await assertModels();
  const documents = documentQueries.list(project);
  if (!documents.length) {
    const error = new Error(`No hay documentos del proyecto "${project}" en la base`);
    error.status = 400;
    throw error;
  }
  const indexed = [];
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    if (onProgress) onProgress(`Indexando ${index + 1}/${documents.length}: ${document.title}`);
    indexed.push(await indexDocument(document, (current, total) => {
      if (onProgress) onProgress(`  fragmento ${current}/${total}`);
    }));
  }
  return { proyecto: project, documentos: indexed };
}

async function retrieve(project, query, types) {
  const rows = embeddingQueries.listFor(project, types);
  if (!rows.length) {
    const error = new Error(
      `No hay embeddings para "${project}". Ejecuta: node engine/cli.js indexar --proyecto "${project}"`
    );
    error.status = 400;
    throw error;
  }
  const queryVector = await embedText(query);
  const parsed = rows.map((row) => ({
    id: row.id,
    document_id: row.document_id,
    title: row.title,
    type: row.type,
    chunk_index: row.chunk_index,
    chunk_text: row.chunk_text,
    vector: JSON.parse(row.embedding),
  }));
  return selectContext(parsed, queryVector, config.budgetChars);
}

function formatContext(picked) {
  if (!picked.length) return 'No hay fragmentos recuperados.';
  return picked.map((row, index) => {
    const similarity = Number(row.similarity || 0).toFixed(3);
    return `[${index + 1}] documento="${row.title}" tipo=${row.type} fragmento=${row.chunk_index} similitud=${similarity}\n${row.chunk_text}`;
  }).join('\n\n');
}

function selfCheck() {
  const chunks = chunkText('uno dos tres cuatro cinco', 2, 1);
  if (chunks.join(' | ') !== 'uno dos | dos tres | tres cuatro | cuatro cinco') {
    throw new Error(`chunkText inesperado: ${chunks.join(' | ')}`);
  }

  const project = '__verificar_rag__';
  deleteProject(project);
  try {
    const loginId = documentQueries.create(
      'Login verificar',
      'El usuario inicia sesión con email y contraseña.',
      'caso_uso',
      project
    );
    const pagoId = documentQueries.create(
      'Pago verificar',
      'El cliente paga el pedido con tarjeta.',
      'caso_uso',
      project
    );
    embeddingQueries.create(loginId, 'inicio de sesión email contraseña', 0, JSON.stringify([1, 0, 0]));
    embeddingQueries.create(pagoId, 'pago con tarjeta del pedido', 0, JSON.stringify([0, 1, 0]));

    const rows = embeddingQueries.listFor(project, ['caso_uso']).map((row) => ({
      ...row,
      vector: JSON.parse(row.embedding),
    }));
    const selected = selectContext(rows, [1, 0, 0], 10000);
    const titles = selected.picked.map((row) => row.title);
    if (titles[0] !== 'Login verificar' || !titles.includes('Pago verificar')) {
      throw new Error(`La búsqueda no cubrió la base: ${titles.join(', ')}`);
    }
    if (selected.picked[0].similarity < 0.99) {
      throw new Error('La similitud del fragmento de login no es 1');
    }
    return {
      ok: true,
      fragmentos: titles,
      similitud_login: selected.picked[0].similarity,
    };
  } finally {
    deleteProject(project);
  }
}

module.exports = {
  chunkText,
  cosineSimilarity,
  selectContext,
  indexDocument,
  indexProject,
  retrieve,
  formatContext,
  selfCheck,
};
