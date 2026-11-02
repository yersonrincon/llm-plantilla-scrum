const { config } = require('./config');

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function request(pathname, body) {
  let response;
  try {
    response = await fetch(`${config.ollamaHost}${pathname}`, body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
  } catch {
    throw fail(
      `Ollama no está corriendo en ${config.ollamaHost}. Ábrelo y descarga los modelos antes de indexar.`,
      503
    );
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw fail(`Ollama respondió HTTP ${response.status} en ${pathname}${detail ? `: ${detail}` : ''}`,
      response.status === 404 ? 404 : 502);
  }
  return response.json();
}

async function ollamaVersion() {
  return request('/api/version');
}

async function installedModels() {
  const listed = await request('/api/tags');
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
    repeat_penalty: 1.1,
    repeat_last_n: 256,
    num_ctx: config.numCtx,
    num_gpu: config.numGpu,
    ...extra,
  };
}

const RETRY_OPTIONS = [
  {},
  { temperature: 0.4, repeat_penalty: 1.25 },
  { temperature: 0.7, repeat_penalty: 1.35, top_p: 0.95 },
];

function isRepetitionAbort(error) {
  return /repeat limit|prediction aborted/i.test(String(error && error.message));
}

async function embedText(text) {
  const prompt = String(text || '').slice(0, 8000);
  const base = {
    model: config.embedModel,
    keep_alive: '2m',
    options: { num_gpu: config.numGpu },
  };
  try {
    const response = await request('/api/embed', { ...base, input: prompt });
    const vector = response.embeddings && response.embeddings[0];
    if (Array.isArray(vector) && vector.length) return vector;
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const response = await request('/api/embeddings', { ...base, prompt });
  if (!Array.isArray(response.embedding) || response.embedding.length === 0) {
    throw fail('Ollama devolvió un embedding vacío', 502);
  }
  return response.embedding;
}

async function chat(messages, options = {}) {
  const body = {
    model: config.chatModel,
    messages,
    stream: false,
    keep_alive: '15m',
    options: gpuOptions({
      num_predict: options.numPredict || config.numPredict,
      ...(options.sampling || {}),
    }),
  };
  if (options.format) body.format = options.format;
  const response = await request('/api/chat', body);
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
  for (const sampling of RETRY_OPTIONS) {
    try {
      last = await chat(messages, { format: 'json', numPredict: predict, sampling });
    } catch (error) {
      if (!isRepetitionAbort(error)) throw error;
      lastError = new Error('Hermes entró en un bucle repitiendo texto');
      continue;
    }
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
