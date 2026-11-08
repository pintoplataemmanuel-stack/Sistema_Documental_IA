const mongoose = require("mongoose");

/**
 * Registro de auditoría de acciones sensibles del sistema.
 *
 * Incluye acciones de IA, ejecuciones de automatización, procesamiento de
 * documentos y (en la Semana 3) carga y análisis de imágenes. Guardar quién
 * hizo qué, sobre qué recurso y con qué resultado es un requisito transversal
 * del tercer corte.
 */
const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      default: "",
      trim: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["success", "error", "denied"],
      default: "success",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
