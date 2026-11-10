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
 * Gasto/factura confirmado. Se crea cuando la lectura tiene confianza
 * suficiente o cuando el usuario revisa y confirma los datos.
 */
const invoiceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    scan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisionScan",
      default: null,
    },
    proveedor: { type: String, trim: true, default: "" },
    nit: { type: String, trim: true, default: "" },
    fecha: { type: String, trim: true, default: "" },
    numero_factura: { type: String, trim: true, default: "" },
    items: { type: [itemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    impuestos: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    moneda: { type: String, trim: true, default: "COP" },
    origin: {
      type: String,
      enum: ["vision", "manual"],
      default: "vision",
    },
    status: {
      type: String,
      enum: ["confirmed", "voided"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
