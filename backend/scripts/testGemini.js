require("dotenv").config();
const aiService = require("../src/services/aiService");
const { gemini } = require("../src/config/env");

function maskKey(k) {
  if (!k) return "(no definida)";
  return `${k.slice(0, 6)}...${k.slice(-4)} (len ${k.length})`;
}

const texto = `CONTRATO DE PRESTACIÓN DE SERVICIOS
Entre PROVEEDORA TECNOLOGICA S.A. (proveedor) y EMPRESA MINERA DEL SUR LTDA. (cliente), con fecha de firma 15 de marzo de 2026, se celebra el presente contrato de servicios de consultoría tecnológica por un valor total de $25.000.000 y vigencia de 12 meses. El objeto es la implementación de un sistema de gestión documental con IA.`;

(async () => {
  console.log("=== Config Gemini ===");
  console.log("  model:", gemini.model);
  console.log(
    "  embeddingModel:",
    gemini.embeddingModel,
    "| dims:",
    gemini.embeddingDimensions
  );
  console.log("  apiKey:", maskKey(gemini.apiKey));

  let t0 = Date.now();
  const categoria = await aiService.classifyDocument(texto);
  console.log(`CLASIFICACIÓN (${Date.now() - t0}ms): ${categoria}`);

  t0 = Date.now();
  const resumen = await aiService.summarizeDocument(texto);
  console.log(`RESUMEN (${Date.now() - t0}ms): ${resumen}`);

  t0 = Date.now();
  const campos = await aiService.extractKeyInfo(texto, categoria);
  console.log(`CAMPOS (${Date.now() - t0}ms):`, JSON.stringify(campos));

  t0 = Date.now();
  const vec = await aiService.generateEmbeddings(texto);
  console.log(
    `EMBEDDING (${Date.now() - t0}ms): dim ${vec.length}, primer valor ${vec[0].toFixed(
      6
    )}`
  );

  console.log("TODO OK");
})().catch((e) => {
  console.error("ERROR:", e.message);
  console.error("  status:", e.status || "-");
  process.exit(1);
});