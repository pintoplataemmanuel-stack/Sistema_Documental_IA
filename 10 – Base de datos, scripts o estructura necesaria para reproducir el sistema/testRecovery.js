/**
 * Prueba del recovery: simula documentos colgados en "processing" y verifica
 * que runStartupRecovery los marca como error (stale) o los reintenta (reciente).
 *
 * Uso: node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/testRecovery.js"
 */
const path = require("path");
const B = path.resolve(__dirname, "..", "backend");
require(path.join(B, "node_modules", "dotenv")).config({ path: path.join(B, ".env") });
const mongoose = require(path.join(B, "node_modules", "mongoose"));
const { mongodbUri } = require(path.join(B, "src", "config", "env"));
const Document = require(path.join(B, "src", "models", "Document"));
const ProcessingLog = require(path.join(B, "src", "models", "ProcessingLog"));
const {
  recoverStaleProcessing,
} = require(path.join(B, "src", "services", "processingService"));

const staleMs = 5 * 60 * 1000;

async function main() {
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 15000 });
  console.log("Conectado a Mongo.");

  // Toma el documento de prueba ya cargado (o crea uno con estado processing)
  let doc = await Document.findOne({ originalName: /contrato|prueba/i }).sort({ createdAt: -1 }).exec();
  if (!doc) {
    console.error("No hay documento de prueba para el recovery.");
    await mongoose.connection.close();
    process.exit(1);
  }
  console.log("Documento de prueba:", doc._id.toString(), doc.originalName, "status:", doc.status);

  // ---- Escenario A: documento processing con log MUY viejo (stale) ----
  doc.status = "processing";
  doc.processingError = undefined;
  await doc.save();
  // Log activo con updatedAt hace >5 min
  const oldLog = await ProcessingLog.create({
    document: doc._id,
    user: doc.owner,
    status: "processing",
    stage: "extraccion",
    message: "Texto extraído",
    startedAt: new Date(Date.now() - staleMs - 60 * 1000),
  });
  await ProcessingLog.updateOne(
    { _id: oldLog._id },
    { $set: { updatedAt: new Date(Date.now() - staleMs - 60 * 1000) } }
  );

  console.log("\n--- Ejecutando recoverStaleProcessing (con log viejo) ---");
  let res = await recoverStaleProcessing();
  console.log("Resultado:", JSON.stringify(res));
  const docA = await Document.findById(doc._id).lean().exec();
  console.log("Después del recovery -> status:", docA.status, "| error:", docA.processingError);
  if (docA.status !== "error") {
    console.error("FAIL: el documento stale no fue marcado como error.");
    process.exit(1);
  }

  // ---- Escenario B: documento processing con log RECIENTE (reintenta) ----
  doc.status = "processing";
  doc.processingError = undefined;
  await doc.save();
  await ProcessingLog.create({
    document: doc._id,
    user: doc.owner,
    status: "processing",
    stage: "clasificacion",
    message: "Categoría: Contrato",
    startedAt: new Date(),
  });

  console.log("\n--- Ejecutando recoverStaleProcessing (con log reciente) ---");
  res = await recoverStaleProcessing();
  console.log("Resultado:", JSON.stringify(res));

  console.log("\n# Prueba de recovery completada.");
  await mongoose.connection.close();
}

main().catch((e) => {
  console.error("ERROR FATAL:", e.message);
  process.exit(1);
});
