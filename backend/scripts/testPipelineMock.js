/**
 * Prueba del pipeline completo (Día 4 validación de IA) SIN llamadas a la API de IA.
 * Mockea las funciones de aiService para simular clasificación/resumen/
 * extracción/embeddings, y ejecuta processDocument contra la BD real.
 *
 * Prerrequisito: backend/.env con MONGODB_URI real.
 * Uso: node scripts/testPipelineMock.js <DOC_ID>
 */
require("dotenv").config();

const mongoose = require("mongoose");
const { mongodbUri } = require("../src/config/env");

const aiService = require("../src/services/aiService");
const Document = require("../src/models/Document");
const ProcessingLog = require("../src/models/ProcessingLog");
const DocumentChunk = require("../src/models/DocumentChunk");
const { processDocument } = require("../src/services/processingService");

const DOC_ID = process.argv[2];
if (!DOC_ID) {
  console.error("Falta <DOC_ID>");
  process.exit(1);
}

// ---- Inyectamos mocks en las funciones de IA (sin red a la API) ----
// Deterministas, para poder validar el resultado.
let counter = 0;
function nextText(prefix) {
  counter += 1;
  return `${prefix}-${counter}-${Date.now()}`;
}

aiService.classifyDocument = async () => "Contrato";
aiService.summarizeDocument = async (text) =>
  `Resumen simulado (mock): contrato de ${String(text || "").slice(0, 40)}...`;
aiService.extractKeyInfo = async () => ({
  partes: "TechSoluciones S.A. / Grupo Logístico Andino S.A.",
  fecha_firma: "15/03/2026",
  vigencia: "12 meses",
  objeto: "Implementación de sistema de gestión documental con IA",
  valor: "USD 85,000.00",
});
aiService.generateEmbeddings = async (inputs) =>
  (Array.isArray(inputs) ? inputs : [inputs]).map((_, i) =>
    Array.from({ length: 8 }, (_, d) => (d + i) * 0.01)
  );

async function main() {
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 15000 });
  console.log("Conectado a Mongo.");

  // Limpia estado previo del documento de prueba
  const doc = await Document.findById(DOC_ID);
  if (!doc) {
    console.error("Documento no encontrado:", DOC_ID);
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log("Procesando documento:", doc.originalName, "(id", DOC_ID + ")");
  doc.status = "pending";
  doc.processingError = undefined;
  await doc.save();
  await ProcessingLog.deleteMany({ document: doc._id });
  await DocumentChunk.deleteMany({ document: doc._id });

  const result = await processDocument(DOC_ID, doc.owner);

  console.log("\n=== RESULTADO processDocument ===");
  console.log("status:", result.status);

  const fresh = await Document.findById(DOC_ID).lean().exec();
  if (fresh) {
    console.log("\n=== DOCUMENTO EN BD ===");
    console.log("status        :", fresh.status);
    console.log("category      :", fresh.category);
    console.log("summary       :", fresh.summary);
    console.log("extractedInfo :", JSON.stringify(fresh.extractedInfo, null, 2));
    console.log("textContent len:", (fresh.textContent || "").length);
    console.log("chunks len    :", (fresh.chunks || []).length);
    console.log("processedAt   :", fresh.processedAt);
    console.log("processingError:", fresh.processingError || "(ninguno)");
  }

  const logs = await ProcessingLog.find({ document: doc._id }).lean().exec();
  console.log("\n=== PROCESSING LOG ===");
  logs.forEach((l) =>
    console.log("  ", l.status, "|", l.stage, "|", l.message)
  );

  const chunks = await DocumentChunk.find({ document: doc._id }).lean().exec();
  console.log("\n=== DOCUMENT CHUNKS (" + chunks.length + ") ===");
  chunks.forEach((c, i) =>
    console.log(
      "  chunk[" + i + "] idx=" + c.index + " len=" + (c.content || "").length +
        " embDim=" + ((c.embedding || []).length) + " cat=" + c.category
    )
  );

  await mongoose.connection.close();
  const pass = result.status === "completed";
  console.log("\nRESULTADO:", pass ? "TODO OK (pipeline completo con mock)" : "FALLO");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error("ERROR FATAL:", e.message);
  process.exit(1);
});
