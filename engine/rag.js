const { config, DOCUMENT_TYPES } = require('./config');
const { documentQueries, embeddingQueries, deleteProject } = require('./db');
const { embedText, assertModels } = require('./ollama');

function chunkText(text, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
  if (chunkSize <= overlap) {
    throw new Error('RAG_CHUNK_SIZE debe ser mayor que RAG_CHUNK_OVERLAP');
  }
  const paragraphs = String(text || '')
    .split(/\n+/)
    .map((paragraph) => paragraph.split(/\s+/).filter(Boolean))
    .filter((words) => words.length);
  const chunks = [];
  let current = [];
  let fresh = 0;
  function flush() {
    if (!fresh) return;
    chunks.push(current.join(' '));
    current = overlap ? current.slice(-overlap) : [];
    fresh = 0;
  }
  for (const words of paragraphs) {
    if (fresh && current.length + words.length > chunkSize && words.length <= chunkSize - overlap) flush();
    for (const word of words) {
      current.push(word);
      fresh += 1;
      if (current.length >= chunkSize) flush();
    }
  }
  flush();
  return chunks;
}

function isUsefulChunk(chunk) {
  const visible = chunk.replace(/\s/g, '');
  const letters = (chunk.match(/\p{L}/gu) || []).length;
  return chunk.split(/\s+/).length >= 5 && letters / Math.max(visible.length, 1) >= 0.4;
}

function selectContext(scored, budgetChars) {
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
  const seenText = new Set();
  let used = 0;
  const share = Math.max(500, Math.floor(budgetChars / Math.max(byDocument.size, 1)));

  function addPiece(row, limit) {
    if (seen.has(row.id) || seenText.has(row.chunk_text)) return;
    const room = Math.min(limit, budgetChars - used);
    if (room < 80) return;
    const piece = row.chunk_text.length > room ? row.chunk_text.slice(0, room) : row.chunk_text;
    picked.push({ ...row, chunk_text: piece });
    seen.add(row.id);
    seenText.add(row.chunk_text);
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
  const all = chunkText(document.content);
  const useful = all.filter(isUsefulChunk);
  const chunks = useful.length ? useful : all;
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
  await embeddingQueries.replaceForDocument(document.id, chunks, vectors);
  return { id: document.id, title: document.title, fragmentos: chunks.length };
}

async function indexProject(project, onProgress) {
  await assertModels();
  const documents = await documentQueries.list(project);
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
      if (onProgress) onProgress(`Indexando ${index + 1}/${documents.length}: ${document.title} · fragmento ${current}/${total}`);
    }));
  }
  return { proyecto: project, documentos: indexed };
}

function selectRanked(rows, budgetChars) {
  const picked = [];
  const seenText = new Set();
  let used = 0;
  for (const row of rows) {
    const room = budgetChars - used;
    if (room < 80) break;
    if (seenText.has(row.chunk_text)) continue;
    seenText.add(row.chunk_text);
    const piece = row.chunk_text.length > room ? row.chunk_text.slice(0, room) : row.chunk_text;
    picked.push({ ...row, chunk_text: piece });
    used += piece.length;
  }
  return picked;
}

async function retrieveKnowledge(queryVector, budgetChars) {
  const rows = await embeddingQueries.search(
    config.knowledgeProject,
    DOCUMENT_TYPES,
    queryVector,
    config.embedModel,
    config.knowledgeTopK
  );
  const relevant = rows.filter((row) => row.similarity >= config.knowledgeMinSimilarity);
  return selectRanked(relevant, budgetChars).map((row) => ({ ...row, origen: 'base_conocimiento' }));
}

async function retrieve(project, query, types, { conBase = false } = {}) {
  const queryVector = await embedText(query);
  const rows = await embeddingQueries.search(project, types, queryVector);
  if (!rows.length) {
    const error = new Error(
      `No hay embeddings para "${project}". Ejecuta: node engine/cli.js indexar --proyecto "${project}"`
    );
    error.status = 400;
    throw error;
  }
  const useKnowledge = conBase && project !== config.knowledgeProject;
  const knowledgeBudget = useKnowledge ? Math.floor(config.budgetChars * config.knowledgeShare) : 0;
  const knowledge = useKnowledge ? await retrieveKnowledge(queryVector, knowledgeBudget) : [];
  const used = knowledge.reduce((total, row) => total + row.chunk_text.length, 0);
  const own = selectContext(rows, config.budgetChars - used);
  return {
    picked: [...own.picked.map((row) => ({ ...row, origen: 'proyecto' })), ...knowledge],
    omitted: own.omitted,
  };
}

function formatContext(picked) {
  if (!picked.length) return 'No hay fragmentos recuperados.';
  return picked.map((row, index) => {
    const similarity = Number(row.similarity || 0).toFixed(3);
    const origin = row.origen || 'proyecto';
    return `[${index + 1}] origen=${origin} documento="${row.title}" tipo=${row.type} fragmento=${row.chunk_index} similitud=${similarity}\n${row.chunk_text}`;
  }).join('\n\n');
}

async function selfCheck() {
  const chunks = chunkText('uno dos tres cuatro cinco', 2, 1);
  if (chunks.join(' | ') !== 'uno dos | dos tres | tres cuatro | cuatro cinco') {
    throw new Error(`chunkText inesperado: ${chunks.join(' | ')}`);
  }

  const project = '__verificar_rag__';
  const model = '__verificar__';
  await deleteProject(project);
  try {
    const loginId = await documentQueries.create(
      'Login verificar',
      'El usuario inicia sesión con email y contraseña.',
      'caso_uso',
      project
    );
    const pagoId = await documentQueries.create(
      'Pago verificar',
      'El cliente paga el pedido con tarjeta.',
      'caso_uso',
      project
    );
    await embeddingQueries.replaceForDocument(loginId, ['inicio de sesión email contraseña'], [[1, 0, 0]], model);
    await embeddingQueries.replaceForDocument(pagoId, ['pago con tarjeta del pedido'], [[0, 1, 0]], model);

    const rows = await embeddingQueries.search(project, ['caso_uso'], [1, 0, 0], model);
    const selected = selectContext(rows, 10000);
    const titles = selected.picked.map((row) => row.title);
    if (titles[0] !== 'Login verificar' || !titles.includes('Pago verificar')) {
      throw new Error(`La búsqueda no cubrió la base: ${titles.join(', ')}`);
    }
    if (selected.picked[0].similarity < 0.99) {
      throw new Error('La similitud del fragmento de login no es 1');
    }
    return {
      ok: true,
      motor: 'PostgreSQL (cosine_similarity)',
      fragmentos: titles,
      similitud_login: selected.picked[0].similarity,
    };
  } finally {
    await deleteProject(project);
  }
}

module.exports = {
  chunkText,
  selectContext,
  indexDocument,
  indexProject,
  retrieve,
  formatContext,
  selfCheck,
};
