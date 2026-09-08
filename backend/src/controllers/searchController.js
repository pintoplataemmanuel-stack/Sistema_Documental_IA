const { semanticSearch, answerQuestion } = require("../services/ragService");

/**
 * POST /api/search/search
 * Búsqueda semántica sobre los documentos del usuario.
 * Body: { query: string, repositoryId?: string, limit?: number }
 */
async function search(req, res, next) {
  try {
    const { query, repositoryId, limit } = req.body || {};
    const results = await semanticSearch({
      query,
      userId: req.user._id,
      repositoryId: repositoryId || null,
      limit,
    });
    return res.json({ results });
  } catch (error) {
    res.status(error.status || 500);
    next(error);
  }
}

/**
 * POST /api/search/chat
 * Chat RAG: responde usando solo el contexto de los documentos del usuario.
 * Body: { question: string, repositoryId?: string }
 */
async function chat(req, res, next) {
  try {
    const { question, repositoryId } = req.body || {};
    const data = await answerQuestion({
      question,
      userId: req.user._id,
      repositoryId: repositoryId || null,
    });
    return res.json(data);
  } catch (error) {
    res.status(error.status || 500);
    next(error);
  }
}

module.exports = { search, chat };