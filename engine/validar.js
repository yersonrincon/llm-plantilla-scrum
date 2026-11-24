const { assertModels, chatJson } = require('./ollama');

const SENALES = /actor|flujo|caso de uso|requisito|precondici|postcondici|criterio|el sistema|pantalla|historia de usuario|escenario|funcional|use case|user stor|precondition|postcondition|acceptance criteria|the system|main flow|alternate flow|requirement|as an?\b|i want|so that/i;

function fallo(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function compactar(texto) {
  return String(texto || '').replace(/\s+/g, ' ').trim();
}

function muestra(contenido) {
  const text = compactar(contenido);
  if (text.length <= 2800) return text;
  const medio = Math.max(0, Math.floor(text.length / 2) - 400);
  return [
    text.slice(0, 1400),
    text.slice(medio, medio + 800),
    text.slice(-600),
  ].join('\n...\n');
}

function esVerdadero(value) {
  return value === true || /^(true|si|sí|yes|1)$/i.test(String(value || '').trim());
}

function motivoDe(data) {
  const motivo = compactar(data.motivo);
  if (motivo.length >= 12 && motivo.length <= 320) return motivo;
  const clase = compactar(data.clase);
  const explicacion = clase.split(/motivo\s*:/i).pop();
  if (explicacion && explicacion !== clase && explicacion.length >= 12) return explicacion.slice(0, 280);
  return '';
}

function marcaFuente(data) {
  if (esVerdadero(data.es_fuente_de_requisitos)) return true;
  for (const [key, value] of Object.entries(data)) {
    const normal = String(key).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if ((normal.includes('fuente') || normal.includes('fuerte')) && esVerdadero(value)) return true;
  }
  return false;
}

function decidir(analisis, contenido) {
  const data = analisis && typeof analisis === 'object' ? analisis : {};
  const claseRaw = compactar(data.clase);
  const clase = claseRaw.length > 40 ? 'otro' : (claseRaw || 'otro');
  const tieneSenal = SENALES.test(compactar(contenido));
  const aceptado = marcaFuente(data) && tieneSenal;
  const motivo = motivoDe(data) || (aceptado
    ? 'Describe requisitos de un software.'
    : tieneSenal
      ? 'Ollama no lo reconoció como caso de uso ni como manual de requisitos.'
      : 'No describe actores, flujos ni requisitos de un software.');
  return { aceptado, clase, motivo };
}

async function clasificarFuente(titulo, contenido) {
  await assertModels();
  const analisis = await chatJson([
    {
      role: 'system',
      content: 'Eres un clasificador. Responde únicamente un objeto JSON.',
    },
    {
      role: 'user',
      content: [
        `Título: ${titulo || 'sin título'}`,
        '',
        'Texto:',
        muestra(contenido),
        '',
        'El texto puede estar en español o en inglés. Los dos idiomas cuentan igual.',
        'es_fuente_de_requisitos es true si describe actores, flujos, precondiciones, pantallas o requisitos de un software, también si es un use case, una user story o un requirements document en inglés.',
        'Es false si es un horario, una lista de clases, un pensum, calificaciones, un schedule o una tabla que no explique el comportamiento de un software.',
        'Un nombre de materia no es un requisito.',
        'Las claves del JSON no cambian aunque el texto esté en inglés.',
        'motivo es una frase corta. clase es una etiqueta breve: caso_de_uso, manual_de_requisitos, horario, lista u otro.',
        'Devuelve JSON: {"es_fuente_de_requisitos": false, "clase": "", "motivo": ""}',
      ].join('\n'),
    },
  ]);
  return decidir(analisis, contenido);
}

function mensajeBloqueo(rechazados) {
  const detalle = rechazados
    .map((item) => `${item.titulo}: ${item.motivo}`)
    .join(' ');
  return [
    'No generé la plantilla porque ningún documento es un caso de uso ni un manual de requisitos de software.',
    detalle,
    'Adjunta un documento con actores, flujos, precondiciones o criterios de aceptación.',
  ].filter(Boolean).join(' ');
}

async function filtrarFuentes(documents, onProgress) {
  const sources = documents.filter((document) => document.type === 'caso_uso' || document.type === 'manual');
  const aceptados = [];
  const rechazados = [];
  for (let index = 0; index < sources.length; index += 1) {
    const document = sources[index];
    if (onProgress) onProgress(`Validando ${index + 1}/${sources.length}: ${document.title}`);
    let resultado;
    try {
      resultado = await clasificarFuente(document.title, document.content);
    } catch (error) {
      throw fallo(`No pude validar «${document.title}» con Ollama. ${error.message}`, error.status || 502);
    }
    if (resultado.aceptado) aceptados.push({ id: document.id, titulo: document.title, clase: resultado.clase });
    else rechazados.push({ id: document.id, titulo: document.title, motivo: resultado.motivo, clase: resultado.clase });
  }
  return {
    aceptados,
    rechazados,
    excluir: rechazados.map((item) => item.id),
    mensaje: mensajeBloqueo(rechazados),
  };
}

module.exports = {
  clasificarFuente,
  filtrarFuentes,
  decidir,
};
