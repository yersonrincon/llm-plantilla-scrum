const fs = require('fs');
const path = require('path');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), '.env'));
loadEnvFile(path.join(process.cwd(), '.env.local'));

const RX_PROFILES = {
  4: { numCtx: 2048, budgetChars: 6000, numPredict: 900 },
  6: { numCtx: 3072, budgetChars: 8000, numPredict: 1000 },
  8: { numCtx: 4096, budgetChars: 12000, numPredict: 1400 },
  12: { numCtx: 6144, budgetChars: 16000, numPredict: 1600 },
  16: { numCtx: 8192, budgetChars: 20000, numPredict: 1800 },
  24: { numCtx: 8192, budgetChars: 24000, numPredict: 2000 },
};

function rxProfile() {
  const raw = String(process.env.RX_VRAM || '8').toLowerCase().replace('gb', '').trim();
  const key = Object.prototype.hasOwnProperty.call(RX_PROFILES, raw) ? raw : '8';
  return { vram: key, ...RX_PROFILES[key] };
}

const profile = rxProfile();

const config = {
  ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  chatModel: process.env.OLLAMA_CHAT_MODEL || 'hermes3:3b-llama3.2-q4_K_M',
  embedModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  dbPath: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/scrum-llm.db'),
  chunkSize: Number(process.env.RAG_CHUNK_SIZE || 180),
  chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP || 30),
  numGpu: Number(process.env.OLLAMA_NUM_GPU || 999),
  numCtx: Number(process.env.OLLAMA_NUM_CTX || profile.numCtx),
  budgetChars: Number(process.env.RAG_BUDGET_CHARS || profile.budgetChars),
  numPredict: Number(process.env.OLLAMA_NUM_PREDICT || profile.numPredict),
  temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.1),
  rxVram: profile.vram,
  port: Number(process.env.LLM_PORT || 43124),
};

const DOCUMENT_TYPES = ['caso_uso', 'manual', 'guia', 'otro'];

const FLUJO = [
  'Guardar en SQLite los manuales y casos de uso del proyecto.',
  'Indexar: Ollama calcula embeddings con nomic-embed-text y los guarda en la misma base.',
  'Recuperar: cada fase ordena esos embeddings y arma el contexto solo con filas locales.',
  'Analizar: Hermes 3 (Llama 3.2) redacta la plantilla Scrum por fases usando ese contexto.',
  'Guardar la plantilla generada en SQLite.',
];

function assertProject(name) {
  const project = String(name || '').trim();
  if (!project) {
    const error = new Error('Indica el proyecto. Ejemplo: --proyecto "tienda"');
    error.status = 400;
    throw error;
  }
  if (project.length > 80) {
    const error = new Error('El nombre del proyecto supera 80 caracteres');
    error.status = 400;
    throw error;
  }
  return project;
}

module.exports = {
  config,
  RX_PROFILES,
  DOCUMENT_TYPES,
  FLUJO,
  assertProject,
};
