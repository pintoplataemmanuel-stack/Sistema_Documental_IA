const Document = require("../models/Document");
const ProcessingLog = require("../models/ProcessingLog");
const DocumentChunk = require("../models/DocumentChunk");
const { extractText } = require("./textExtractionService");
const { chunkText } = require("./textChunkService");
const aiService = require("./aiService");
const { ai: aiConfig } = require("../config/env");

const STAGES = {
  extraction: "extraccion",
  classification: "clasificacion",
  summarization: "resumen",
  keyInfo: "extraccion_info",
  embeddings: "embeddings",
};

/**
 * Ejecuta el pipeline completo de procesamiento IA sobre un documento:
 * extracción → clasificación → resumen → campos clave → embeddings → guardado.
 *
 * Nunca lanza hacia el llamador: registra los errores en el documento
 * (status=error) y en el ProcessingLog.
 *
 * @param {string} documentId
 * @param {string} userId
 * @returns {Promise<object>} { status, document }
 */
async function processDocument(documentId, userId) {
  const document = await Document.findById(documentId);
  if (!document) {
    return { status: "error", error: "Documento no encontrado" };
  }

  const logId = await createLog(document, userId);

  try {
    // 1. Extracción de texto
    const rawText = await extractText(document.path, document.fileType);
    if (!rawText || !rawText.trim()) {
      throw new Error(
        "No se pudo extraer texto del archivo. Si es un PDF escaneado (imagen), no tiene capa de texto y no es soportado."
      );
    }
    document.textContent = rawText;
    await document.save();
    await updateLog(logId, STAGES.extraction, `Texto extraído (${rawText.length} caracteres)`);

    // 2. Clasificación
    const category = await aiService.classifyDocument(rawText);
    document.category = category;
    await document.save();
    await updateLog(logId, STAGES.classification, `Categoría: ${category}`);

    // 3. Resumen
    const summary = await aiService.summarizeDocument(rawText);
    document.summary = summary;
    await document.save();
    await updateLog(logId, STAGES.summarization, "Resumen generado");

    // 4. Extracción de campos clave
    const keyInfo = await aiService.extractKeyInfo(rawText, category);
    document.extractedInfo = keyInfo && typeof keyInfo === "object" ? keyInfo : {};
    await document.save();
    await updateLog(logId, STAGES.keyInfo, "Campos clave extraídos");

    // 5. Chunking + embeddings
    const chunks = chunkText(rawText).slice(0, aiConfig.maxChunksToEmbed);
    document.chunks = chunks.map((c) => c.text);

    const vectors = await aiService.generateEmbeddings(chunks.map((c) => c.text));
    await DocumentChunk.deleteMany({ document: document._id });
    if (chunks.length > 0) {
      await DocumentChunk.insertMany(
        chunks.map((chunk, i) => ({
          document: document._id,
          repository: document.repository,
          owner: document.owner,
          index: chunk.index,
          content: chunk.text,
          embedding: vectors[i],
          category,
        }))
      );
    }
    await updateLog(logId, STAGES.embeddings, `${chunks.length} fragmentos indexados`);

    // Cierre correcto
    document.status = "completed";
    document.processingError = undefined;
    document.processedAt = new Date();
    await document.save();

    await finalizeLog(logId, "completed", "Procesamiento completado");

    return { status: "completed", document };
  } catch (error) {
    console.error(`[processDocument ${documentId}] ERROR:`, error.message);

    document.status = "error";
    document.processingError = error.message;
    await document.save();

    await finalizeLog(logId, "error", error.message);

    return { status: "error", error: error.message };
  }
}

async function createLog(document, userId) {
  const log = await ProcessingLog.create({
    document: document._id,
    user: userId,
    status: "processing",
    stage: STAGES.extraction,
    startedAt: new Date(),
  });
  return log._id.toString();
}

async function updateLog(logId, stage, message) {
  return ProcessingLog.updateOne(
    { _id: logId },
    { $set: { stage, message, updatedAt: new Date() } }
  );
}

async function finalizeLog(logId, status, message) {
  return ProcessingLog.updateOne(
    { _id: logId },
    {
      $set: {
        status,
        message,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

module.exports = { processDocument, STAGES };