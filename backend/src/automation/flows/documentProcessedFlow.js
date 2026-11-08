const Document = require("../../models/Document");

/**
 * Flujo F1: notificar al usuario que su documento terminó de procesarse.
 *
 * Reemplaza la rama de éxito del webhook de n8n. Crea una notificación interna
 * y deja un registro de auditoría. Si la notificación falla, el motor reintenta.
 */
function documentProcessedFlow({
  notificationService,
  auditService,
  findDocument,
}) {
  // Inyectable para pruebas; en producción consulta MongoDB.
  const loadDocument =
    findDocument ||
    ((id) => Document.findById(id).lean().exec());

  return {
    key: "documento-procesado",
    name: "Notificar documento procesado",
    description:
      "Crea una notificación interna y un registro de auditoría cuando el pipeline de IA termina correctamente.",
    event: "document.processed",
    steps: ["leer-documento", "crear-notificacion", "registrar-auditoria"],
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 10000,
    idempotencyKey(payload = {}) {
      return (
        payload.idempotencyKey ||
        `document.processed:${payload.documentId || "sin-id"}:${
          payload.processedAt || ""
        }`
      );
    },
    async run({ payload = {}, log }) {
      const document = payload.documentId
        ? await loadDocument(payload.documentId)
        : null;

      const userId = (document && document.owner) || payload.userId;
      if (!userId) {
        throw new Error(
          "No se pudo determinar el usuario destinatario de la notificación."
        );
      }

      const fileName =
        (document && document.originalName) ||
        payload.fileName ||
        "Documento sin nombre";
      const category =
        (document && document.category) || payload.category || "Otro";

      const notification = await notificationService.createNotification({
        userId,
        type: "success",
        title: "Documento procesado",
        message: `"${fileName}" se procesó correctamente y fue clasificado como ${category}.`,
        resource: {
          kind: "Document",
          id: (document && document._id) || payload.documentId,
        },
        metadata: {
          documentId: payload.documentId,
          repositoryId: document && document.repository,
          category,
          status: "completed",
          automation: "documento-procesado",
        },
      });

      log(
        "info",
        `Notificación ${notification._id} creada para el usuario ${userId}.`
      );

      await auditService.record({
        user: userId,
        action: "automation.documento-procesado",
        resource: "Document",
        resourceId: (document && document._id) || payload.documentId,
        status: "success",
        metadata: {
          category,
          notificationId: notification._id.toString(),
        },
      });

      return {
        notificationId: notification._id.toString(),
        userId: userId.toString(),
        category,
        documentId: payload.documentId,
      };
    },
  };
}

module.exports = { documentProcessedFlow };
