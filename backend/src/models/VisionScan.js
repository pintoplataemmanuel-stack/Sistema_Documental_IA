const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    descripcion: { type: String, trim: true, default: "" },
    cantidad: { type: Number, default: 1 },
    valor_unitario: { type: Number, default: 0 },
  },
  { _id: false }
);

/**
 * Intento de lectura de una factura o recibo. Guarda tanto la respuesta
 * estructurada del modelo como el estado de revisión humana.
 */
const visionScanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalName: { type: String, required: true, trim: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true, lowercase: true },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    path: { type: String, required: true },

    source: {
      type: String,
      enum: ["image", "pdf"],
      default: "image",
    },
    status: {
      type: String,
      enum: ["processing", "review", "saved", "error"],
      default: "processing",
      index: true,
    },

    provider: { type: String },
    model: { type: String },
    mode: { type: String, enum: ["vision", "text"], default: "vision" },

    data: {
      proveedor: { type: String, trim: true, default: "" },
      nit: { type: String, trim: true, default: "" },
      fecha: { type: String, trim: true, default: "" },
      numero_factura: { type: String, trim: true, default: "" },
      items: { type: [itemSchema], default: [] },
      subtotal: { type: Number, default: 0 },
      impuestos: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      moneda: { type: String, trim: true, default: "COP" },
    },

    confianza: { type: Number, min: 0, max: 1, default: 0 },
    camposBajaConfianza: { type: [String], default: [] },
    requiresReview: { type: Boolean, default: true },
    error: { type: String },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    processedAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

visionScanSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("VisionScan", visionScanSchema);
