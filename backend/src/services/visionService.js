const fs = require("fs");
const { OpenAI } = require("openai");
const { ai: aiConfig, openai: openaiConfig } = require("../config/env");
const {
  getChatProviderOrder,
  parseJsonContent,
  runJsonChain,
} = require("./llmService");
const { extractText } = require("./textExtractionService");
const auditService = require("./auditService");

const REQUIRED_FIELDS = ["proveedor", "fecha", "numero_factura", "total"];

const SYSTEM_PROMPT = `Eres un módulo de visión por computador especializado en facturas y recibos de compra (Colombia).

Extrae la información del documento y responde ÚNICAMENTE con un objeto JSON, sin texto adicional ni bloques Markdown, con esta forma exacta:
{
  "proveedor": "string",
  "nit": "string",
  "fecha": "YYYY-MM-DD",
  "numero_factura": "string",
  "items": [
    { "descripcion": "string", "cantidad": 1, "valor_unitario": 0 }
  ],
  "subtotal": 0,
  "impuestos": 0,
  "total": 0,
  "moneda": "COP",
  "confianza": 0.0,
  "campos_baja_confianza": ["string"]
}

Reglas:
- Escribe los valores monetarios como números, sin símbolos ni separadores de miles.
- La fecha debe ir en formato YYYY-MM-DD. Si no es legible, usa "".
- "confianza" es tu seguridad global entre 0 y 1 (por ejemplo 0.92).
- Incluye en "campos_baja_confianza" los nombres de los campos que no pudiste leer con seguridad.
- Si un dato no aparece, déjalo vacío ("" o 0); no inventes valores.
- Si el documento no es una factura o recibo, responde con proveedor vacío, total 0 y confianza 0.`;

const FIELD_ALIASES = {
  proveedor: ["proveedor", "nombre_proveedor", "razon_social", "emisor"],
  nit: ["nit", "nit_proveedor", "identificacion", "ruc"],
  fecha: ["fecha", "fecha_emision", "fecha_factura"],
  numero_factura: ["numero_factura", "num_factura", "numero", "factura"],
  subtotal: ["subtotal", "base", "base_gravable"],
  impuestos: ["impuestos", "iva", "total_impuestos"],
  total: ["total", "total_pagar", "valor_total"],
  moneda: ["moneda", "currency"],
};

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/**
 * Convierte valores monetarios escritos por el modelo ("$ 1.250.000", "12,50")
 * a número. En formato colombiano el punto separa miles y la coma los decimales.
 */
function parseAmount(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  let text = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .trim();
  if (!text) return 0;

  if (text.includes(".") && text.includes(",")) {
    if (text.lastIndexOf(",") > text.lastIndexOf(".")) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    const parts = text.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      text = text.replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if ((text.match(/\./g) || []).length > 1) {
    text = text.replace(/\./g, "");
  } else if (text.includes(".")) {
    // Un solo punto con exactamente 3 decimales se interpreta como separador
    // de miles ("12.500" → 12500), no como decimal.
    const parts = text.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      text = parts.join("");
    }
  }

  const number = Number(text);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

/**
 * Normaliza fechas a YYYY-MM-DD. Acepta ISO y el formato dd/mm/aaaa.
 */
function normalizeDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const latin = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (latin) {
    const day = latin[1].padStart(2, "0");
    const month = latin[2].padStart(2, "0");
    return `${latin[3]}-${month}-${day}`;
  }

  return "";
}

/**
 * Acepta 0.92, 92 o "92 %" y devuelve un valor entre 0 y 1.
 */
function normalizeConfidence(value) {
  let number = parseAmount(value);
  if (number > 1 && number <= 100) number /= 100;
  if (!Number.isFinite(number)) number = 0;
  return Math.min(1, Math.max(0, Math.round(number * 100) / 100));
}

function normalizeItems(value) {
  const list = Array.isArray(value)
    ? value
    : Array.isArray(value?.items)
    ? value.items
    : [];

  return list.slice(0, 100).map((item) => ({
    descripcion: String(
      firstValue(item || {}, ["descripcion", "detalle", "nombre", "producto"]) ?? ""
    ).trim(),
    cantidad: parseAmount(
      firstValue(item || {}, ["cantidad", "qty", "unidades"]) ?? 1
    ),
    valor_unitario: parseAmount(
      firstValue(item || {}, [
        "valor_unitario",
        "precio_unitario",
        "valor",
        "precio",
      ])
    ),
  }));
}

