const { config } = require('./config');

function loadClient() {
  const pkg = require('ollama');
  const Ollama = pkg.Ollama || (pkg.default && pkg.default.Ollama) || pkg.default;
  if (typeof Ollama !== 'function') {
    throw new Error('La librería npm "ollama" no exportó el cliente. Reinstala las dependencias.');
  }
  return new Ollama({ host: config.ollamaHost });
}

let client;

function getClient() {
  if (!client) client = loadClient();
  return client;
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ollamaVersion() {
  let response;
  try {
    response = await fetch(`${config.ollamaHost}/api/version`);
  } catch {
    throw fail(
      `Ollama no está corriendo en ${config.ollamaHost}. Ábrelo y descarga los modelos antes de indexar.`,
      503
    );
  }
  if (!response.ok) {
    throw fail(`Ollama respondió HTTP ${response.status}`, 503);
  }
  return response.json();
}

async function installedModels() {
  await ollamaVersion();
  const listed = await getClient().list();
  return (listed.models || []).map((model) => model.name || model.model).filter(Boolean);
}

function hasModel(names, wanted) {
  return names.some((name) => {
    if (name === wanted) return true;
    if (!wanted.includes(':')) return name.startsWith(`${wanted}:`);
    return false;
  });
}

async function assertModels() {
  const names = await installedModels();
  const missing = [config.chatModel, config.embedModel].filter((model) => !hasModel(names, model));
  if (missing.length) {
    throw fail(
      `Faltan modelos en Ollama: ${missing.join(', ')}.\n` +
        `Descárgalos con:\n  ollama pull ${config.chatModel}\n  ollama pull ${config.embedModel}`,
      503
    );
  }
  return names;
}

function gpuOptions(extra = {}) {
  return {
    temperature: config.temperature,
    top_p: 0.9,
    num_ctx: config.numCtx,
    num_gpu: config.numGpu,
    ...extra,
  };
}

async function embedText(text) {
  const ollama = getClient();
  const prompt = String(text || '').slice(0, 8000);
  const request = {
    model: config.embedModel,
    keep_alive: '2m',
    options: { num_gpu: config.numGpu },
  };
  if (typeof ollama.embed === 'function') {
    try {
      const response = await ollama.embed({ ...request, input: prompt });
      const vector = response.embeddings && response.embeddings[0];
      if (Array.isArray(vector) && vector.length) return vector;
    } catch (error) {
      if (typeof ollama.embeddings !== 'function') throw error;
    }
  }
  const response = await ollama.embeddings({ ...request, prompt });
  if (!Array.isArray(response.embedding) || response.embedding.length === 0) {
    throw fail('Ollama devolvió un embedding vacío', 502);
  }
  return response.embedding;
}

async function chat(messages, options = {}) {
  const request = {
    model: config.chatModel,
    messages,
    stream: false,
    keep_alive: '15m',
    options: gpuOptions({
      num_predict: options.numPredict || config.numPredict,
    }),
  };
  if (options.format) request.format = options.format;
  const response = await getClient().chat(request);
  const content = response && response.message && response.message.content;
  if (!content || !String(content).trim()) {
    throw fail('Hermes no devolvió texto', 502);
  }
  return String(content);
}

function parseJson(text) {
  const trimmed = String(text).trim().replace(/^\uFEFF/, '');
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('Hermes no devolvió JSON');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

async function chatJson(messages) {
  let predict = config.numPredict;
  let last = '';
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    last = await chat(messages, { format: 'json', numPredict: predict });
    try {
      return parseJson(last);
    } catch (error) {
      lastError = error;
      predict = Math.min(predict * 2, 4096);
    }
  }
  throw fail(
    `${lastError.message}. Inicio de la respuesta: ${last.slice(0, 280)}`,
    502
  );
}

module.exports = {
  ollamaVersion,
  installedModels,
  assertModels,
  embedText,
  chat,
  chatJson,
};
