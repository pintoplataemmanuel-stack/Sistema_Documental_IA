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
    user: userId || document.owner,
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

/**
 * Marca como active/finalizado un log de procesamiento.
 * Devuelve true si existe una entrada activa (processing) para ese documento.
 */
async function hasActiveLog(documentId) {
  const log = await ProcessingLog.findOne({
    document: documentId,
    status: "processing",
  })
    .sort({ updatedAt: -1 })
    .select("updatedAt")
    .lean()
    .exec();
  return log;
}

/**
 * Devuelve la edad (ms) del log de procesamiento activo más reciente del
 * documento, o null si no hay log activo.
 */
async function getActiveLogAgeMs(documentId) {
  const log = await hasActiveLog(documentId);
  if (!log) return null;
  return Date.now() - new Date(log.updatedAt).getTime();
}

/**
 * Recupera tras reinicio/caída los documentos que quedaron en status
 * "processing" sin terminar. Para cada uno:
 *  - Si su último log activo es antiguo (>= ai.staleMs): se marca "error"
 *    (tarea colgada / proceso murió a mitad), con un log de cierre.
 *  - Si es reciente (posible tarea que se estaba ejecutando cuando el
 *    servidor se reinició): se vuelve a disparar el pipeline (fire-and-forget).
 *
 * @returns {Promise<{markedError: number, retried: number}>}
 */
async function recoverStaleProcessing() {
  const staleMs = aiConfig.staleMs;
  const stuck = await Document.find({ status: "processing" })
    .select("_id owner")
    .lean()
    .exec();

  let markedError = 0;
  let retried = 0;

  for (const doc of stuck) {
    const age = await getActiveLogAgeMs(doc._id);
    // Sin log activo => el cierre no llegó a registrarse; asumimos caída.
    if (age === null || age >= staleMs) {
      await Document.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: "error",
            processingError:
              "Procesamiento interrumpido (el proceso se detuvo antes de terminar). Vuelve a intentarlo.",
          },
        }
      );
      await ProcessingLog.updateOne(
        { document: doc._id, status: "processing" },
        {
          $set: {
            status: "error",
            message: "Interrumpido por reinicio/expiración.",
            finishedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      markedError += 1;
    } else {
      // Reciente: reintentar una vez (la tarea quedó huérfana por el reinicio).
      retried += 1;
      processDocument(doc._id.toString(), doc.owner ? doc.owner.toString() : undefined).catch(
        (err) =>
          console.error(
            `[recover] reintento de ${doc._id} falló de forma inesperada:`,
            err.message
          )
      );
    }
  }

  return { markedError, retried };
}

/**
 * Punto de entrada para ejecutar la recuperación al arrancar el servidor.
 * Se invoca tras conectar a la BD.
 */
async function runStartupRecovery() {
  try {
    const result = await recoverStaleProcessing();
    if (result.markedError > 0 || result.retried > 0) {
      console.log(
        `[recovery] ${result.markedError} documento(s) colgado(s) marcados en error, ` +
          `${result.retried} reintentado(s) tras reinicio.`
      );
    }
    return result;
  } catch (error) {
    console.error("[recovery] Error ejecutando recuperación al arrancar:", error.message);
    return { markedError: 0, retried: 0, error: error.message };
  }
}

module.exports = {
  processDocument,
  STAGES,
  recoverStaleProcessing,
  runStartupRecovery,
};