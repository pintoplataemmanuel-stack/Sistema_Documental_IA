require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri:
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://localhost:27017/sistema_documental",
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret_no_usar_en_produccion",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  openai: {
    // API compatible con OpenAI (p. ej. OpenRouter, DeepSeek, OpenAI).
    apiKey: process.env.OPENAI_API_KEY || "",
    baseUrl: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
    model: process.env.OPENAI_MODEL || "deepseek/deepseek-chat",
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL || "openai/text-embedding-3-small",
  },
  ai: {
    chunkSize: Number(process.env.AI_CHUNK_SIZE) || 1500,
    chunkOverlap: Number(process.env.AI_CHUNK_OVERLAP) || 150,
    maxChunksToEmbed: Number(process.env.AI_MAX_CHUNKS) || 20,
    chatTextLimit: Number(process.env.AI_CHAT_TEXT_LIMIT) || 6000,
    // Umbral (ms) para considerar "colgado" un documento en processing.
    staleMs: Number(process.env.AI_PROCESS_STALE_MS) || 5 * 60 * 1000,
    // Nombre del índice de Atlas Vector Search sobre la colección documentchunks.
    vectorSearchIndexName:
      process.env.AI_VECTOR_SEARCH_INDEX || "vector_index",
  },
  limits: {
    maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  },
};
