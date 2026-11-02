const { config } = require('./config');
const { documentQueries, embeddingQueries, templateQueries } = require('./db');
const { assertModels, chatJson } = require('./ollama');
const { retrieve, formatContext } = require('./rag');

const SYSTEM = [
  'Eres Hermes, analista de proyectos de software y de Scrum.',
  'Solo puedes usar los fragmentos recuperados de la base local y el JSON de las fases anteriores.',
  'No inventes pantallas, actores, integraciones ni reglas que no estén escritas ahí.',
  'Si un dato no está, escribe exactamente "No consta en los manuales".',
  'Cada requisito debe citar fuente_documento con un título exacto del catálogo.',
  'Responde únicamente un objeto JSON, sin markdown.',
].join(' ');

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
const FASES = new Set(['inicio', 'sprint_0', 'construccion', 'integracion', 'release']);

function nearestFibonacci(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 3;
  return FIBONACCI.reduce((best, current) => (
    Math.abs(current - number) < Math.abs(best - number) ? current : best
  ), 3);
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function catalog(documents) {
  return documents.map((document) => `- ${document.title} (${document.type})`).join('\n');
}

function titlesOf(documents) {
  return documents.map((document) => document.title);
}

function sourceMatches(source, titles) {
  const value = String(source || '').trim().toLowerCase();
  if (!value || value === 'no consta en los manuales') return false;
  return titles.some((title) => {
    const known = title.toLowerCase();
    return value === known || value.includes(known) || known.includes(value);
  });
}

function normalizeBacklog(analysis, titles) {
  const data = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : {};
  const items = Array.isArray(data.product_backlog) ? data.product_backlog : [];
  data.product_backlog = items.map((raw, index) => {
    const item = raw && typeof raw === 'object' ? raw : {};
    const fase = FASES.has(item.fase_proyecto) ? item.fase_proyecto : 'construccion';
    const fuente = item.fuente_documento || '';
    const grounded = sourceMatches(fuente, titles);
    return {
      id: item.id || `US-${String(index + 1).padStart(3, '0')}`,
      titulo: item.titulo || 'No consta en los manuales',
      historia: item.historia || 'No consta en los manuales',
      criterios_aceptacion: asList(item.criterios_aceptacion),
      prioridad: item.prioridad || 'Media',
      story_points: nearestFibonacci(item.story_points),
      fase_proyecto: fase,
      fuente_documento: grounded ? fuente : 'No consta en los manuales',
      advertencia: grounded ? undefined : 'La fuente no coincide con un documento de la base',
    };
  });
  return data;
}

function requireDocuments(project) {
  const documents = documentQueries.list(project);
  const sources = documents.filter((document) => document.type === 'caso_uso' || document.type === 'manual');
  if (!sources.length) {
    const error = new Error(
      `No hay casos de uso ni manuales de "${project}" en la base. Cárgalos antes de generar la plantilla.`
    );
    error.status = 400;
    throw error;
  }
  const missing = documents.filter((document) => embeddingQueries.countByDocument(document.id) === 0);
  if (missing.length) {
    const error = new Error(
      `Estos documentos todavía no tienen RAG: ${missing.map((document) => document.title).join(', ')}. ` +
        `Ejecuta: node engine/cli.js indexar --proyecto "${project}"`
    );
    error.status = 400;
    throw error;
  }
  return documents;
}

async function runPhase(project, documents, phase, previous) {
  const { picked, omitted } = await retrieve(project, phase.query, phase.types);
  const omittedText = omitted.length
    ? omitted.join(', ')
    : 'ninguno';
  const previousText = previous
    ? JSON.stringify(previous).slice(0, 5000)
    : 'No hay fase anterior.';

  const analysis = await chatJson([
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `Proyecto: ${project}`,
        `Fase del análisis: ${phase.title}`,
        '',
        'Catálogo real de la base local:',
        catalog(documents),
        '',
        'Documentos sin fragmento en este contexto (no afirmes su contenido):',
        omittedText,
        '',
        'Fragmentos recuperados de la base:',
        formatContext(picked),
        '',
        'Resultado de fases anteriores:',
        previousText,
        '',
        phase.instructions,
      ].join('\n'),
    },
  ]);

  return {
    fase: phase.id,
    titulo: phase.title,
    contexto: picked.map((row) => ({
      documento: row.title,
      tipo: row.type,
      fragmento: row.chunk_index,
      similitud: Number(row.similarity.toFixed(4)),
    })),
    omitidos: omitted,
    analisis: analysis,
  };
}

