const { ai } = require("../config/env");

/**
 * Divide un texto largo en fragmentos con solape, respetando límites de
 * oraciones/párrafos cuando es posible. Produce chunk_size ~= ai.chunkSize.
 * @param {string} text
 * @param {object} [options] { chunkSize, overlap }
 * @returns {{index: number, text: string}[]}
 */
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || ai.chunkSize;
  const overlap = options.overlap || ai.chunkOverlap;

  if (!text || !text.trim()) return [];

  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= chunkSize) {
    return normalized.length > 10
      ? [{ index: 0, text: normalized }]
      : [];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    // Buscar un límite natural antes del corte (último ". " o "\n")
    if (end < normalized.length) {
      const lastSentence = normalized.lastIndexOf(". ", end);
      const lastParagraph = normalized.lastIndexOf("\n", end);
      // No cortar demasiado lejos del máximo (mínimo 40% del tamaño del chunk)
      const minCut = start + Math.floor(chunkSize * 0.4);
      const bestCut = Math.max(lastSentence, lastParagraph);
      if (bestCut > minCut) end = bestCut + 1;
    }

    const piece = normalized.slice(start, end).trim();
    if (piece.length > 10) {
      chunks.push({ index: chunks.length, text: piece });
    }

    if (end >= normalized.length) break;

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

module.exports = { chunkText };