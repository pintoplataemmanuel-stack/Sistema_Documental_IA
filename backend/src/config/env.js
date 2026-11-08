require("dotenv").config();

function splitList(value, fallback = []) {
  const list = String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

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
  // Compatibilidad con el proveedor anterior (OpenRouter / DeepSeek / OpenAI).
  openai: {
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

    // ---- Proveedores gratuitos ----
    // auto: usa el primero configurado en este orden:
    // Gemini -> Groq -> OpenRouter/OpenAI -> Ollama.
    provider: process.env.AI_PROVIDER || "auto",
    fallbackProviders: splitList(process.env.AI_FALLBACK_PROVIDERS, [
      "groq",
      "openrouter",
      "ollama",
    ]),
    chatTimeoutMs: Number(process.env.AI_CHAT_TIMEOUT_MS) || 60000,
    chatMaxRetries: Number(process.env.AI_CHAT_MAX_RETRIES) || 0,

    // Proveedor de embeddings. auto: Gemini -> Ollama -> OpenRouter.
    embeddingsProvider: process.env.EMBEDDINGS_PROVIDER || "auto",
    // Si se define, debe coincidir con la dimensión del índice de Atlas.
    embeddingDimensions: process.env.EMBEDDING_DIMENSIONS
      ? Number(process.env.EMBEDDING_DIMENSIONS)
      : null,

    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      baseUrl:
        process.env.GEMINI_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta/openai/",
      // Endpoint nativo (no OpenAI) usado para embeddings con dimensión fija.
      nativeBaseUrl:
        process.env.GEMINI_NATIVE_BASE_URL ||
        "https://generativelanguage.googleapis.com/v1beta",
      // Modelo estable y económico con nivel gratuito. Se puede fijar otro
      // (por ejemplo gemini-3.8-flash) con GEMINI_CHAT_MODEL.
      chatModel: process.env.GEMINI_CHAT_MODEL || "gemini-3.5-flash-lite",
      embeddingModel:
        process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
      embeddingDimensions:
        Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 768,
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY || "",
      baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      chatModel:
        process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile",
    },
    ollama: {
      enabled:
        String(process.env.OLLAMA_ENABLED || "").toLowerCase() === "true",
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      chatModel: process.env.OLLAMA_CHAT_MODEL || "llama3.2",
      embeddingModel:
        process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
      embeddingDimensions: 768,
    },
  },
  limits: {
    maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  },
};
