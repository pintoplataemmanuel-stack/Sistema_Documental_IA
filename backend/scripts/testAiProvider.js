const aiService = require("../src/services/aiService");
const {
  getChatProviderOrder,
  runJsonChain,
} = require("../src/services/llmService");

/**
 * Prueba real (no solo configuración) de los proveedores de IA.
 *
 * Hace una llamada de chat que exige JSON y genera un embedding. Sirve para
 * comprobar que las claves, los endpoints y el respaldo funcionan antes de
 * desplegar o de la revisión en clase.
 *
 * Uso:
 *   cd backend
 *   npm run ai:test
 */
async function main() {
  const providers = getChatProviderOrder();

  console.log("=== Orden de proveedores de chat ===");
  if (providers.length === 0) {
    console.log("  (ninguno configurado)");
  } else {
    providers.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.model})`);
    });
  }

  let ok = true;

  console.log("\n=== Prueba de chat (JSON) ===");
  try {
    const result = await runJsonChain({
      system:
        'Responde únicamente en JSON con el formato {"ok":true,"mensaje":"<texto breve>"}.',
      user: "Confirma que el proveedor de IA está funcionando.",
      temperature: 0,
    });
    console.log("  OK:", JSON.stringify(result));
  } catch (error) {
    ok = false;
    console.error("  FALLÓ:", error.message);
  }

  console.log("\n=== Prueba de embeddings ===");
  try {
    const vector = await aiService.generateEmbeddings(
      "prueba de embeddings del sistema documental"
    );
    const info = aiService.getEmbeddingInfo();
    console.log(
      `  OK: ${vector.length} dimensiones con ${info.provider} / ${info.model}`
    );
  } catch (error) {
    ok = false;
    console.error("  FALLÓ:", error.message);
  }

  console.log(
    ok
      ? "\nResultado: todos los proveedores respondieron correctamente."
      : "\nResultado: hubo fallos. Revisa las claves y la conexión."
  );

  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error("ERROR:", error.message);
  process.exit(1);
});
