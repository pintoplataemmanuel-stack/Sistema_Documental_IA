const { OpenAI } = require("openai");
const { ai: aiConfig, openai: openaiConfig } = require("../config/env");
const { runJsonChain } = require("./llmService");
const auditService = require("./auditService");

// Categorías predefinidas (RF09)
const CATEGORIES = ["Contrato", "Factura", "Reporte", "Otro"];

// Campos clave según la categoría detectada (RF11)
const KEY_FIELDS = {
  Factura: [
    "numero_factura",
    "fecha_emision",
    "monto_total",
    "proveedor",
    "cliente",
  ],
  Contrato: ["partes", "fecha_firma", "vigencia", "objeto", "valor"],
  Reporte: [
    "titulo",
    "fecha",
    "autor",
    "objetivo",
    "principales_hallazgos",
  ],
  Otro: ["titulo", "fecha", "tipo_documento"],
};

const OPENROUTER_EMBEDDING_DIMENSIONS = 1536;

function trimText(text, max = aiConfig.chatTextLimit) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

/**
 * Configuración de un proveedor de embeddings. Todos usan la API compatible
 * con OpenAI; Gemini y Ollama producen 768 dimensiones y OpenRouter 1536.
 */
function buildEmbeddingProvider(name) {
  switch (name) {
    case "gemini":
      if (!aiConfig.gemini.apiKey) return null;
      return {
        name: "gemini",
        apiKey: aiConfig.gemini.apiKey,
        baseUrl: aiConfig.gemini.baseUrl,
        nativeBaseUrl: aiConfig.gemini.nativeBaseUrl,
        model: aiConfig.gemini.embeddingModel,
        dimensions: aiConfig.gemini.embeddingDimensions,
        apiStyle: "gemini-native",
      };
    case "ollama":
      if (!aiConfig.ollama.enabled) return null;
      return {
        name: "ollama",
        apiKey: "ollama",
        baseUrl: aiConfig.ollama.baseUrl,
        model: aiConfig.ollama.embeddingModel,
        dimensions: aiConfig.ollama.embeddingDimensions,
      };
    case "openrouter":
      if (!openaiConfig.apiKey) return null;
      return {
        name: "openrouter",
        apiKey: openaiConfig.apiKey,
        baseUrl: openaiConfig.baseUrl,
        model: openaiConfig.embeddingModel,
        dimensions: OPENROUTER_EMBEDDING_DIMENSIONS,
      };
    default:
      return null;
  }
}

/**
 * Orden de proveedores de embeddings. No se mezclan dimensiones: si el índice
 * de Atlas está en 768, solo se usan Gemini/Ollama; si está en 1536, OpenRouter.
 */
function getEmbeddingProviderOrder() {
  const configured = ["gemini", "ollama", "openrouter"]
    .map(buildEmbeddingProvider)
    .filter(Boolean);

  if (configured.length === 0) return [];

  const preferredName =
    aiConfig.embeddingsProvider && aiConfig.embeddingsProvider !== "auto"
      ? aiConfig.embeddingsProvider
      : null;
  const preferred = preferredName
    ? buildEmbeddingProvider(preferredName)
    : null;

  // Nunca se mezclan dimensiones: si el primer proveedor es Gemini (768), el
  // respaldo también debe ser de 768 (Ollama). OpenRouter (1536) solo se usa
  // si el índice y el proveedor principal son de 1536.
  const targetDimensions =
    aiConfig.embeddingDimensions ||
    (preferred ? preferred.dimensions : configured[0].dimensions);

  const compatible = configured.filter(
    (provider) => provider.dimensions === targetDimensions
  );

  if (!preferred) return compatible;

  const ordered = [preferred];
  for (const provider of compatible) {
    if (!ordered.some((item) => item.name === provider.name)) {
      ordered.push(provider);
    }
  }

  return ordered;
}

function getEmbeddingInfo() {
  const [provider] = getEmbeddingProviderOrder();
  if (!provider) {
    return {
      provider: "none",
      model: "",
      dimensions: aiConfig.embeddingDimensions || 0,
      configured: false,
    };
  }
  return {
    provider: provider.name,
    model: provider.model,
    dimensions: provider.dimensions,
    configured: true,
  };
}

