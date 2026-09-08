const path = require("path");
const B = path.resolve(__dirname, "..", "backend");
require(path.join(B, "node_modules", "dotenv")).config({ path: path.join(B, ".env") });
const aiService = require(path.join(B, "src", "services", "aiService"));
const { openai } = require(path.join(B, "src", "config", "env"));

function maskKey(k) {
  if (!k) return "(no definida)";
  return `${k.slice(0, 6)}...${k.slice(-4)} (len ${k.length})`;
}

const texto = `CONTRATO DE PRESTACIÓN DE SERVICIOS
Entre PROVEEDORA TECNOLOGICA S.A. (proveedor) y EMPRESA MINERA DEL SUR LTDA. (cliente), con fecha de firma 15 de marzo de 2026, se celebra el presente contrato de servicios de consultoría tecnológica por un valor total de $25.000.000 y vigencia de 12 meses. El objeto es la implementación de un sistema de gestión documental con IA.`;

(async () => {
  console.log("=== Config (APIs compatibles con OpenAI / OpenRouter) ===");
  console.log("  baseURL:", openai.baseUrl);
  console.log("  model:", openai.model);
  console.log("  embeddingModel:", openai.embeddingModel);
  console.log("  apiKey:", maskKey(openai.apiKey));

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
  const vec = await aiService.generateEmbeddings([
    texto.slice(0, 200),
    texto.slice(200, 400),
  ]);
  console.log(
    `EMBEDDINGS (${Date.now() - t0}ms): ${vec.length} vectores de dim ${vec[0].length}`
  );

  console.log("TODO OK");
})().catch((e) => {
  console.error("ERROR:", e.message);
  console.error("  status:", e.status || "-");
  process.exit(1);
});