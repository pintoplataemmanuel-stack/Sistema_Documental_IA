const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ai: aiConfig, openai: openaiConfig } = require("../config/env");

/**
 * Construye la configuración de un proveedor compatible con la API de OpenAI.
 * Todos los proveedores gratuitos elegidos (Gemini, Groq y Ollama) exponen un
 * endpoint compatible, lo que permite usar el mismo modelo de LangChain.
 */
function buildProvider(name) {
  switch (name) {
    case "gemini":
      if (!aiConfig.gemini.apiKey) return null;
      return {
        name: "gemini",
        apiKey: aiConfig.gemini.apiKey,
        baseUrl: aiConfig.gemini.baseUrl,
        model: aiConfig.gemini.chatModel,
        // Gemini no necesita response_format; el prompt ya exige JSON.
        jsonMode: false,
      };
    case "groq":
      if (!aiConfig.groq.apiKey) return null;
      return {
        name: "groq",
        apiKey: aiConfig.groq.apiKey,
        baseUrl: aiConfig.groq.baseUrl,
        model: aiConfig.groq.chatModel,
        jsonMode: true,
      };
    case "openrouter":
      if (!openaiConfig.apiKey) return null;
      return {
        name: "openrouter",
        apiKey: openaiConfig.apiKey,
        baseUrl: openaiConfig.baseUrl,
        model: openaiConfig.model,
        jsonMode: true,
      };
    case "ollama":
      if (!aiConfig.ollama.enabled) return null;
      return {
        name: "ollama",
        apiKey: "ollama",
        baseUrl: aiConfig.ollama.baseUrl,
        model: aiConfig.ollama.chatModel,
        jsonMode: true,
      };
    default:
      return null;
  }
}

/**
 * Orden de proveedores de chat. Si AI_PROVIDER=auto se usa el orden natural:
 * Gemini -> Groq -> OpenRouter -> Ollama. Si se fija un proveedor, se respeta
 * y luego se agregan los de AI_FALLBACK_PROVIDERS.
 */
function getChatProviderOrder() {
  const configured = ["gemini", "groq", "openrouter", "ollama"]
    .map(buildProvider)
    .filter(Boolean);

  if (!aiConfig.provider || aiConfig.provider === "auto") {
    return configured;
  }

  const ordered = [];
  const preferred = buildProvider(aiConfig.provider);
  if (preferred) ordered.push(preferred);

  for (const name of aiConfig.fallbackProviders) {
    const provider = buildProvider(name);
    if (
      provider &&
      !ordered.some((item) => item.name === provider.name)
    ) {
      ordered.push(provider);
    }
  }

  for (const provider of configured) {
    if (!ordered.some((item) => item.name === provider.name)) {
      ordered.push(provider);
    }
  }

  return ordered;
}

function createChatModel(provider, temperature) {
  const options = {
    apiKey: provider.apiKey,
    model: provider.model,
    temperature,
    timeout: aiConfig.chatTimeoutMs,
    maxRetries: aiConfig.chatMaxRetries,
    configuration: {
      baseURL: provider.baseUrl,
    },
  };

  if (provider.jsonMode) {
    options.modelKwargs = {
      response_format: { type: "json_object" },
    };
  }

  return new ChatOpenAI(options);
}

/**
 * Devuelve un modelo de LangChain con cadena de respaldo.
 * Si Gemini falla por cuota o error, LangChain prueba automáticamente Groq,
 * OpenRouter y Ollama (los que estén configurados).
 */
function getChatRunnable({ temperature = 0.1 } = {}) {
  const providers = getChatProviderOrder();

  if (providers.length === 0) {
    throw new Error(
      "No hay ningún proveedor de IA configurado. Define GEMINI_API_KEY, GROQ_API_KEY u OPENAI_API_KEY en el .env."
    );
  }

  const models = providers.map((provider) =>
    createChatModel(provider, temperature)
  );

  if (models.length === 1) {
    return { runnable: models[0], providers };
  }

  return {
    runnable: models[0].withFallbacks(models.slice(1)),
    providers,
  };
}

/**
 * Limpia el texto devuelto por el modelo y extrae el primer objeto JSON.
 */
function parseJsonContent(content) {
  const text = String(content || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Continúa al error final.
      }
    }
    throw new Error(
      `El modelo no devolvió JSON válido. Respuesta recibida: ${text.slice(
        0,
        300
      )}`
    );
  }
}

/**
 * Ejecuta una cadena de LangChain que exige una respuesta JSON.
 *
 * @param {object} args
 * @param {string} args.system Instrucción del sistema.
 * @param {string} args.user Entrada del usuario.
 * @param {number} [args.temperature]
 * @returns {Promise<object>}
 */
async function runJsonChain({ system, user, temperature = 0.1 }) {
  const { runnable, providers } = getChatRunnable({ temperature });

  // Se usan mensajes directamente (no una plantilla de prompt) para que los
  // ejemplos JSON de los prompts no se interpreten como variables de plantilla.
  const messages = [
    new SystemMessage(system),
    new HumanMessage(user),
  ];

  const chain = runnable.pipe(new StringOutputParser());

  try {
    const raw = await chain.invoke(messages);
    return parseJsonContent(raw);
  } catch (error) {
    const names = providers.map((provider) => provider.name).join(", ");
    throw new Error(
      `La cadena de IA falló con los proveedores [${names}]: ${error.message}`
    );
  }
}

/**
 * Información pública de los proveedores configurados (sin exponer claves).
 */
function getProviderStatus() {
  let vision = [];
  try {
    vision = require("./visionService")
      .getVisionProviderOrder()
      .map((provider) => ({
        name: provider.name,
        model: provider.model,
        baseUrl: provider.baseUrl,
      }));
  } catch {
    vision = [];
  }

  return {
    chat: getChatProviderOrder().map((provider) => ({
      name: provider.name,
      model: provider.model,
      baseUrl: provider.baseUrl,
    })),
    embeddings: require("./aiService").getEmbeddingInfo(),
    vision,
  };
}

module.exports = {
  buildProvider,
  getChatProviderOrder,
  getChatRunnable,
  parseJsonContent,
  runJsonChain,
  getProviderStatus,
};