function getEmbeddingDimensions() {
  const info = getEmbeddingInfo();
  return info.dimensions || OPENROUTER_EMBEDDING_DIMENSIONS;
}

/**
 * Embeddings con el endpoint nativo de Gemini.
 *
 * Se usa el endpoint nativo (no el compatible con OpenAI) porque permite fijar
 * `outputDimensionality` y así garantizar que el índice de Atlas y los vectores
 * tengan exactamente la misma dimensión (768 por defecto).
 */
async function generateGeminiEmbeddings(texts, provider) {
  const modelPath = provider.model.startsWith("models/")
    ? provider.model
    : `models/${provider.model}`;
  const url = `${provider.nativeBaseUrl.replace(/\/$/, "")}/${modelPath}:batchEmbedContents`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": provider.apiKey,
    },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: modelPath,
        content: { parts: [{ text }] },
        outputDimensionality: provider.dimensions,
      })),
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gemini respondió ${response.status} al generar embeddings: ${detail.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();
  const embeddings = Array.isArray(data.embeddings) ? data.embeddings : [];

  if (embeddings.length !== texts.length) {
    throw new Error(
      `Gemini devolvió ${embeddings.length} embeddings y se esperaban ${texts.length}.`
    );
  }

  return embeddings.map((item) =>
    Array.isArray(item.values) ? item.values : item.embedding
  );
}

/**
 * Genera embeddings para uno o varios textos.
 *
 * Si el proveedor principal falla (cuota agotada, timeout), prueba el
 * siguiente proveedor compatible con la misma dimensión. Nunca mezcla
 * vectores de 768 con 1536 porque el índice de Atlas quedaría inconsistente.
 */
async function generateEmbeddings(input) {
  const isSingle = typeof input === "string";
  const texts = isSingle ? [input] : input;

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error("No hay textos para generar embeddings");
  }

  const providers = getEmbeddingProviderOrder();
  if (providers.length === 0) {
    throw new Error(
      "No hay proveedor de embeddings configurado. Define GEMINI_API_KEY, habilita Ollama o configura OPENAI_API_KEY."
    );
  }

  const errors = [];

  for (const provider of providers) {
    try {
      let vectors;

      if (provider.apiStyle === "gemini-native") {
        vectors = await generateGeminiEmbeddings(texts, provider);
      } else {
        const client = new OpenAI({
          apiKey: provider.apiKey,
          baseURL: provider.baseUrl,
          timeout: 60_000,
          maxRetries: 2,
        });

        const response = await client.embeddings.create({
          model: provider.model,
          input: texts,
        });

        const items = [...response.data].sort((a, b) => a.index - b.index);
        vectors = items.map((item) => item.embedding);
      }

      for (const vector of vectors) {
        if (!Array.isArray(vector) || vector.length !== provider.dimensions) {
          throw new Error(
            `El proveedor ${provider.name} devolvió ${
              Array.isArray(vector) ? vector.length : "0"
            } dimensiones y se esperaban ${
              provider.dimensions
            }. Revisa EMBEDDING_DIMENSIONS y el índice de Atlas.`
          );
        }
      }

      return isSingle ? vectors[0] : vectors;
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
      console.warn(
        `[embeddings] Falló ${provider.name} (${provider.model}):`,
        error.message
      );
    }
  }

  throw new Error(
    `No se pudieron generar los embeddings. ${errors.join(" | ")}`
  );
}

/**
 * Ejecuta una tarea de IA con JSON estricto y registra la acción en auditoría.
 */
