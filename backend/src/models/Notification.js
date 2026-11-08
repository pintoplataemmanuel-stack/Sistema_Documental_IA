const mongoose = require("mongoose");

/**
 * Bandeja de notificaciones interna del usuario.
 *
 * Reemplaza el resultado que antes producía el flujo de n8n. Cada notificación
 * queda asociada al usuario y al recurso que la originó (documento, factura,
 * ejecución de automatización, etc.).
 */
const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    resource: {
      kind: {
        type: String,
        default: "",
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