/**
 * Limpia y completa la respuesta del modelo. Función pura para poder probarla
 * sin llamar a ningún proveedor.
 */
function normalizeInvoiceData(raw) {
  const source =
    raw && typeof raw === "object"
      ? raw.factura || raw.invoice || raw
      : {};

  const items = normalizeItems(
    firstValue(source, ["items", "detalle", "lineas"])
  );

  let subtotal = parseAmount(firstValue(source, FIELD_ALIASES.subtotal));
  const impuestos = parseAmount(firstValue(source, FIELD_ALIASES.impuestos));
  let total = parseAmount(firstValue(source, FIELD_ALIASES.total));

  if (!subtotal && items.length > 0) {
    subtotal = items.reduce(
      (sum, item) => sum + item.cantidad * item.valor_unitario,
      0
    );
    subtotal = Math.round(subtotal * 100) / 100;
  }
  if (!total && (subtotal || impuestos)) {
    total = Math.round((subtotal + impuestos) * 100) / 100;
  }

  const data = {
    proveedor: String(
      firstValue(source, FIELD_ALIASES.proveedor) ?? ""
    ).trim(),
    nit: String(firstValue(source, FIELD_ALIASES.nit) ?? "").trim(),
    fecha: normalizeDate(firstValue(source, FIELD_ALIASES.fecha)),
    numero_factura: String(
      firstValue(source, FIELD_ALIASES.numero_factura) ?? ""
    ).trim(),
    items,
    subtotal,
    impuestos,
    total,
    moneda: String(firstValue(source, FIELD_ALIASES.moneda) ?? "COP")
      .trim()
      .toUpperCase() || "COP",
  };

  const confianza = normalizeConfidence(source.confianza);

  const low = [];
  const seen = new Set();
  const reported = Array.isArray(source.campos_baja_confianza)
    ? source.campos_baja_confianza
    : [];
  for (const field of reported) {
    const key = String(field || "").trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      low.push(key);
    }
  }

  // Un campo obligatorio vacío siempre obliga a revisión.
  for (const field of REQUIRED_FIELDS) {
    const empty =
      field === "total"
        ? !(Number(data.total) > 0)
        : !String(data[field] || "").trim();
    if (empty && !seen.has(field)) {
      seen.add(field);
      low.push(field);
    }
  }

  return { data, confianza, camposBajaConfianza: low };
}

/**
 * Decide si la lectura necesita revisión humana.
 */
function needsReview({ confianza, camposBajaConfianza = [] }, minConfidence) {
  const threshold =
    typeof minConfidence === "number"
      ? minConfidence
      : aiConfig.vision.minConfidence;
  return (
    Number(confianza) < threshold || camposBajaConfianza.length > 0
  );
}

/**
 * Una imagen ilegible o que no es una factura no debe guardarse como gasto.
 * Se considera ilegible cuando el modelo no devolvió ningún dato útil (el
 * prompt indica responder vacío con confianza 0 en ese caso).
 */
function isUnreadable({ data = {}, confianza = 0 } = {}) {
  const hasProvider = Boolean(String(data.proveedor || "").trim());
  const hasTotal = Number(data.total) > 0;
  const hasInvoiceNumber = Boolean(String(data.numero_factura || "").trim());
  const hasDate = Boolean(String(data.fecha || "").trim());
  const hasItems = Array.isArray(data.items) && data.items.length > 0;
  const hasAnyData = hasProvider || hasTotal || hasInvoiceNumber || hasDate || hasItems;

  return !hasAnyData || (Number(confianza) <= 0.05 && !hasTotal);
}

/**
 * Proveedores multimodales configurados. Gemini primero (nivel gratuito) y
 * OpenRouter como respaldo compatible con la API de OpenAI.
 */
function getVisionProviderOrder() {
  const providers = [];

  if (aiConfig.gemini.apiKey) {
    providers.push({
      name: "gemini",
      apiKey: aiConfig.gemini.apiKey,
      baseUrl: aiConfig.gemini.baseUrl,
      model: aiConfig.gemini.visionModel,
    });
  }

  if (openaiConfig.apiKey) {
    providers.push({
      name: "openrouter",
      apiKey: openaiConfig.apiKey,
      baseUrl: openaiConfig.baseUrl,
      model: openaiConfig.visionModel,
    });
  }

  return providers;
}

