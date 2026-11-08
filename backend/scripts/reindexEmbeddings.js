const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Document = require("../src/models/Document");
const DocumentChunk = require("../src/models/DocumentChunk");
const { chunkText } = require("../src/services/textChunkService");
const aiService = require("../src/services/aiService");
const { ai } = require("../src/config/env");

/**
 * Regenera todos los embeddings de los documentos completados con el
 * proveedor configurado actualmente.
 *
 * Es obligatorio ejecutarlo cuando se cambia de proveedor de embeddings
 * (por ejemplo, de OpenRouter 1536 dimensiones a Gemini 768) porque el índice
 * de Atlas Vector Search debe coincidir con la dimensión de los vectores.
 *
 * Uso:
 *   cd backend
 *   npm run reindex
 */
async function main() {
  await connectDB();

  const info = aiService.getEmbeddingInfo();
  if (!info.configured) {
    throw new Error(
      "No hay proveedor de embeddings configurado. Define GEMINI_API_KEY, habilita OLLAMA o configura OPENAI_API_KEY."
    );
  }

  console.log(
    `Proveedor de embeddings: ${info.provider} / ${info.model} / ${info.dimensions} dimensiones`
  );

  const documents = await Document.find({
    status: "completed",
    textContent: { $ne: "" },
  }).select("_id owner repository textContent category");

  console.log(`Documentos a reindexar: ${documents.length}`);

  let totalChunks = 0;

  for (const document of documents) {
    const chunks = chunkText(document.textContent).slice(
      0,
      ai.maxChunksToEmbed
    );

    if (chunks.length === 0) {
      console.log(`  ${document._id}: sin fragmentos, se omite.`);
      continue;
    }

    const vectors = await aiService.generateEmbeddings(
      chunks.map((chunk) => chunk.text)
    );

    await DocumentChunk.deleteMany({ document: document._id });

    await DocumentChunk.insertMany(
      chunks.map((chunk, index) => ({
        document: document._id,
        repository: document.repository,
        owner: document.owner,
        index: chunk.index,
        content: chunk.text,
        embedding: vectors[index],
        category: document.category,
      }))
    );

    totalChunks += chunks.length;
    console.log(`  ${document._id}: ${chunks.length} fragmento(s) reindexado(s).`);
  }

  console.log(`Listo: ${totalChunks} fragmento(s) reindexado(s).`);
  console.log(
    `Recuerda que el índice de Atlas debe tener ${info.dimensions} dimensiones.`
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("ERROR:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
