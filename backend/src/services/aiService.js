const { openai: openaiConfig, ai: aiConfig } = require("../config/env");

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

function trimText(text, max = aiConfig.chatTextLimit) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

let _client;

/**
 * Cliente de la API compatible con OpenAI (OpenRouter / DeepSeek / OpenAI).
 * Usa OPENAI_BASE_URL del .env (p. ej. https://openrouter.ai/api/v1).
 * La librería oficial de OpenAI también leería OPENAI_BASE_URL por sí sola si
 * no se pasara baseURL, pero aquí lo fijamos explícitamente desde la config.
 *
 * Timeout acotado (60s): si una llamada a la API de IA se cuelga, el SDK
 * lanza un error y el documento pasa a "error" en vez de quedarse en
 * "processing" para siempre.
 */
function getClient() {
  if (!_client) {
    if (!openaiConfig.apiKey) {
      throw new Error(
        "Falta OPENAI_API_KEY en el archivo .env. Configúrala para usar el procesamiento con IA."
      );
    }
    const { OpenAI } = require("openai");
    _client = new OpenAI({
      apiKey: openaiConfig.apiKey,
      baseURL: openaiConfig.baseUrl,
      timeout: 60_000,
      maxRetries: 2,
      // Identifica la app en el panel de OpenRouter (opcional, recomendado).
      defaultHeaders: { "X-Title": "Sistema-Documental-IA" },
    });
  }
  return _client;
}

/**
 * Llama un modelo de chat exigiendo JSON estricto.
 * Los 401 (credenciales) fallan al instante; los 429/5xx se reintentan hasta
 * maxRetries (2) y luego lanzan; en ambos casos el error llega al pipeline,
 * que marcará el documento como "error".
 */
async function chatJson({ system, user, temperature = 0.1 }) {
  const client = getClient();
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const response = await client.chat.completions.create({
    model: openaiConfig.model,
    response_format: { type: "json_object" },
    temperature,
    messages,
  });

  const content =
    (response.choices &&
      response.choices[0] &&
      response.choices[0].message &&
      response.choices[0].message.content) ||
    "";
  // Limpiar posibles marcadores de bloque dejados por el modelo
  return JSON.parse(content.replace(/```json|```/gi, "").trim());
}

/**
 * Clasifica un documento en una de las categorías predefinidas.
 * @returns {Promise<string>}
 */
async function classifyDocument(text) {
  const trimmed = trimText(text);
  const result = await chatJson({
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
  const result = await chatJson({
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

  const result = await chatJson({
    system:
      "Eres un extractor de información de documentos. " +
      fieldsHint +
      " Responde únicamente en JSON (objeto). Si un campo no aparece en el documento, omítelo.",
    user: `Categoría detectada: ${category}\n\nDocumento:\n\n${trimmed}`,
  });
  return result && typeof result === "object" ? result : {};
}

/**
 * Genera embeddings para uno o varios textos (en un solo request de batch).
 * @param {string|string[]} input
 * @returns {Promise<number[]>} Devuelve un array plano si input es string,
 *                             o un array de arrays si input es un array.
 */
async function generateEmbeddings(input) {
  const client = getClient();
  const isSingle = typeof input === "string";
  const texts = isSingle ? [input] : input;

  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error("No hay textos para generar embeddings");
  }

  const response = await client.embeddings.create({
    model: openaiConfig.embeddingModel,
    input: texts,
  });

  const items = [...response.data].sort((a, b) => a.index - b.index);
  const vectors = items.map((item) => item.embedding);

  return isSingle ? vectors[0] : vectors;
}

/**
 * Responde una pregunta (chat RAG) usando el contexto de fragmentos ya
 * recuperados de los documentos, citando las fuentes empleadas.
 * @returns {Promise<{respuesta: string, fuentes: number[]}>}
 */
async function askQuestion(question, context) {
  const result = await chatJson({
    system:
      'Eres un asistente de un sistema de gestión documental. Responde a la pregunta usando SOLO el contexto de los documentos entregados. Cada fuente está numerada como [n]. Responde en español, en prosa natural, y añade al final de cada idea las fuentes relevantes como [n]. Si el contexto no contiene la respuesta, dilo explícitamente. Responde únicamente en JSON: {"respuesta":"<texto>","fuentes":[1,2]}',
    user: `Contexto:\n${context}\n\nPregunta: ${question}`,
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
};