function contentToText(content) {
  if (Array.isArray(content)) {
    return content.map((part) => part?.text || "").join("");
  }
  return String(content || "");
}

async function extractFromImage(filePath, mimeType) {
  const providers = getVisionProviderOrder();
  if (providers.length === 0) {
    throw new Error(
      "No hay proveedor de visión configurado. Define GEMINI_API_KEY o OPENAI_API_KEY (OpenRouter) en el .env."
    );
  }

  const buffer = await fs.promises.readFile(filePath);
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  const errors = [];

  for (const provider of providers) {
    try {
      const client = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
        timeout: aiConfig.vision.timeoutMs,
        maxRetries: aiConfig.vision.maxRetries,
      });

      const response = await client.chat.completions.create({
        model: provider.model,
        temperature: 0,
        max_tokens: aiConfig.vision.maxTokens,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Lee esta factura o recibo y devuelve el JSON solicitado.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      });

      const raw = contentToText(response?.choices?.[0]?.message?.content);
      return {
        raw: parseJsonContent(raw),
        provider: provider.name,
        model: provider.model,
        mode: "vision",
      };
    } catch (error) {
      errors.push(`${provider.name} (${provider.model}): ${error.message}`);
      console.warn(
        `[vision] Falló ${provider.name} (${provider.model}):`,
        error.message
      );
    }
  }

  throw new Error(
    `No se pudo leer la factura con ningún proveedor de visión. ${errors.join(
      " | "
    )}`
  );
}

async function extractFromPdf(filePath) {
  const text = await extractText(filePath, "pdf");
  if (!text || text.replace(/\s+/g, "").length < 40) {
    throw new Error(
      "El PDF no contiene texto seleccionable (parece escaneado). Súbelo como imagen JPG o PNG."
    );
  }

  const raw = await runJsonChain({
    system: SYSTEM_PROMPT,
    user: `Extrae los datos de esta factura:\n\n${text.slice(0, 12000)}`,
    temperature: 0,
  });

  const [provider] = getChatProviderOrder();
  return {
    raw,
    provider: provider?.name || "text-chain",
    model: provider?.model || "",
    mode: "text",
  };
}

/**
 * Lee una factura (imagen o PDF) y devuelve los datos normalizados.
 *
 * @returns {Promise<{data: object, confianza: number, camposBajaConfianza: string[], provider: string, model: string, mode: string}>}
 */
async function extractInvoice({ filePath, fileType, mimeType, meta = {} }) {
  const startedAt = Date.now();
  const isPdf = String(fileType).toLowerCase() === "pdf";

  try {
    const result = isPdf
      ? await extractFromPdf(filePath)
      : await extractFromImage(filePath, mimeType || "image/jpeg");

    const normalized = normalizeInvoiceData(result.raw);

    if (isUnreadable(normalized)) {
      throw new Error(
        "No se pudo leer la factura: la imagen no es legible o no corresponde a una factura o recibo. Intenta con una foto más nítida y bien iluminada."
      );
    }

    await auditService.record({
      user: meta.userId || null,
      action: "vision.factura_leida",
      resource: "VisionScan",
      resourceId: meta.scanId || null,
      status: "success",
      metadata: {
        provider: result.provider,
        model: result.model,
        mode: result.mode,
        confianza: normalized.confianza,
        durationMs: Date.now() - startedAt,
      },
      ip: meta.ip || "",
    });

    return {
      ...normalized,
      provider: result.provider,
      model: result.model,
      mode: result.mode,
    };
  } catch (error) {
    await auditService.record({
      user: meta.userId || null,
      action: "vision.factura_leida",
      resource: "VisionScan",
      resourceId: meta.scanId || null,
      status: "error",
      metadata: {
        error: error.message,
        durationMs: Date.now() - startedAt,
      },
      ip: meta.ip || "",
    });
    throw error;
  }
}

module.exports = {
  REQUIRED_FIELDS,
  SYSTEM_PROMPT,
  parseAmount,
  normalizeDate,
  normalizeConfidence,
  normalizeInvoiceData,
  needsReview,
  isUnreadable,
  getVisionProviderOrder,
  extractInvoice,
};
