const mongoose = require("mongoose");
const DocumentChunk = require("../models/DocumentChunk");
const aiService = require("./aiService");
const { ai: aiConfig } = require("../config/env");

const VECTOR_INDEX = aiConfig.vectorSearchIndexName;
const EMBEDDING_DIMENSIONS = 1536; // openai/text-embedding-3-small

const VECTOR_INDEX_JSON = {
  name: VECTOR_INDEX,
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: EMBEDDING_DIMENSIONS,
        similarity: "cosine",
      },
      { type: "filter", path: "owner" },
      { type: "filter", path: "repository" },
    ],
  },
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isIndexNotFound(err) {
  if (!err) return false;
  const code = err.code || (err.cause && err.cause.code);
  const msg = String(err.message || "").toLowerCase();
  return (
    code === 291 ||
    msg.includes("index not found") ||
    msg.includes("does not have a vector index") ||
    msg.includes("no vector search index") ||
    msg.includes("opens the search index") ||
    msg.includes("must be created")
  );
}

/**
 * Búsqueda semántica por similitud de embeddings sobre los fragmentos
 * (DocumentChunk) del usuario, usando el índice de Atlas Vector Search.
 *
 * @param {object} args
 * @param {string} args.query  Texto de la consulta.
 * @param {string} args.userId Propietario (filtro de acceso).
 * @param {string|null} [args.repositoryId] Repositorio opcional para acotar.
 * @param {number} [args.limit] Máximo de fragmentos a devolver.
 * @returns {Promise<Array>} Fragmentos con score y metadatos del documento.
 */
async function semanticSearch({ query, userId, repositoryId = null, limit = 6 }) {
  const queryText = String(query || "").trim();
  if (!queryText) {
    throw httpError(400, "El texto de búsqueda es obligatorio.");
  }
  const top = Math.min(Math.max(Number(limit) || 6, 1), 25);

  let vector;
  try {
    vector = await aiService.generateEmbeddings(queryText);
  } catch (error) {
    throw httpError(
      502,
      "No se pudo generar el embedding de la consulta: " + error.message
    );
  }

  const filter = { owner: new mongoose.Types.ObjectId(String(userId)) };
  if (repositoryId && mongoose.isValidObjectId(repositoryId)) {
    filter.repository = new mongoose.Types.ObjectId(String(repositoryId));
  }

  let hits;
  try {
    hits = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector: vector,
          numCandidates: top * 10,
          limit: top,
          filter,
        },
      },
      {
        $lookup: {
          from: "documents",
          localField: "document",
          foreignField: "_id",
          as: "doc",
        },
      },
      { $unwind: { path: "$doc", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          document: 1,
          repository: 1,
          content: 1,
          index: 1,
          category: 1,
          score: { $meta: "vectorSearchScore" },
          "doc.originalName": 1,
          "doc.filename": 1,
          "doc.category": 1,
          "doc.status": 1,
        },
      },
    ]);
  } catch (error) {
    if (isIndexNotFound(error)) {
      throw httpError(
        400,
        "El índice de Atlas Vector Search no está creado todavía. Créalo en la colección 'documentchunks' de Atlas con esta definición: " +
          JSON.stringify(VECTOR_INDEX_JSON)
      );
    }
    throw error;
  }

  return hits.map((c) => ({
    chunkId: c._id,
    documentId: c.document,
    repositoryId: c.repository,
    documentName:
      (c.doc && (c.doc.originalName || c.doc.filename)) || "Documento",
    category: c.category || (c.doc && c.doc.category) || "Otro",
    content: c.content,
    score: Math.round(c.score * 10000) / 10000,
  }));
}

/**
 * Chat RAG: recupera los fragmentos más relevantes y responde con el modelo
 * de chat usando únicamente ese contexto, citando las fuentes usadas.
 *
 * @returns {Promise<{answer: string, sources: Array}>}
 */
async function answerQuestion({ question, userId, repositoryId = null, k = 6 }) {
  const q = String(question || "").trim();
  if (!q) {
    throw httpError(400, "La pregunta es obligatoria.");
  }

  const results = await semanticSearch({
    query: q,
    userId,
    repositoryId,
    limit: k,
  });

  if (results.length === 0) {
    return {
      answer:
        "No encontré fragmentos relevantes para responder. Procesa documentos (estado 'completado') o reformula la pregunta.",
      sources: [],
    };
  }

  const context = results
    .map((r, i) => `[${i + 1}] ${r.documentName}\n${r.content}`)
    .join("\n\n---\n\n");

  let generated;
  try {
    generated = await aiService.askQuestion(q, context);
  } catch (error) {
    throw httpError(
      502,
      "El modelo de IA falló al responder: " + error.message
    );
  }

  const sources = [];
  for (const n of generated.fuentes) {
    const item = results[Number(n) - 1];
    if (item) sources.push(item);
  }

  return { answer: generated.respuesta, sources };
}

module.exports = { semanticSearch, answerQuestion, VECTOR_INDEX_JSON };