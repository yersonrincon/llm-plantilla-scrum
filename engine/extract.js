const path = require('path');
const zlib = require('zlib');
const { cleanText, describeCleaning } = require('./clean');

const EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readZipEntry(buffer, wanted) {
  const minEnd = Math.max(0, buffer.length - 65557);
  let end = -1;
  for (let index = buffer.length - 22; index >= minEnd; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      end = index;
      break;
    }
  }
  if (end === -1) throw fail('El archivo .docx está dañado (no es un ZIP válido)');

  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  for (let count = 0; count < entries; count += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === wanted) {
      const localName = buffer.readUInt16LE(localOffset + 26);
      const localExtra = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localName + localExtra;
      const data = buffer.subarray(start, start + compressedSize);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data);
      throw fail(`El .docx usa una compresión no soportada (${method})`);
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&');
}

function docxText(buffer) {
  const xml = readZipEntry(buffer, 'word/document.xml');
  if (!xml) throw fail('El .docx no contiene word/document.xml');
  const body = xml.toString('utf8');
  const lines = [];
  for (const [paragraph] of body.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    let line = '';
    for (const token of paragraph.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br[^>]*\/>/g)) {
      if (token[1] !== undefined) line += decodeXml(token[1]);
      else if (token[0].startsWith('<w:tab')) line += '\t';
      else line += '\n';
    }
    const isList = paragraph.includes('<w:numPr>');
    const isHeading = /<w:pStyle w:val="(Heading|Ttulo|Titulo|Título)\d/i.test(paragraph);
    if (!line.trim()) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    if (isHeading) lines.push('', `## ${line.trim()}`);
    else lines.push(isList ? `- ${line.trim()}` : line);
  }
  return lines.join('\n');
}

async function pdfText(buffer) {
  const { extractText, getDocumentProxy } = await import('unpdf');
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch (error) {
    throw fail(`No se pudo abrir el PDF: ${error.message}`);
  }
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

async function extractText(fileName, buffer) {
  const extension = path.extname(String(fileName || '')).toLowerCase();
  if (!EXTENSIONS.includes(extension)) {
    throw fail(`Formato no soportado: "${extension || 'sin extensión'}". Usa ${EXTENSIONS.join(', ')}`);
  }
  let cleaned;
  if (extension === '.pdf') {
    cleaned = cleanText(null, { pages: await pdfText(buffer), joinLines: true });
  } else if (extension === '.docx') {
    cleaned = cleanText(docxText(buffer));
  } else {
    cleaned = cleanText(buffer.toString('utf8'));
  }

  const { text } = cleaned;
  if (text.replace(/\s/g, '').length < 20) {
    throw fail(
      extension === '.pdf'
        ? 'El PDF no tiene texto seleccionable (parece escaneado). Copia el texto y pégalo en el formulario.'
        : 'El archivo no tiene texto suficiente para analizar.'
    );
  }
  return {
    titulo: suggestTitle(text) || path.basename(fileName, extension).replace(/[_-]+/g, ' ').trim(),
    contenido: text,
    depuracion: { ...cleaned.stats, resumen: describeCleaning(cleaned.stats) },
  };
}

function suggestTitle(text) {
  const first = text.split('\n').find((line) => line.trim());
  const title = String(first || '').replace(/^#+\s*/, '').trim();
  return title.length >= 4 && title.length <= 100 ? title : '';
}

module.exports = { extractText, EXTENSIONS };
