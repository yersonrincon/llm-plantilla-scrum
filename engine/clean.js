const LIGATURES = { 'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl', 'ﬅ': 'st', 'ﬆ': 'st' };
const TOC_HEADING = /^(\d+\.?\s*)?(índice( general)?|indice( general)?|contenido|tabla de contenidos?|table of contents|contents)\s*:?$/i;
const DOT_LEADER = /(?:\.\s?){4,}|…{2,}|_{4,}/;
const PAGE_NUMBER = /^(?:-\s*)?(?:p[áa]g(?:ina)?\.?|page)?\s*\d{1,4}(?:\s*(?:de|of|\/)\s*\d{1,4})?(?:\s*-)?$/i;
const LICENSE = /creativecommons\.org|creative commons|all rights reserved|todos los derechos reservados|©|\(c\)\s*\d{4}/i;
const EDGE_LINES = 3;

function normalizeChars(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .normalize('NFC')
    .replace(/[ﬀﬁﬂﬃﬄﬅﬆ]/g, (char) => LIGATURES[char])
    .replace(/\u00AD/g, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u2010\u2011]/g, '-')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/^[ \t]*[•●▪◦■□►▶➢✓✔·\uF0B7\uF0A7]\s*/gm, '- ')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ');
}

const SYMBOL_BULLET = /^[nlqüØ§]\s+(?=\p{Lu})/gmu;

function fixSymbolBullets(text) {
  const matches = text.match(SYMBOL_BULLET);
  return matches && matches.length >= 2 ? text.replace(SYMBOL_BULLET, '- ') : text;
}

function lineKey(line) {
  return line.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');
}

function hasLetters(line) {
  return /\p{L}/u.test(line);
}

function isTocEntry(line) {
  const text = line.trim();
  if (!text) return false;
  if (DOT_LEADER.test(text)) return true;
  if (text.length > 90 || /[.;:!?]$/.test(text)) return false;
  return /^\d+(\.\d+)*\.?\s+\S/.test(text) || /\S\s+\d{1,4}$/.test(text);
}

function repeatedEdgeLines(pages, stats) {
  const counts = new Map();
  for (const page of pages) {
    const lines = page.filter((line) => line.trim());
    const edges = new Set([...lines.slice(0, EDGE_LINES), ...lines.slice(-EDGE_LINES)]
      .filter((line) => line.trim().length <= 120 && hasLetters(line) && !isStructural(line))
      .map(lineKey));
    for (const key of edges) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const minimum = Math.max(3, Math.ceil(pages.length * 0.3));
  const repeated = new Set([...counts].filter(([, count]) => count >= minimum).map(([key]) => key));
  return pages.map((page) => page.filter((line) => {
    if (!repeated.has(lineKey(line))) return true;
    stats.encabezados += 1;
    return false;
  }));
}

function dropPageNumbers(page, stats) {
  const indexes = page.map((line, index) => (line.trim() ? index : -1)).filter((index) => index !== -1);
  const edges = new Set([...indexes.slice(0, EDGE_LINES), ...indexes.slice(-EDGE_LINES)]);
  return page.filter((line, index) => {
    if (!edges.has(index) || !PAGE_NUMBER.test(line.trim())) return true;
    stats.numeros_pagina += 1;
    return false;
  });
}

function dropToc(lines, stats) {
  const kept = [];
  let inToc = false;
  let entries = 0;
  for (const line of lines) {
    const text = line.trim();
    if (TOC_HEADING.test(text.replace(/^#+\s*/, ''))) {
      inToc = true;
      entries = 0;
      stats.indice += 1;
      continue;
    }
    if (inToc) {
      if (!text && !entries) continue;
      if (text && isTocEntry(text)) {
        entries += 1;
        stats.indice += 1;
        continue;
      }
      inToc = false;
    }
    const leaderEntry = DOT_LEADER.test(text)
      && (/\d$/.test(text) || /^(?:\.\s?){4,}/.test(text))
      && text.replace(DOT_LEADER, '').replace(/[\d.\s…_]/g, '').length < 90;
    if (leaderEntry) {
      stats.indice += 1;
      continue;
    }
    kept.push(line);
  }
  return kept;
}

function isStructural(line) {
  return /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|\||```|>)/.test(line);
}

function joinWrapped(lines) {
  const joined = [];
  for (const line of lines) {
    const text = line.trim();
    const previous = joined.length ? joined[joined.length - 1] : null;
    const canJoin = previous
      && text
      && previous.trim()
      && !isStructural(text)
      && !/^#{1,6}\s/.test(previous)
      && !/[.:;!?]$/.test(previous.trim())
      && /^[\p{Ll}(¿¡"«]/u.test(text);
    if (canJoin) {
      joined[joined.length - 1] = /\p{L}-$/u.test(previous)
        ? previous.slice(0, -1) + text
        : `${previous.trimEnd()} ${text}`;
    } else {
      joined.push(text ? line.trimEnd() : '');
    }
  }
  return joined;
}

function dropJunkParagraphs(lines, stats) {
  const seen = new Set();
  return lines.filter((line) => {
    const text = line.trim();
    if (!text || /^(```|\|)/.test(text)) return true;
    if (!/[\p{L}\p{N}]/u.test(text)) {
      stats.simbolos += 1;
      return false;
    }
    if (LICENSE.test(text) && text.length < 1200) {
      stats.licencia += 1;
      return false;
    }
    if (text.length >= 40) {
      const key = text.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) {
        stats.duplicados += 1;
        return false;
      }
      seen.add(key);
    }
    return true;
  });
}

function collapse(lines) {
  return lines
    .join('\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanText(input, { pages, joinLines = false } = {}) {
  const stats = {
    caracteres_antes: 0,
    caracteres_despues: 0,
    encabezados: 0,
    numeros_pagina: 0,
    indice: 0,
    licencia: 0,
    duplicados: 0,
    simbolos: 0,
  };
  const rawPages = Array.isArray(pages) && pages.length ? pages : String(input || '').split(/\n\s*\n/);
  stats.caracteres_antes = rawPages.reduce((total, page) => total + String(page).length, 0);

  let pageLines = rawPages.map((page) => fixSymbolBullets(normalizeChars(page)).split('\n'));
  if (pageLines.length >= 3) pageLines = repeatedEdgeLines(pageLines, stats);
  pageLines = pageLines.map((page) => dropPageNumbers(page, stats));

  let lines = pageLines.flatMap((page) => [...page, '']);
  lines = dropToc(lines, stats);
  if (joinLines) lines = joinWrapped(lines);
  lines = dropJunkParagraphs(lines, stats);

  const text = collapse(lines);
  stats.caracteres_despues = text.length;
  return { text, stats };
}

function describeCleaning(stats) {
  const parts = [];
  if (stats.encabezados) parts.push(`${stats.encabezados} encabezados/pies de página repetidos`);
  if (stats.numeros_pagina) parts.push(`${stats.numeros_pagina} números de página`);
  if (stats.indice) parts.push(`${stats.indice} líneas de índice`);
  if (stats.licencia) parts.push(`${stats.licencia} avisos de licencia`);
  if (stats.duplicados) parts.push(`${stats.duplicados} párrafos duplicados`);
  if (stats.simbolos) parts.push(`${stats.simbolos} líneas sin texto`);
  const saved = stats.caracteres_antes - stats.caracteres_despues;
  const percent = stats.caracteres_antes ? Math.round((saved / stats.caracteres_antes) * 100) : 0;
  return parts.length
    ? `Quité ${parts.join(', ')} (${percent} % menos texto).`
    : 'El texto ya estaba limpio.';
}

module.exports = { cleanText, describeCleaning };
