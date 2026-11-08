const mongoose = require("mongoose");

/**
 * Registro de cada ejecución de un flujo de automatización.
 *
 * Guarda la entrada, la salida, el estado, los intentos y el detalle de cada
 * reintento. Es el equivalente a las ejecuciones de un workflow de n8n y sirve
 * como evidencia para la revisión y para la auditoría del sistema.
 */
const automationRunSchema = new mongoose.Schema(
  {
    flowKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    flowName: {
      type: String,
      default: "",
      trim: true,
    },
    event: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["running", "retrying", "completed", "failed", "skipped"],
      default: "running",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
      default: "",
    },
    logs: [
      {
        attempt: Number,
        level: {
          type: String,
          enum: ["info", "warn", "error"],
          default: "info",
        },
        message: String,
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: undefined,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Evita duplicar una ejecución completada con la misma clave de idempotencia.
automationRunSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
      status: "completed",
    },
  }
);

automationRunSchema.index({ createdAt: -1 });
automationRunSchema.index({ flowKey: 1, createdAt: -1 });

module.exports = mongoose.model("AutomationRun", automationRunSchema);
