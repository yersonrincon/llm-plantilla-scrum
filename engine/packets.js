const { config } = require('./config');

const MIN_PACKET_WORDS = 12;

function wordsOf(text) {
  return String(text || '').split(/\s+/).filter(Boolean);
}

function wordCount(text) {
  return wordsOf(text).length;
}

function isHeading(line) {
  const trimmed = String(line || '').trim();
  return /^#{1,6}\s+\S/.test(trimmed)
    || /^(capítulo|capitulo|sección|seccion|fase|sprint)\s+\d+/i.test(trimmed);
}

function splitSections(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let current = [];

  function flush() {
    const block = current.join('\n').trim();
    current = [];
    if (block) sections.push(block);
  }

  for (const line of lines) {
    if (isHeading(line) && current.length) flush();
    current.push(line);
  }
  flush();
  return sections.length ? sections : [String(text || '')];
}

function packWordGroups(groups, chunkSize, overlap) {
  if (chunkSize <= overlap) {
    throw new Error('RAG_CHUNK_SIZE debe ser mayor que RAG_CHUNK_OVERLAP');
  }
  const chunks = [];
  let current = [];
  let fresh = 0;

  function flush() {
    if (!fresh) return;
    chunks.push(current.join(' '));
    current = overlap ? current.slice(-overlap) : [];
    fresh = 0;
  }

  for (const words of groups) {
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

function chunkText(text, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
  const paragraphs = String(text || '')
    .split(/\n+/)
    .map((paragraph) => wordsOf(paragraph))
    .filter((words) => words.length);
  return packWordGroups(paragraphs, chunkSize, overlap);
}

function isUsefulPacket(packet) {
  const visible = packet.replace(/\s/g, '');
  const letters = (packet.match(/\p{L}/gu) || []).length;
  return wordCount(packet) >= 5 && letters / Math.max(visible.length, 1) >= 0.4;
}

function mergeTiny(packets, chunkSize) {
  const merged = [];
  for (const packet of packets) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(packet);
      continue;
    }
    const previousCount = wordCount(previous);
    const currentCount = wordCount(packet);
    const tiny = previousCount < MIN_PACKET_WORDS || currentCount < MIN_PACKET_WORDS;
    if (tiny && previousCount + currentCount <= chunkSize) {
      merged[merged.length - 1] = `${previous} ${packet}`;
    } else {
      merged.push(packet);
    }
  }
  return merged;
}

function packetsFromSection(section, chunkSize, overlap) {
  const paragraphs = String(section)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const packets = [];
  for (const paragraph of paragraphs.length ? paragraphs : [String(section).trim()]) {
    const words = wordsOf(paragraph);
    if (!words.length) continue;
    if (words.length <= chunkSize) packets.push(words.join(' '));
    else packets.push(...packWordGroups([words], chunkSize, overlap));
  }
  return mergeTiny(packets, chunkSize);
}

function splitPackets(text, chunkSize = config.chunkSize, overlap = config.chunkOverlap) {
  const packets = splitSections(text)
    .flatMap((section) => packetsFromSection(section, chunkSize, overlap));
  const useful = packets.filter(isUsefulPacket);
  if (useful.length) return useful;
  const fallback = String(text || '').replace(/\s+/g, ' ').trim();
  return fallback ? [fallback] : [];
}

module.exports = {
  chunkText,
  splitPackets,
  isUsefulPacket,
  wordCount,
};
