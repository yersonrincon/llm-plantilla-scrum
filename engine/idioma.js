const ES = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'en', 'un', 'una', 'para', 'con', 'por',
  'como', 'su', 'sus', 'al', 'se', 'lo', 'le', 'les', 'este', 'esta', 'estos', 'estas',
  'cuando', 'donde', 'tambien', 'hay', 'son', 'tiene', 'puede', 'debe', 'usuario',
  'sistema', 'caso', 'flujo', 'quiero',
]);

const EN = new Set([
  'the', 'and', 'of', 'to', 'in', 'is', 'for', 'with', 'that', 'as', 'on', 'be', 'this',
  'are', 'an', 'by', 'from', 'it', 'shall', 'want', 'when', 'where', 'user', 'system',
  'story', 'should', 'must', 'can', 'what', 'how', 'which', 'does',
]);

const FALTA = /no consta en los manuales|not stated in the source documents/i;

function palabras(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z]+/g) || [];
}

function contar(texto) {
  let es = 0;
  let en = 0;
  for (const word of palabras(texto)) {
    if (ES.has(word)) es += 1;
    if (EN.has(word)) en += 1;
  }
  return { es, en };
}

function detectarIdioma(texto) {
  const { es, en } = contar(texto);
  if (es + en < 2) return '';
  if (en > es * 1.25 && en >= 3) return 'en';
  if (es > en * 1.25 && es >= 3) return 'es';
  if (en > es) return 'en';
  if (es > en) return 'es';
  return 'mixto';
}

function idiomaDe(texto, fallback = 'es') {
  return detectarIdioma(texto) || fallback;
}

function idiomaDeDocumentos(documents) {
  const sample = (documents || []).map((document) => (
    `${document.title || ''}\n${String(document.content || '').slice(0, 1500)}`
  )).join('\n').slice(0, 8000);
  return idiomaDe(sample, 'es');
}

function textoFalta(idioma) {
  return idioma === 'en' ? 'Not stated in the source documents' : 'No consta en los manuales';
}

function esFalta(value) {
  return FALTA.test(String(value || '').trim());
}

function reglaPlantilla(idioma) {
  if (idioma === 'en') {
    return [
      'The use cases are in English.',
      'Write every template field in English.',
      'User stories use "As a ... I want ... so that ...".',
      'If a fact is not in the fragments, write exactly "Not stated in the source documents".',
    ].join(' ');
  }
  if (idioma === 'mixto') {
    return [
      'Hay fragmentos en español y en inglés. Trátalos igual.',
      'Redacta cada campo en el idioma del fragmento que lo sustenta y no mezcles idiomas dentro del mismo campo.',
      'Si un dato no está, escribe exactamente "No consta en los manuales".',
    ].join(' ');
  }
  return [
    'Los casos de uso están en español.',
    'Redacta todos los textos de la plantilla en español.',
    'Las historias usan "Como ... quiero ... para ...".',
    'Si un dato no está, escribe exactamente "No consta en los manuales".',
  ].join(' ');
}

function reglaRespuesta(idioma) {
  if (idioma === 'en') return 'Write the respuesta field in English.';
  if (idioma === 'mixto') return 'Responde el campo respuesta en el idioma de la pregunta, español o inglés.';
  return 'Responde el campo respuesta en español.';
}

function instruccionesEnIdioma(instructions, idioma) {
  if (idioma !== 'en') return instructions;
  return String(instructions)
    .replaceAll('No consta en los manuales', 'Not stated in the source documents')
    .replace('Como ... quiero ... para ...', 'As a ... I want ... so that ...');
}

module.exports = {
  detectarIdioma,
  idiomaDe,
  idiomaDeDocumentos,
  textoFalta,
  esFalta,
  reglaPlantilla,
  reglaRespuesta,
  instruccionesEnIdioma,
};
