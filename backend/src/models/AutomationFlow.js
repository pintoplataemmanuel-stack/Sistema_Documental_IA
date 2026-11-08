const mongoose = require("mongoose");

/**
 * Definición de un flujo de automatización.
 *
 * Los flujos se programan en código (backend/src/automation/flows) y se
 * sincronizan en esta colección al arrancar el servidor. La colección permite
 * consultar el inventario, habilitar/deshabilitar flujos y auditar su
 * configuración sin perder la definición ejecutable del código.
 */
const automationFlowSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
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
    enabled: {
      type: Boolean,
      default: true,
    },
    steps: {
      type: [String],
      default: [],
    },
    maxRetries: {
      type: Number,
      default: 2,
      min: 0,
    },
    retryDelayMs: {
      type: Number,
      default: 500,
      min: 0,
    },
    timeoutMs: {
      type: Number,
      default: 15000,
      min: 1000,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AutomationFlow", automationFlowSchema);
