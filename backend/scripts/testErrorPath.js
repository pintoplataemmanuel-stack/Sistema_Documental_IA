require("dotenv").config();
const mongoose = require("mongoose");
const Document = require("../src/models/Document");
const aiService = require("../src/services/aiService");
const processingService = require("../src/services/processingService");
const { mongodbUri } = require("../src/config/env");

const DOC_ID = process.argv[2] || "6a979b8884b155839aa066d3";

(async () => {
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 10000 });

  const doc = await Document.findById(DOC_ID);
  if (!doc) throw new Error(`Documento no encontrado: ${DOC_ID}`);
  console.log("Documento inicial:", doc.status);

  // Simular un 401 de la API de IA (credenciales inválidas, por ejemplo).
  const realClassify = aiService.classifyDocument;
  aiService.classifyDocument = async () => {
    const err = new Error("401 Unauthorized: Invalid API key");
    err.status = 401;
    throw err;
  };

  try {
    // Reproducir el escenario del bug: el controlador lo deja en "processing"
    // y el pipeline falla → debe pasar a "error" y no quedarse atascado.
    doc.status = "processing";
    await doc.save();
    const result = await processingService.processDocument(
      DOC_ID,
      doc.owner ? doc.owner.toString() : undefined
    );
    const after = await Document.findById(DOC_ID);

    console.log("result.status:", result.status);
    console.log("doc.status en BD:", after.status);
    console.log("processingError:", after.processingError);

    const ok = after.status === "error" && !!after.processingError;
    console.log(ok ? "OK: documento marcado en error inmediatamente" : "FALLO: sin marcado de error");
    process.exit(ok ? 0 : 1);
  } finally {
    aiService.classifyDocument = realClassify;
    await mongoose.disconnect();
  }
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});