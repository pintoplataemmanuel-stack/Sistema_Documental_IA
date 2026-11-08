const test = require("node:test");
const assert = require("node:assert/strict");
const {
  documentProcessedFlow,
} = require("../src/automation/flows/documentProcessedFlow");
const {
  documentFailedFlow,
} = require("../src/automation/flows/documentFailedFlow");

/**
 * Crea servicios falsos de notificación y auditoría para probar los flujos sin
 * MongoDB.
 */
function createFakes() {
  const notifications = [];
  const audits = [];

  return {
    notifications,
    audits,
    notificationService: {
      async createNotification(data) {
        const notification = { _id: `notif-${notifications.length + 1}`, ...data };
        notifications.push(notification);
        return notification;
      },
    },
    auditService: {
      async record(entry) {
        audits.push(entry);
        return entry;
      },
    },
  };
}

function fakeDocument(overrides = {}) {
  return {
    _id: "doc-1",
    owner: "user-1",
    repository: "repo-1",
    originalName: "factura-001.pdf",
    category: "Factura",
    processingError: "",
    ...overrides,
  };
}

test("F1 notifica el documento procesado con los datos del documento", async () => {
  const fakes = createFakes();
  const flow = documentProcessedFlow({
    notificationService: fakes.notificationService,
    auditService: fakes.auditService,
    findDocument: async () => fakeDocument(),
  });

  const result = await flow.run({
    payload: { documentId: "doc-1", userId: "user-1" },
    log: () => {},
  });

  assert.equal(fakes.notifications.length, 1);
  const notification = fakes.notifications[0];
  assert.equal(notification.userId, "user-1");
  assert.equal(notification.type, "success");
  assert.match(notification.message, /factura-001\.pdf/);
  assert.match(notification.message, /Factura/);
  assert.equal(notification.metadata.repositoryId, "repo-1");

  assert.equal(fakes.audits.length, 1);
  assert.equal(fakes.audits[0].action, "automation.documento-procesado");
  assert.equal(fakes.audits[0].status, "success");
  assert.equal(result.notificationId, "notif-1");
});

test("F1 falla si no puede determinar el destinatario", async () => {
  const fakes = createFakes();
  const flow = documentProcessedFlow({
    notificationService: fakes.notificationService,
    auditService: fakes.auditService,
    findDocument: async () => null,
  });

  await assert.rejects(
    () => flow.run({ payload: { documentId: "doc-1" }, log: () => {} }),
    /No se pudo determinar el usuario destinatario/
  );
  assert.equal(fakes.notifications.length, 0);
});

test("F1-E alerta el error con el mensaje recibido", async () => {
  const fakes = createFakes();
  const flow = documentFailedFlow({
    notificationService: fakes.notificationService,
    auditService: fakes.auditService,
    findDocument: async () => fakeDocument({ owner: "user-2" }),
  });

  const result = await flow.run({
    payload: {
      documentId: "doc-1",
      userId: "user-2",
      errorMessage: "La cuota de IA se agotó",
    },
    log: () => {},
  });

  assert.equal(fakes.notifications.length, 1);
  const notification = fakes.notifications[0];
  assert.equal(notification.userId, "user-2");
  assert.equal(notification.type, "error");
  assert.match(notification.message, /cuota de IA se agotó/);
  assert.equal(notification.metadata.errorMessage, "La cuota de IA se agotó");

  assert.equal(fakes.audits.length, 1);
  assert.equal(fakes.audits[0].action, "automation.documento-error");
  assert.equal(fakes.audits[0].status, "error");
  assert.equal(result.errorMessage, "La cuota de IA se agotó");
});

test("F1-E usa el error guardado en el documento si no llega en el payload", async () => {
  const fakes = createFakes();
  const flow = documentFailedFlow({
    notificationService: fakes.notificationService,
    auditService: fakes.auditService,
    findDocument: async () =>
      fakeDocument({ processingError: "PDF ilegible" }),
  });

  const result = await flow.run({
    payload: { documentId: "doc-1", userId: "user-1" },
    log: () => {},
  });

  assert.match(fakes.notifications[0].message, /PDF ilegible/);
  assert.equal(result.errorMessage, "PDF ilegible");
});
