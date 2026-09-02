const {
  gemini: geminiConfig,
  ai: aiConfig,
} = require("../config/env");

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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
  Contrato: [
    "partes",
    "fecha_firma",
    "vigencia",
    "objeto",
    "valor",
  ],
  Reporte: [
    "titulo",
    "fecha",
    "autor",
    "objetivo",
    "principales_hallazgos",
  ],
  Otro: ["titulo", "fecha", "tipo_documento"],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Admite nombres con o sin el prefijo "models/" (p. ej. "models/gemini-3.6-flash").
function modelPath(name) {
  return String(name || "").replace(/^models\//, "").trim();
}

function cleanJson(text) {
  return String(text || "").replace(/```json|```/gi, "").trim();
}

function trimText(text, max = aiConfig.chatTextLimit) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function requireApiKey() {
  if (!geminiConfig.apiKey) {
    throw new Error(
      "Falta la API key de Gemini (GEMINI_API_KEY u OPENAI_API_KEY) en el archivo .env."
    );
  }
}

function isRetriable(status) {
  return status === 429 || (status && status >= 500);
}

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": geminiConfig.apiKey,
  };
}

async function parseError(res, data) {
  const msg =
    (data && data.error && data.error.message) ||
    `Gemini API error (status ${res.status})`;
  const err = new Error(msg);
  err.status = res.status;
  return err;
}

/**
 * Llama a Gemini (generateContent) exigiendo JSON estricto, con reintentos y backoff.
 */
async function geminiJson({ system, user, temperature = 0.1, maxRetries = 3 }) {
  requireApiKey();
  const model = modelPath(geminiConfig.model);
  const url = `${BASE_URL}/models/${model}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text: user }] }],
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw await parseError(res, data);

      const candidate = data && data.candidates && data.candidates[0];
      const finishReason = candidate && candidate.finishReason;
      const text = (
        candidate && candidate.content && candidate.content.parts
          ? candidate.content.parts
              .map((p) => (p && p.text) || "")
              .join("")
          : ""
      )
        .replace(/\s+/g, " ")
        .trim();

      if (!text) {
        throw new Error(
          finishReason === "SAFETY"
            ? "Gemini bloqueó la respuesta por seguridad."
            : "Gemini devolvió una respuesta vacía."
        );
      }

      return JSON.parse(cleanJson(text));
    } catch (error) {
      if (!isRetriable(error.status) || attempt === maxRetries) throw error;
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Genera el embedding de un único texto usando embedContent.
 */
async function embedOne(text) {
  const model = modelPath(geminiConfig.embeddingModel);
  const dims = geminiConfig.embeddingDimensions;
  const url = `${BASE_URL}/models/${model}:embedContent`;
  const body = {
    model: `models/${model}`,
    content: { parts: [{ text }] },
    config: { outputDimensionality: dims },
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw await parseError(res, data);

      const values = data.embedding && data.embedding.values;
      if (!Array.isArray(values) || values.length === 0) {
        throw new Error("Gemini no devolvió valores de embedding.");
      }

      // Con dimensiones < 3072 conviene normalizar (L2) para que coseno signifique similitud.
      const norm = Math.sqrt(values.reduce((s, n) => s + n * n, 0)) || 1;
      return dims > 0 && dims < 3072 ? values.map((n) => n / norm) : values;
    } catch (error) {
      if (!isRetriable(error.status) || attempt === 3) throw error;
      await sleep(1000 * attempt);
    }
  }
}

/**
 * Clasifica un documento en una de las categorías predefinidas.
 * @returns {Promise<string>}
 */
async function classifyDocument(text) {
  const trimmed = trimText(text);
  const result = await geminiJson({
    system: `Eres un clasificador de documentos empresariales. Clasifica el documento en EXACTAMENTE una de estas categorías: ${CATEGORIES.join(
      ", "
    )}. Responde únicamente en JSON con el formato: {"categoria":"<categoria>"}. Si no es claro, usa "${CATEGORIES[CATEGORIES.length - 1]}".`,
    user: `Documento a clasificar:\n\n${trimmed}`,
  });
  const category = result && result.categoria;
  return CATEGORIES.includes(category) ? category : "Otro";
}

/**
 * Genera un resumen de 3-5 líneas del documento.
 * @returns {Promise<string>}
 */
async function summarizeDocument(text) {
  const trimmed = trimText(text);
  const result = await geminiJson({
    system:
      'Eres un asistente que resume documentos empresariales en español. Genera un resumen de 3 a 5 líneas con las ideas principales. Responde únicamente en JSON: {"resumen":"<texto del resumen>"}.',
    user: `Documento a resumir:\n\n${trimmed}`,
  });
  return (result && result.resumen) || "";
}

/**
 * Extrae campos clave del documento según su categoría.
 * @returns {Promise<object>}
 */
async function extractKeyInfo(text, category) {
  const trimmed = trimText(text);
  const known = KEY_FIELDS[category] || KEY_FIELDS.Otro;
  const fieldsHint = `Intenta extraer estos campos si existen: ${known.join(
    ", "
  )}. Además incluye cualquier otro dato relevante del documento.`;

  const result = await geminiJson({
    system:
      "Eres un extractor de información de documentos. " +
      fieldsHint +
      " Responde únicamente en JSON (objeto). Si un campo no aparece en el documento, omítelo.",
    user: `Categoría detectada: ${category}\n\nDocumento:\n\n${trimmed}`,
  });
  return result && typeof result === "object" ? result : {};
}

/**
 * Genera embeddings para uno o varios textos.
 * @param {string|string[]} input
 * @returns {Promise<number[]>} Devuelve un array plano si input es string,
 *                             o un array de arrays si input es un array.
 */
async function generateEmbeddings(input) {
  requireApiKey();
  const isSingle = typeof input === "string";
  const texts = isSingle ? [input] : input;

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error("No hay textos para generar embeddings");
  }

  const vectors = [];
  for (const text of texts) {
    vectors.push(await embedOne(text));
  }

  return isSingle ? vectors[0] : vectors;
}

module.exports = {
  CATEGORIES,
  KEY_FIELDS,
  classifyDocument,
  summarizeDocument,
  extractKeyInfo,
  generateEmbeddings,
};