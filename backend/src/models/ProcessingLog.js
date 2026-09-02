const mongoose = require("mongoose");

const processingLogSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "error"],
      default: "pending",
    },
    stage: {
      type: String,
      // extraccion, clasificacion, resumen, extraccion_info, embeddings
      default: "",
    },
    message: {
      type: String,
      // resultado o detalle del error
      default: "",
    },
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProcessingLog", processingLogSchema);