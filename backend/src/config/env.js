require("dotenv").config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/sistema_documental",
  jwt: {
    secret: process.env.JWT_SECRET || "dev_secret_no_usar_en_produccion",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  },
  limits: {
    maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  },
};
