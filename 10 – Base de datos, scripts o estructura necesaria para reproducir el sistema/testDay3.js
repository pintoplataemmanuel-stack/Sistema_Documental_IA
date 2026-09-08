/**
 * Prueba local del Día 3 (sin red, sin BD):
 * - extractText sobre TXT y PDF (pdfjs-dist)
 * - chunkText con texto largo
 * Uso: node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/testDay3.js"
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const B = path.resolve(__dirname, "..", "backend");
require(path.join(B, "node_modules", "dotenv")).config({ path: path.join(B, ".env") });

const { extractText } = require(path.join(B, "src", "services", "textExtractionService"));
const { chunkText } = require(path.join(B, "src", "services", "textChunkService"));
const { ai } = require(path.join(B, "src", "config", "env"));

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "svg-dia3-"));

  // 1) TXT
  const txt =
    "contrato de arrendamiento\n\n" +
    "Este es un documento de prueba ".repeat(120) +
    "Fin del archivo.";
  const txtPath = path.join(tmp, "muestra.txt");
  fs.writeFileSync(txtPath, txt, "utf8");
  const txtText = await extractText(txtPath, "txt");
  const txtOk = txtText.includes("contrato de arrendamiento");
  console.log(`TXT  -> ${txtOk ? "OK" : "FAIL"} (${txtText.length} chars)`);

  // 2) PDF mínimo generado
  const pdfPath = path.join(tmp, "minimo.pdf");
  execFileSync(process.execPath, [path.join(__dirname, "generateTestPdf.js"), pdfPath], {
    stdio: "pipe",
  });
  let miniOk = false;
  let miniText = "";
  try {
    miniText = await extractText(pdfPath, "pdf");
    miniOk = miniText.includes("Hello world");
  } catch (e) {
    miniOk = false;
  }
  console.log(
    `PDF  -> ${miniOk ? "OK" : "FAIL"}: ${JSON.stringify(miniText.slice(0, 60))}`
  );

  // 3) Chunking
  const longText = Array.from(
    { length: 300 },
    (_, i) => `Frase numero ${i + 1}. Contenido con varias oraciones para probar el fragmentador. `
  ).join(" ");
  const chunks = chunkText(longText);
  const chunkOk =
    chunks.length >= 2 && chunks.every((c) => c.text.length <= ai.chunkSize + 100);
  console.log(
    `CHUNKS -> ${chunkOk ? "OK" : "FAIL"} (${chunks.length} chunks, tamano=${ai.chunkSize})`
  );

  const result = txtOk && miniOk && chunkOk;
  console.log("\nResultado:", result ? "TODO OK" : "ERROR EN PRUEBAS");
  process.exit(result ? 0 : 1);
}

main().catch((err) => {
  console.error("Prueba falló:", err);
  process.exit(1);
});