const { ai: aiConfig } = require("../src/config/env");
const {
  getChatProviderOrder,
  getProviderStatus,
} = require("../src/services/llmService");

/**
 * Muestra qué proveedores de IA están configurados, sin imprimir claves.
 *
 * Uso:
 *   cd backend
 *   npm run ai:check
 */
function mask(value) {
  if (!value) return "(sin configurar)";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

const chatProviders = getChatProviderOrder();

console.log("=== Proveedores de chat (orden de uso) ===");
if (chatProviders.length === 0) {
  console.log("  (ninguno)");
} else {
  chatProviders.forEach((provider, index) => {
    console.log(
      `  ${index + 1}. ${provider.name} | modelo: ${provider.model} | clave: ${mask(
        provider.apiKey
      )}`
    );
  });
}

console.log("\n=== Proveedores de embeddings ===");
console.log(JSON.stringify(getProviderStatus().embeddings, null, 2));

console.log("\n=== Configuración ===");
console.log(`  AI_PROVIDER: ${aiConfig.provider}`);
console.log(
  `  AI_FALLBACK_PROVIDERS: ${aiConfig.fallbackProviders.join(", ")}`
);
console.log(`  EMBEDDINGS_PROVIDER: ${aiConfig.embeddingsProvider}`);
console.log(
  `  EMBEDDING_DIMENSIONS: ${
    aiConfig.embeddingDimensions || "automática según proveedor"
  }`
);
