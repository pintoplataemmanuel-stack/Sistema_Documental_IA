const mongoose = require("mongoose");

// Cada documento procesado se fragmenta; cada fragmento vive aquí junto con su
// embedding. Sobre la colección "documentchunks" se crea el índice de
// MongoDB Atlas Vector Search para búsqueda semántica (RAG).
const documentChunkSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    category: {
      type: String,
      default: "Otro",
    },
  },
  { timestamps: true }
);

// Índices de apoyo: filtrar fragmentos por repositorio antes del vector search
documentChunkSchema.index({ repository: 1, document: 1 });
documentChunkSchema.index({ document: 1 });

module.exports = mongoose.model("DocumentChunk", documentChunkSchema);