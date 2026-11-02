const fs = require('fs');
const path = require('path');
const { config, DOCUMENT_TYPES, FLUJO, assertProject, describeDatabase } = require('./config');
const { documentQueries, embeddingQueries, templateQueries, counts, storageSize, cleanStorage } = require('./db');
const { cleanText, describeCleaning } = require('./clean');
const { ROLES } = require('./board');
const { ollamaVersion, installedModels, assertModels } = require('./ollama');
const { indexProject, indexDocument } = require('./rag');
const { extractText, EXTENSIONS } = require('./extract');
const { generarPlantilla, preguntar } = require('./workflow');
const samples = require('./samples');

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function initDatabase() {
  const existing = await documentQueries.list('ejemplo');
  if (existing.length) {
    return {
      creados: 0,
      proyecto: 'ejemplo',
      mensaje: 'La base ya tiene documentos del proyecto ejemplo.',
      base: describeDatabase(),
    };
  }
  const ids = [];
  for (const sample of samples) {
    ids.push(await documentQueries.create(sample.title, sample.content.trim(), sample.type, 'ejemplo'));
  }
  return {
    creados: ids.length,
    proyecto: 'ejemplo',
    ids,
    mensaje: 'Se guardaron casos de uso de ejemplo. Falta indexarlos para crear el RAG.',
    base: describeDatabase(),
  };
}

async function agregarDocumento({ proyecto, titulo, tipo, contenido }) {
  const project = assertProject(proyecto);
  const title = String(titulo || '').trim();
  const type = String(tipo || '').trim();
  const cleaned = cleanText(contenido);
  const content = cleaned.text;
  if (!title) throw httpError('Falta el título del documento', 400);
  if (!DOCUMENT_TYPES.includes(type)) {
    throw httpError(`Tipo inválido. Usa: ${DOCUMENT_TYPES.join(', ')}`, 400);
  }
  if (!content) throw httpError('El contenido está vacío', 400);
  const existing = await documentQueries.findSameContent(project, content);
  if (existing) {
    throw httpError(`Ese documento ya está guardado en "${project}" como «${existing.title}»`, 409);
  }
  const id = await documentQueries.create(title, content, type, project);
  return {
    id,
    proyecto: project,
    titulo: title,
    tipo: type,
    caracteres: content.length,
    siguiente: `node engine/cli.js indexar --proyecto "${project}"`,
  };
}

async function depurarDocumentos(proyecto, onProgress) {
  const project = proyecto ? assertProject(proyecto) : '';
  const documents = await documentQueries.all(project || undefined);
  const cambiados = [];
  for (let index = 0; index < documents.length; index += 1) {
    const document = documents[index];
    if (onProgress) onProgress(`Depurando ${index + 1}/${documents.length}: ${document.title}`);
    const { text, stats } = cleanText(document.content, { joinLines: true });
    if (text === document.content || text.replace(/\s/g, '').length < 20) continue;
    await documentQueries.replaceContent(document.id, text);
    cambiados.push({
      id: document.id,
      proyecto: document.project,
      titulo: document.title,
      antes: document.content.length,
      despues: text.length,
      resumen: describeCleaning(stats),
    });
  }

  const reindexados = [];
  const proyectos = [...new Set(cambiados.map((item) => item.proyecto))];
  for (const name of proyectos) {
    try {
      reindexados.push(...await indexarPendientes(name, onProgress));
    } catch (error) {
      if (onProgress) onProgress(`No se pudo reindexar "${name}": ${error.message}. Se indexará al generar la plantilla.`);
    }
  }
  return { revisados: documents.length, depurados: cambiados, reindexados: reindexados.length };
}

async function limpiarBase() {
  const antes = await storageSize();
  const eliminados = await cleanStorage();
  const despues = await storageSize();
  return {
    eliminados,
    espacio_antes_kb: Math.round(antes / 1024),
    espacio_despues_kb: Math.round(despues / 1024),
    conteos: await counts(),
  };
}

async function leerArchivo(file) {
  const target = String(file || '').trim();
  if (!target) throw httpError('Falta la ruta del archivo', 400);
  if (!fs.existsSync(target)) throw httpError(`No existe el archivo: ${target}`, 400);
  const { contenido } = await extractText(target, fs.readFileSync(target));
  return contenido;
}

async function extraerArchivo({ nombre, datos }) {
  if (!nombre || !datos) throw httpError('Falta el archivo', 400);
  return extractText(nombre, Buffer.from(String(datos), 'base64'));
}

async function eliminarDocumento(id) {
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || !(await documentQueries.findById(documentId))) {
    throw httpError('Documento no encontrado', 404);
  }
  await documentQueries.delete(documentId);
  return { eliminado: documentId };
}

async function listarDocumentos(proyecto) {
  const project = proyecto ? assertProject(proyecto) : '';
  const documents = (await documentQueries.list(project || undefined)).map((document) => ({
    id: document.id,
    titulo: document.title,
    tipo: document.type,
    proyecto: document.project,
    caracteres: document.content ? document.content.length : document.content_length,
    indexado: document.indexed,
    creado: document.created_at,
  }));
  return { documentos: documents };
}

async function indexarPendientes(project, onProgress, label = 'Indexando') {
  const pending = await documentQueries.pending(project);
  if (!pending.length) return [];
  await assertModels();
  const indexed = [];
  for (let index = 0; index < pending.length; index += 1) {
    const document = pending[index];
    if (onProgress) onProgress(`${label} ${index + 1}/${pending.length}: ${document.title}`);
    indexed.push(await indexDocument(document));
  }
  return indexed;
}

