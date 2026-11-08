const mongoose = require("mongoose");
const DocumentChunk = require("../models/DocumentChunk");
const Document = require("../models/Document");
const aiService = require("./aiService");
const { ai: aiConfig } = require("../config/env");

const VECTOR_INDEX = aiConfig.vectorSearchIndexName;

function getVectorIndexJson() {
  return {
    name: VECTOR_INDEX,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: "embedding",
          numDimensions: aiService.getEmbeddingDimensions(),
          similarity: "cosine",
        },
        { type: "filter", path: "owner" },
        { type: "filter", path: "repository" },
      ],
    },
  };
}

const VECTOR_INDEX_JSON = getVectorIndexJson();

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
    msg.includes("must be created") ||
    msg.includes("dimension")
  );
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Búsqueda semántica por similitud de embeddings sobre los fragmentos
 * (DocumentChunk) del usuario, usando el índice de Atlas Vector Search.
 */
async function vectorSearch({ query, userId, repositoryId = null, limit = 6 }) {
  const vector = await aiService.generateEmbeddings(query);

  const filter = { owner: new mongoose.Types.ObjectId(String(userId)) };
  if (repositoryId && mongoose.isValidObjectId(repositoryId)) {
    filter.repository = new mongoose.Types.ObjectId(String(repositoryId));
  }

  const hits = await DocumentChunk.aggregate([
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: "embedding",
        queryVector: vector,
        numCandidates: limit * 10,
        limit,
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

  return hits.map((c) => ({
    chunkId: c._id,
    documentId: c.document,
    repositoryId: c.repository,
    documentName:
      (c.doc && (c.doc.originalName || c.doc.filename)) || "Documento",
    category: c.category || (c.doc && c.doc.category) || "Otro",
    content: c.content,
    score: Math.round(c.score * 10000) / 10000,
    mode: "vector",
  }));
}

/**
 * Plan B: búsqueda por palabras clave usando el índice de texto de MongoDB.
 * Se usa cuando el proveedor de embeddings falla o el índice vectorial no está
 * disponible. Devuelve fragmentos equivalentes para que el chatbot pueda
 * responder con el mismo formato.
 */
async function keywordSearch({ query, userId, repositoryId = null, limit = 6 }) {
  const filter = {
    owner: userId,
    $text: { $search: query },
  };
  if (repositoryId && mongoose.isValidObjectId(repositoryId)) {
    filter.repository = repositoryId;
  }

  let documents;

  try {
    documents = await Document.find(filter, {
      score: { $meta: "textScore" },
    })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select(
        "originalName filename summary textContent category repository status"
      )
      .lean()
      .exec();
  } catch (error) {
    // Último recurso: búsqueda por expresión regular si el índice de texto
    // no está disponible en la base de datos.
    const regex = new RegExp(escapeRegex(query), "i");
    const fallbackFilter = {
      owner: userId,
      $or: [
        { originalName: regex },
        { summary: regex },
        { textContent: regex },
      ],
    };
    if (repositoryId && mongoose.isValidObjectId(repositoryId)) {
      fallbackFilter.repository = repositoryId;
    }
    documents = await Document.find(fallbackFilter)
      .limit(limit)
      .select(
        "originalName filename summary textContent category repository status"
      )
      .lean()
      .exec();
  }

  return documents.map((doc) => ({
    chunkId: null,
    documentId: doc._id,
    repositoryId: doc.repository,
    documentName: doc.originalName || doc.filename || "Documento",
    category: doc.category || "Otro",
    content: (doc.summary || doc.textContent || "").slice(0, 1500),
    score: null,
    mode: "keyword",
  }));
}

/**
 * Búsqueda híbrida: intenta vectores y, si falla o no hay resultados, usa
 * palabras clave. Así el sistema sigue respondiendo si se agota la cuota del
 * modelo gratuito o si el índice de Atlas todavía no está creado.
 */
async function semanticSearch({
  query,
  userId,
  repositoryId = null,
  limit = 6,
}) {
  const queryText = String(query || "").trim();
  if (!queryText) {
    throw httpError(400, "El texto de búsqueda es obligatorio.");
  }

  const top = Math.min(Math.max(Number(limit) || 6, 1), 25);
  let vectorError = null;

  try {
    const hits = await vectorSearch({
      query: queryText,
      userId,
      repositoryId,
      limit: top,
    });
    if (hits.length > 0) return hits;
  } catch (error) {
    vectorError = error;
    if (isIndexNotFound(error)) {
      console.warn(
        "[rag] Índice vectorial no disponible; se usa búsqueda por palabras clave. " +
          "Crea el índice con esta definición: " +
          JSON.stringify(getVectorIndexJson())
      );
    } else {
      console.warn(
        `[rag] Búsqueda vectorial falló (${error.message}). Se usa búsqueda por palabras clave.`
      );
    }
  }

  try {
    const fallback = await keywordSearch({
      query: queryText,
      userId,
      repositoryId,
      limit: top,
    });
    if (fallback.length > 0) return fallback;
  } catch (error) {
    throw httpError(
      502,
      "No se pudo buscar en los documentos: " +
        (vectorError ? `${vectorError.message}; ` : "") +
        error.message
    );
  }

  return [];
}

/**
 * Chat RAG: recupera los fragmentos más relevantes y responde con el modelo
 * de chat usando únicamente ese contexto, citando las fuentes usadas.
 *
 * @returns {Promise<{answer: string, sources: Array, mode: string}>}
 */
async function answerQuestion({
  question,
  userId,
  repositoryId = null,
  k = 6,
}) {
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
      mode: "none",
    };
  }

  const context = results
    .map((r, i) => `[${i + 1}] ${r.documentName}\n${r.content}`)
    .join("\n\n---\n\n");

  let generated;
  try {
    generated = await aiService.askQuestion(q, context, {
      userId,
      resource: "Search",
      metadata: {
        results: results.length,
        mode: results[0].mode || "vector",
      },
    });
  } catch (error) {
    throw httpError(
      502,
      "El modelo de IA falló al responder. Se intentó usar el proveedor gratuito y sus respaldos. " +
        error.message
    );
  }

  const sources = [];
  for (const n of generated.fuentes) {
    const item = results[Number(n) - 1];
    if (item) sources.push(item);
  }

  return {
    answer: generated.respuesta,
    sources,
    mode: results[0].mode || "vector",
  };
}

module.exports = {
  semanticSearch,
  answerQuestion,
  getVectorIndexJson,
  VECTOR_INDEX_JSON,
};
