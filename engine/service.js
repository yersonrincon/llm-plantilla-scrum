const fs = require('fs');
const { config, DOCUMENT_TYPES, FLUJO, assertProject } = require('./config');
const { documentQueries, templateQueries, counts } = require('./db');
const { ollamaVersion, installedModels } = require('./ollama');
const { indexProject } = require('./rag');
const { generarPlantilla, preguntar } = require('./workflow');
const samples = require('./samples');

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function initDatabase() {
  const existing = documentQueries.list('ejemplo');
  if (existing.length) {
    return {
      creados: 0,
      proyecto: 'ejemplo',
      mensaje: 'La base ya tiene documentos del proyecto ejemplo.',
      base: config.dbPath,
    };
  }
  const ids = samples.map((sample) => documentQueries.create(
    sample.title,
    sample.content.trim(),
    sample.type,
    'ejemplo'
  ));
  return {
    creados: ids.length,
    proyecto: 'ejemplo',
    ids,
    mensaje: 'Se guardaron casos de uso de ejemplo. Falta indexarlos para crear el RAG.',
    base: config.dbPath,
  };
}

function agregarDocumento({ proyecto, titulo, tipo, contenido }) {
  const project = assertProject(proyecto);
  const title = String(titulo || '').trim();
  const type = String(tipo || '').trim();
  const content = String(contenido || '').replace(/^\uFEFF/, '').trim();
  if (!title) throw httpError('Falta el título del documento', 400);
  if (!DOCUMENT_TYPES.includes(type)) {
    throw httpError(`Tipo inválido. Usa: ${DOCUMENT_TYPES.join(', ')}`, 400);
  }
  if (!content) throw httpError('El contenido está vacío', 400);
  const id = documentQueries.create(title, content, type, project);
  return {
    id,
    proyecto: project,
    titulo: title,
    tipo: type,
    siguiente: `node engine/cli.js indexar --proyecto "${project}"`,
  };
}

function leerArchivo(file) {
  const target = String(file || '').trim();
  if (!target) throw httpError('Falta la ruta del archivo', 400);
  if (!fs.existsSync(target)) throw httpError(`No existe el archivo: ${target}`, 400);
  return fs.readFileSync(target, 'utf8');
}

function listarDocumentos(proyecto) {
  const project = proyecto ? assertProject(proyecto) : '';
  const documents = documentQueries.list(project || undefined).map((document) => ({
    id: document.id,
    titulo: document.title,
    tipo: document.type,
    proyecto: document.project,
    caracteres: document.content ? document.content.length : document.content_length,
    creado: document.created_at,
  }));
  return { documentos: documents };
}

function listarPlantillas(proyecto, id) {
  if (id) {
    const template = templateQueries.findById(Number(id));
    if (!template) throw httpError('Plantilla no encontrada', 404);
    return { plantilla: template };
  }
  const project = proyecto ? assertProject(proyecto) : '';
  return { plantillas: templateQueries.list(project || undefined) };
}

async function salud() {
  const database = counts();
  const body = {
    ok: false,
    flujo: FLUJO,
    modelo_chat: config.chatModel,
    modelo_embeddings: config.embedModel,
    perfil_rx_vram_gb: config.rxVram,
    num_ctx: config.numCtx,
    num_gpu: config.numGpu,
    base: config.dbPath,
    conteos: database,
  };
  try {
    const version = await ollamaVersion();
    const models = await installedModels();
    body.ollama = version;
    body.modelos_instalados = models;
    body.modelos_listos = [config.chatModel, config.embedModel].every((model) => (
      models.some((name) => name === model || (!model.includes(':') && name.startsWith(`${model}:`)))
    ));
    body.ok = true;
  } catch (error) {
    body.ok = false;
    body.ollama_error = error.message;
  }
  return body;
}

async function indexarProyecto(proyecto, onProgress) {
  return indexProject(assertProject(proyecto), onProgress);
}

async function crearPlantilla(proyecto, nombre, onProgress) {
  return generarPlantilla(assertProject(proyecto), nombre, onProgress);
}

async function consultar(proyecto, pregunta) {
  const question = String(pregunta || '').trim();
  if (!question) throw httpError('Falta la pregunta', 400);
  return preguntar(assertProject(proyecto), question);
}

module.exports = {
  initDatabase,
  agregarDocumento,
  leerArchivo,
  listarDocumentos,
  listarPlantillas,
  indexProject: indexarProyecto,
  generarPlantilla: crearPlantilla,
  preguntar: consultar,
  salud,
  FLUJO,
};
