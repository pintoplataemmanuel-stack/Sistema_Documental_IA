const Document = require("../../models/Document");

/**
 * Flujo F1-E: alertar al usuario cuando el procesamiento de un documento falla.
 *
 * Reemplaza la rama de error del webhook de n8n. Además de la notificación,
 * deja evidencia del error en la auditoría para que el usuario o el admin
 * puedan reintentar el procesamiento.
 */
function documentFailedFlow({
  notificationService,
  auditService,
  findDocument,
}) {
  // Inyectable para pruebas; en producción consulta MongoDB.
  const loadDocument =
    findDocument ||
    ((id) => Document.findById(id).lean().exec());

  return {
    key: "documento-error",
    name: "Alertar error de procesamiento",
    description:
      "Crea una notificación interna y un registro de auditoría cuando el pipeline de IA falla.",
    event: "document.processing_failed",
    steps: ["leer-documento", "crear-alerta", "registrar-auditoria"],
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 10000,
    idempotencyKey(payload = {}) {
      return (
        payload.idempotencyKey ||
        `document.processing_failed:${payload.documentId || "sin-id"}:${
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
          "No se pudo determinar el usuario destinatario de la alerta."
        );
      }

      const fileName =
        (document && document.originalName) ||
        payload.fileName ||
        "Documento sin nombre";
      const errorMessage =
        payload.errorMessage ||
        (document && document.processingError) ||
        "Error desconocido durante el procesamiento.";

      const notification = await notificationService.createNotification({
        userId,
        type: "error",
        title: "No se pudo procesar el documento",
        message: `"${fileName}" no se pudo procesar. Detalle: ${errorMessage}`,
        resource: {
          kind: "Document",
          id: (document && document._id) || payload.documentId,
        },
        metadata: {
          documentId: payload.documentId,
          repositoryId: document && document.repository,
          status: "error",
          errorMessage,
          automation: "documento-error",
        },
      });

      log(
        "info",
        `Alerta ${notification._id} creada para el usuario ${userId}.`
      );

      await auditService.record({
        user: userId,
        action: "automation.documento-error",
        resource: "Document",
        resourceId: (document && document._id) || payload.documentId,
        status: "error",
        metadata: {
          errorMessage,
          notificationId: notification._id.toString(),
        },
      });

      return {
        notificationId: notification._id.toString(),
        userId: userId.toString(),
        errorMessage,
        documentId: payload.documentId,
      };
    },
  };
}

module.exports = { documentFailedFlow };
