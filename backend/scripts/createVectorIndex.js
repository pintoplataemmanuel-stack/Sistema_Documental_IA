require("dotenv").config();
const mongoose = require("mongoose");
const DocumentChunk = require("../src/models/DocumentChunk");
const { mongodbUri } = require("../src/config/env");
const { ai } = require("../src/config/env");

const INDEX = {
  name: ai.vectorSearchIndexName,
  type: "vectorSearch",
  definition: {
    fields: [
      { type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" },
      { type: "filter", path: "owner" },
      { type: "filter", path: "repository" },
    ],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 10000 });

  const kinds = await DocumentChunk.collection.listSearchIndexes().toArray();
  if (kinds.some((i) => i.name === INDEX.name)) {
    console.log(`El índice '${INDEX.name}' ya existe.`);
  } else {
    console.log(`Creando índice '${INDEX.name}' en '${DocumentChunk.collection.name}'...`);
    try {
      await DocumentChunk.collection.createSearchIndex(INDEX);
      console.log("Solicitud de creación enviada.");
    } catch (e) {
      console.log("No se pudo crear por driver:", String(e.message).slice(0, 300));
      console.log("Créalo manualmente en Atlas UI (Atlas Search → Create Search Index → JSON Editor).");
      await mongoose.disconnect();
      return;
    }
  }

  // Esperar estado READY (el índice tarda en construir)
  for (let i = 1; i <= 10; i++) {
    await sleep(5000);
    const all = await DocumentChunk.collection.listSearchIndexes().toArray();
    const idx = all.find((x) => x.name === INDEX.name);
    const status = idx ? idx.status : "(no aparece)";
    if (idx && idx.queryable) {
      console.log(`Índice listo (queryable=true, status=${status}).`);
      await mongoose.disconnect();
      return;
    }
    console.log(`Esperando build... (${i * 5}s, status=${status})`);
  }
  console.log("Tiempo de build agotado; revisa Atlas UI para el estado del índice.");
  await mongoose.disconnect();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});