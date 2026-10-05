const Document = require("../models/Document");
const User = require("../models/User");
const { n8n } = require("../config/env");

const N8N_WEBHOOK_URL = n8n.webhookUrl;
const N8N_API_KEY = n8n.apiKey;
// Timeout de la petición HTTP al webhook (ms). No debe retrasar el pipeline.
const WEBHOOK_TIMEOUT_MS = 10000;

/**
 * Notifica a n8n que un documento terminó de procesarse (éxito o error).
 *
 * La petición se hace con fetch (Node >= 18). Si el webhook no responde o
 * falla, el error SOLO se registra en consola: nunca se lanza, por lo que no
 * interrumpe ni cambia el resultado del procesamiento del documento.
 *
 * @param {string} documentId
 * @returns {Promise<void>}
 */
async function notifyDocumentProcessed(documentId) {
  try {
    const document = await Document.findById(documentId).lean().exec();
    if (!document) return;

    const user = await User.findById(document.owner).select("email").lean().exec();

    const payload = {
      userId: document.owner ? document.owner.toString() : "",
      userEmail: user && user.email ? user.email : "",
      fileName: document.originalName || document.filename || "",
      status: document.status || "",
      category: document.category || "",
      summary: document.summary || "",
      errorMessage: document.processingError || "",
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": N8N_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        // El webhook rechazó la petición (4xx/5xx): se registra pero no rompe nada.
        console.warn(
          `[webhook] n8n respondió ${response.status} para el documento ${documentId}`
        );
      } else {
        console.log(
          `[webhook] Notificación enviada a n8n (documento ${documentId}, status ${payload.status})`
        );
      }
    } catch (err) {
      console.warn(
        `[webhook] No se pudo notificar a n8n (documento ${documentId}):`,
        err.message
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Error al leer la BD o construir el payload: no debe afectar el procesamiento.
    console.warn(
      `[webhook] Error interno preparando notificación (documento ${documentId}):`,
      err.message
    );
  }
}

module.exports = { notifyDocumentProcessed };