async function indexarConBase(project, onProgress) {
  await indexarPendientes(project, onProgress);
  if (project !== config.knowledgeProject) {
    await indexarPendientes(config.knowledgeProject, onProgress, 'Indexando base de conocimiento');
  }
}

function listFiles(folder) {
  const found = [];
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(target));
    else if (EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) found.push(target);
  }
  return found.sort();
}

async function cargarCarpeta({ carpeta, proyecto, tipo, indexar = true }, onProgress) {
  const folder = String(carpeta || '').trim();
  if (!folder) throw httpError('Falta --carpeta', 400);
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    throw httpError(`No existe la carpeta: ${folder}`, 400);
  }
  const project = assertProject(proyecto || config.knowledgeProject);
  const type = String(tipo || 'guia').trim();
  if (!DOCUMENT_TYPES.includes(type)) {
    throw httpError(`Tipo inválido. Usa: ${DOCUMENT_TYPES.join(', ')}`, 400);
  }
  const files = listFiles(folder);
  if (!files.length) throw httpError(`La carpeta no tiene archivos ${EXTENSIONS.join(', ')}`, 400);

  const known = new Set((await documentQueries.titles(project)).map((title) => title.toLowerCase()));
  const guardados = [];
  const omitidos = [];
  const errores = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relative = path.relative(folder, file);
    const title = path.basename(file, path.extname(file)).replace(/[_]+/g, ' ').trim();
    if (onProgress) onProgress(`Leyendo ${index + 1}/${files.length}: ${relative}`);
    if (known.has(title.toLowerCase())) {
      omitidos.push(relative);
      continue;
    }
    try {
      const { contenido, depuracion } = await extractText(file, fs.readFileSync(file));
      if (await documentQueries.findSameContent(project, contenido)) {
        omitidos.push(relative);
        continue;
      }
      const id = await documentQueries.create(title, contenido, type, project);
      known.add(title.toLowerCase());
      guardados.push({
        id,
        titulo: title,
        archivo: relative,
        caracteres: contenido.length,
        depuracion: depuracion.resumen,
      });
    } catch (error) {
      errores.push({ archivo: relative, error: error.message });
    }
  }

  const indexados = indexar ? await indexarPendientes(project, onProgress) : [];
  return {
    proyecto: project,
    tipo: type,
    guardados,
    omitidos_repetidos: omitidos,
    errores,
    indexados: indexados.length,
    estado: await embeddingQueries.projectStats(project),
  };
}

async function baseConocimiento() {
  return {
    proyecto: config.knowledgeProject,
    ...(await embeddingQueries.projectStats(config.knowledgeProject)),
  };
}

async function listarPlantillas(proyecto, id) {
  if (id) {
    const template = await templateQueries.findById(Number(id));
    if (!template) throw httpError('Plantilla no encontrada', 404);
    return { plantilla: template };
  }
  const project = proyecto ? assertProject(proyecto) : '';
  return { plantillas: await templateQueries.list(project || undefined) };
}

async function salud() {
  const body = {
    ok: false,
    flujo: FLUJO,
    modelo_chat: config.chatModel,
    modelo_embeddings: config.embedModel,
    perfil_rx_vram_gb: config.rxVram,
    num_ctx: config.numCtx,
    num_gpu: config.numGpu,
    base: describeDatabase(),
    base_ok: false,
  };
  try {
    body.conteos = await counts();
    body.base_conocimiento = await baseConocimiento();
    body.base_ok = true;
  } catch (error) {
    body.base_error = error.message;
  }
  try {
    const version = await ollamaVersion();
    const models = await installedModels();
    body.ollama = version;
    body.modelos_instalados = models;
    body.modelos_listos = [config.chatModel, config.embedModel].every((model) => (
      models.some((name) => name === model || (!model.includes(':') && name.startsWith(`${model}:`)))
    ));
    body.ok = body.base_ok;
  } catch (error) {
    body.ollama_error = error.message;
  }
  return body;
}

async function indexarProyecto(proyecto, onProgress) {
  return indexProject(assertProject(proyecto), onProgress);
}

function opcionesTablero({ inicio, equipo } = {}) {
  const fecha = String(inicio || '').trim();
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw httpError('La fecha de inicio debe tener el formato AAAA-MM-DD', 400);
  const nombres = {};
  for (const [rol, nombre] of Object.entries(equipo && typeof equipo === 'object' ? equipo : {})) {
    const value = String(nombre || '').trim().slice(0, 60);
    if (ROLES[rol] && value) nombres[rol] = value;
  }
  return { inicio: fecha, equipo: nombres };
}

async function crearPlantilla(proyecto, nombre, onProgress, opciones) {
  const project = assertProject(proyecto);
  const tablero = opcionesTablero(opciones);
  await indexarConBase(project, onProgress);
  return generarPlantilla(project, nombre, onProgress, tablero);
}

async function consultar(proyecto, pregunta) {
  const question = String(pregunta || '').trim();
  if (!question) throw httpError('Falta la pregunta', 400);
  const project = assertProject(proyecto);
  await indexarConBase(project);
  return preguntar(project, question);
}

module.exports = {
  initDatabase,
  agregarDocumento,
  extraerArchivo,
  eliminarDocumento,
  leerArchivo,
  listarDocumentos,
  listarPlantillas,
  cargarCarpeta,
  baseConocimiento,
  depurarDocumentos,
  limpiarBase,
  indexarPendientes: (proyecto, onProgress) => indexarPendientes(assertProject(proyecto), onProgress),
  indexProject: indexarProyecto,
  generarPlantilla: crearPlantilla,
  preguntar: consultar,
  salud,
  FLUJO,
};
