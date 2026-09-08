require("dotenv").config();
const mongoose = require("mongoose");
const DocumentChunk = require("../src/models/DocumentChunk");
const { mongodbUri } = require("../src/config/env");
const { ai } = require("../src/config/env");

const INDEX_JSON = {
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

(async () => {
  await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 10000 });

  let names = [];
  try {
    const cursor = DocumentChunk.collection.listSearchIndexes();
    names = (await cursor.toArray()).map((i) => i.name);
  } catch (e) {
    // Fallback por comando si la colección no tiene índice de búsqueda o driver viejo
    const res = await mongoose.connection.db.command({
      listSearchIndexes: DocumentChunk.collection.name,
    });
    names = (res.indexes || []).map((i) => i.name);
  }

  console.log("Índices Atlas Search en 'documentchunks':",
    names.length ? names.join(", ") : "(ninguno)");

  if (names.includes(ai.vectorSearchIndexName)) {
    console.log(`El índice '${ai.vectorSearchIndexName}' YA existe: búsqueda semántica lista.`);
  } else {
    console.log(`FALTA el índice '${ai.vectorSearchIndexName}'. Créalo en Atlas UI (` +
      "Atlas Search → Create Search Index → JSON Editor) con esta definición:");
    console.log(JSON.stringify(INDEX_JSON, null, 2));
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});