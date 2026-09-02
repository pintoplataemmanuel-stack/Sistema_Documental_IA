const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      // pdf, docx, txt
      required: true,
      lowercase: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
    },
    path: {
      type: String,
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
    // ---- Datos generados por IA ----
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "error"],
      default: "pending",
    },
    category: {
      type: String,
      enum: ["Contrato", "Factura", "Reporte", "Otro"],
      default: "Otro",
    },
    summary: {
      type: String,
      trim: true,
    },
    extractedInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    textContent: {
      type: String,
      // Texto plano extraído, requerido para embeddings y RAG
      default: "",
    },
    chunks: [
      {
        type: String,
      },
    ],
    embedding: {
      type: [Number],
      default: undefined,
    },
    processingError: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Índice de texto para búsqueda por palabra clave
documentSchema.index({ filename: "text", summary: "text", textContent: "text" });
// Índice para filtrar por repositorio
documentSchema.index({ repository: 1, createdAt: -1 });

module.exports = mongoose.model("Document", documentSchema);