async function runAiTask({ action, system, user, temperature = 0.1, meta = {} }) {
  const startedAt = Date.now();
  try {
    const result = await runJsonChain({ system, user, temperature });
    await auditService.record({
      user: meta.userId || null,
      action,
      resource: meta.resource || "Document",
      resourceId: meta.documentId || meta.resourceId || null,
      status: "success",
      metadata: {
        durationMs: Date.now() - startedAt,
        ...(meta.metadata || {}),
      },
    });
    return result;
  } catch (error) {
    await auditService.record({
      user: meta.userId || null,
      action,
      resource: meta.resource || "Document",
      resourceId: meta.documentId || meta.resourceId || null,
      status: "error",
      metadata: {
        durationMs: Date.now() - startedAt,
        error: error.message,
        ...(meta.metadata || {}),
      },
    });
    throw error;
  }
}

/**
 * Clasifica un documento en una de las categorías predefinidas.
 * @returns {Promise<string>}
 */
async function classifyDocument(text, meta = {}) {
  const trimmed = trimText(text);
  const result = await runAiTask({
    action: "ai.clasificar",
    system: `Eres un clasificador de documentos empresariales. Clasifica el documento en EXACTAMENTE una de estas categorías: ${CATEGORIES.join(
      ", "
    )}. Responde únicamente en JSON con el formato: {"categoria":"<categoria>"}. Si no es claro, usa "${
      CATEGORIES[CATEGORIES.length - 1]
    }".`,
    user: `Documento a clasificar:\n\n${trimmed}`,
    meta,
  });
  const category = result && result.categoria;
  return CATEGORIES.includes(category) ? category : "Otro";
}

/**
 * Genera un resumen de 3-5 líneas del documento.
 * @returns {Promise<string>}
 */
async function summarizeDocument(text, meta = {}) {
  const trimmed = trimText(text);
  const result = await runAiTask({
    action: "ai.resumir",
    system:
      'Eres un asistente que resume documentos empresariales en español. Genera un resumen de 3 a 5 líneas con las ideas principales. Responde únicamente en JSON: {"resumen":"<texto del resumen>"}.',
    user: `Documento a resumir:\n\n${trimmed}`,
    meta,
  });
  return (result && result.resumen) || "";
}

/**
 * Extrae campos clave del documento según su categoría.
 * @returns {Promise<object>}
 */
async function extractKeyInfo(text, category, meta = {}) {
  const trimmed = trimText(text);
  const known = KEY_FIELDS[category] || KEY_FIELDS.Otro;
  const fieldsHint = `Intenta extraer estos campos si existen: ${known.join(
    ", "
  )}. Además incluye cualquier otro dato relevante del documento.`;

  const result = await runAiTask({
    action: "ai.extraer_info",
    system:
      "Eres un extractor de información de documentos. " +
      fieldsHint +
      " Responde únicamente en JSON (objeto). Si un campo no aparece en el documento, omítelo.",
    user: `Categoría detectada: ${category}\n\nDocumento:\n\n${trimmed}`,
    meta,
  });
  return result && typeof result === "object" ? result : {};
}

/**
 * Responde una pregunta (chat RAG) usando el contexto de fragmentos ya
 * recuperados de los documentos, citando las fuentes empleadas.
 * @returns {Promise<{respuesta: string, fuentes: number[]}>}
 */
async function askQuestion(question, context, meta = {}) {
  const result = await runAiTask({
    action: "ai.chat_rag",
    system:
      'Eres un asistente de un sistema de gestión documental. Responde a la pregunta usando SOLO el contexto de los documentos entregados. Cada fuente está numerada como [n]. Responde en español, en prosa natural, y añade al final de cada idea las fuentes relevantes como [n]. Si el contexto no contiene la respuesta, dilo explícitamente. Responde únicamente en JSON: {"respuesta":"<texto>","fuentes":[1,2]}',
    user: `Contexto:\n${context}\n\nPregunta: ${question}`,
    meta,
  });
  return {
    respuesta: (result && result.respuesta) || "",
    fuentes: Array.isArray(result && result.fuentes)
      ? result.fuentes.map(Number).filter(Number.isFinite)
      : [],
  };
}

module.exports = {
  CATEGORIES,
  KEY_FIELDS,
  classifyDocument,
  summarizeDocument,
  extractKeyInfo,
  generateEmbeddings,
  askQuestion,
  getEmbeddingInfo,
  getEmbeddingDimensions,
};