const PHASES = [
  {
    id: 'inicio',
    title: 'Inicio: alcance y actores',
    types: ['caso_uso', 'manual'],
    query: 'actores objetivos alcance precondiciones flujos del caso de uso',
    instructions: `Extrae solo lo que los casos de uso y manuales dicen del producto.
Devuelve JSON:
{
  "vision": "",
  "actores": [{"nombre": "", "descripcion": "", "fuente_documento": ""}],
  "objetivos": [{"texto": "", "fuente_documento": ""}],
  "dentro_de_alcance": [{"texto": "", "fuente_documento": ""}],
  "fuera_de_alcance": [{"texto": "", "fuente_documento": ""}]
}`,
  },
  {
    id: 'backlog',
    title: 'Product backlog',
    types: ['caso_uso', 'manual'],
    query: 'criterios de aceptación flujos alternos prioridad dependencias requisitos',
    instructions: `Convierte los casos de uso en historias. Una historia por flujo principal y otra por cada flujo alterno importante que esté escrito.
No crees historias de infraestructura que el texto no pida.
fase_proyecto solo puede ser: inicio, sprint_0, construccion, integracion, release.
story_points solo Fibonacci: 1, 2, 3, 5, 8, 13 o 21.
Devuelve JSON:
{
  "product_backlog": [
    {
      "id": "US-001",
      "titulo": "",
      "historia": "Como ... quiero ... para ...",
      "criterios_aceptacion": [""],
      "prioridad": "Alta|Media|Baja",
      "story_points": 3,
      "fase_proyecto": "construccion",
      "fuente_documento": ""
    }
  ]
}`,
  },
  {
    id: 'plan',
    title: 'Plan de fases y sprints',
    types: ['caso_uso', 'manual', 'guia'],
    query: 'dependencias prioridad sprint duración planificación incremento',
    instructions: `Organiza el trabajo de desarrollo en este orden fijo de fases: inicio, sprint_0, construccion, integracion, release.
Usa únicamente ids de historias que ya existen en el product backlog anterior.
Si un fragmento indica la duración del sprint, copia ese número y pon origen_duracion con el título del documento.
Si ningún fragmento la indica, usa duracion_dias 10 y origen_duracion "practica_scrum".
No dejes historias del backlog fuera del plan.
Devuelve JSON:
{
  "plan": [
    {
      "fase": "construccion",
      "objetivo": "",
      "sprints": [
        {
          "sprint_numero": 1,
          "objetivo": "",
          "historias": ["US-001"],
          "duracion_dias": 10,
          "origen_duracion": ""
        }
      ]
    }
  ]
}`,
  },
  {
    id: 'calidad',
    title: 'Calidad, dependencias y ceremonias',
    types: ['caso_uso', 'manual', 'guia'],
    query: 'definition of done criterios pruebas dependencias daily review retrospectiva',
    instructions: `La definition of done funcional debe salir de los criterios escritos en los casos de uso y en la guía de calidad.
Las ceremonias solo se detallan si una guía del proyecto las describe. Si no están en los fragmentos, rellena el texto con "No consta en los manuales".
Las dependencias solo se aceptan si un caso de uso dice que un flujo requiere otro.
Devuelve JSON:
{
  "definition_of_done": [{"texto": "", "fuente_documento": ""}],
  "definition_of_ready": [{"texto": "", "fuente_documento": ""}],
  "dependencias": [{"origen": "US-001", "destino": "US-002", "motivo": "", "fuente_documento": ""}],
  "riesgos": [{"texto": "", "fuente_documento": ""}],
  "ceremonias": {
    "sprint_planning": "",
    "daily": "",
    "review": "",
    "retrospectiva": ""
  },
  "roles": {
    "product_owner": "",
    "scrum_master": "",
    "equipo": ""
  }
}`,
  },
];

async function generarPlantilla(project, name, onProgress) {
  const documents = requireDocuments(project);
  await assertModels();
  const requirementTitles = titlesOf(
    documents.filter((document) => document.type === 'caso_uso' || document.type === 'manual')
  );

  const fases = {};
  let previous = null;
  for (const phase of PHASES) {
    if (onProgress) onProgress(phase.title);
    const result = await runPhase(project, documents, phase, previous);
    if (phase.id === 'backlog') {
      result.analisis = normalizeBacklog(result.analisis, requirementTitles);
      if (!result.analisis.product_backlog.length) {
        const error = new Error('Hermes no produjo historias a partir de los documentos indexados.');
        error.status = 502;
        throw error;
      }
    }
    fases[phase.id] = result;
    previous = {
      fase: phase.id,
      analisis: result.analisis,
    };
  }

  const vision = (fases.inicio.analisis && fases.inicio.analisis.vision) || '';
  const payload = {
    proyecto: project,
    modelo: config.chatModel,
    embeddings: config.embedModel,
    perfil_rx_vram_gb: config.rxVram,
    generado_en: new Date().toISOString(),
    documentos_base: documents.map((document) => ({
      id: document.id,
      titulo: document.title,
      tipo: document.type,
    })),
    pasos_del_proyecto: (((fases.plan.analisis && fases.plan.analisis.plan) || [])).map((step) => ({
      fase: step && step.fase,
      objetivo: step && step.objetivo,
      sprints: (step && step.sprints) || [],
    })),
    fases,
  };

  const templateName = name && String(name).trim()
    ? String(name).trim()
    : `Scrum ${project}`;
  const id = templateQueries.create(
    templateName,
    String(vision).slice(0, 180),
    project,
    JSON.stringify(payload)
  );

  return { id, nombre: templateName, plantilla: payload };
}

async function preguntar(project, question) {
  requireDocuments(project);
  await assertModels();
  const documents = documentQueries.list(project);
  const { picked, omitted } = await retrieve(
    project,
    question,
    ['caso_uso', 'manual', 'guia', 'otro']
  );
  const answer = await chatJson([
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `Proyecto: ${project}`,
        `Pregunta: ${question}`,
        '',
        'Catálogo:',
        catalog(documents),
        '',
        'Omitidos en este contexto:',
        omitted.join(', ') || 'ninguno',
        '',
        'Fragmentos:',
        formatContext(picked),
        '',
        'Devuelve JSON: {"respuesta": "", "fuentes": [""]}',
        'La respuesta debe apoyarse en los fragmentos. fuentes debe listar títulos del catálogo.',
      ].join('\n'),
    },
  ]);
  return {
    proyecto: project,
    pregunta: question,
    respuesta: answer,
    contexto: picked.map((row) => ({
      documento: row.title,
      similitud: Number(row.similarity.toFixed(4)),
    })),
  };
}

module.exports = {
  generarPlantilla,
  preguntar,
  PHASES,
};
