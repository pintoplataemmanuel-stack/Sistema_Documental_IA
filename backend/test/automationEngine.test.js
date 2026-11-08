const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAutomationEngine,
  withTimeout,
} = require("../src/automation/engine");

function createFakeRunModel() {
  const docs = [];

  function wrap(value) {
    const chain = {
      lean: () => chain,
      exec: async () => value,
    };
    return chain;
  }

  return {
    docs,
    async create(data) {
      const doc = {
        _id: `run-${docs.length + 1}`,
        logs: [],
        ...data,
      };
      docs.push(doc);
      return doc;
    },
    findOne(query) {
      const found =
        docs.find((doc) =>
          Object.entries(query).every(([key, value]) => doc[key] === value)
        ) || null;
      return wrap(found);
    },
    updateOne(query, update) {
      const doc = docs.find((item) => item._id === query._id);
      if (doc) {
        if (update.$set) Object.assign(doc, update.$set);
        if (update.$push && update.$push.logs) {
          doc.logs.push(update.$push.logs);
        }
      }
      return { exec: async () => ({ acknowledged: true }) };
    },
  };
}

function createFakeFlowModel(initial = []) {
  const docs = [...initial];

  return {
    docs,
    findOne(query) {
      const found = docs.find((doc) => doc.key === query.key) || null;
      const chain = {
        select: () => chain,
        lean: () => chain,
        exec: async () => found,
      };
      return chain;
    },
    updateOne(query, update) {
      let doc = docs.find((item) => item.key === query.key);
      if (!doc) {
        doc = { key: query.key, ...(update.$setOnInsert || {}) };
        docs.push(doc);
      }
      Object.assign(doc, update.$set || {});
      return { exec: async () => ({ acknowledged: true }) };
    },
  };
}

function quietLogger() {
  return { info() {}, warn() {}, error() {} };
}

test("withTimeout rechaza cuando el flujo se cuelga", async () => {
  await assert.rejects(
    () => withTimeout(new Promise(() => {}), 20, "prueba"),
    /Timeout de prueba/
  );
});

test("un flujo exitoso se registra como completed", async () => {
  const RunModel = createFakeRunModel();
  const audits = [];
  const engine = createAutomationEngine({
    RunModel,
    logger: quietLogger(),
    auditService: {
      async record(entry) {
        audits.push(entry);
      },
    },
  });

  engine.register({
    key: "flujo-ok",
    name: "Flujo OK",
    event: "test.ok",
    maxRetries: 2,
    retryDelayMs: 1,
    async run() {
      return { ok: true };
    },
  });

  const result = await engine.run(
    "flujo-ok",
    { documentId: "doc-1" },
    { userId: "user-1" }
  );

  assert.equal(result.status, "completed");
  assert.equal(result.attempts, 1);
  assert.deepEqual(result.output, { ok: true });
  assert.equal(RunModel.docs.length, 1);
  assert.equal(RunModel.docs[0].status, "completed");
  assert.equal(audits.length, 1);
  assert.equal(audits[0].status, "success");
  assert.equal(audits[0].action, "automation.flujo-ok");
});

test("el motor reintenta y termina completed si un intento posterior funciona", async () => {
  const RunModel = createFakeRunModel();
  let calls = 0;

  const engine = createAutomationEngine({
    RunModel,
    logger: quietLogger(),
  });

  engine.register({
    key: "flujo-reintento",
    name: "Flujo con reintento",
    event: "test.retry",
    maxRetries: 2,
    retryDelayMs: 1,
    async run() {
      calls += 1;
      if (calls < 3) throw new Error("fallo temporal");
      return { calls };
    },
  });

  const result = await engine.run("flujo-reintento", {});

  assert.equal(result.status, "completed");
  assert.equal(result.attempts, 3);
  assert.equal(calls, 3);
  assert.equal(RunModel.docs[0].status, "completed");
  assert.equal(
    RunModel.docs[0].logs.filter((log) => log.level === "warn").length,
    2
  );
});

test("un flujo que siempre falla termina failed y deja auditoría de error", async () => {
  const RunModel = createFakeRunModel();
  const audits = [];

  const engine = createAutomationEngine({
    RunModel,
    logger: quietLogger(),
    auditService: {
      async record(entry) {
        audits.push(entry);
      },
    },
  });

  engine.register({
    key: "flujo-falla",
    name: "Flujo que falla",
    event: "test.fail",
    maxRetries: 2,
    retryDelayMs: 1,
    async run() {
      throw new Error("fallo permanente");
    },
  });

  const result = await engine.run("flujo-falla", {});

  assert.equal(result.status, "failed");
  assert.equal(result.attempts, 3);
  assert.match(result.error, /fallo permanente/);
  assert.equal(RunModel.docs[0].status, "failed");
  assert.equal(audits.length, 1);
  assert.equal(audits[0].status, "error");
});

test("la idempotencia evita duplicar una ejecución completada", async () => {
  const RunModel = createFakeRunModel();
  let calls = 0;

  const engine = createAutomationEngine({
    RunModel,
    logger: quietLogger(),
  });

  engine.register({
    key: "flujo-idempotente",
    name: "Flujo idempotente",
    event: "test.idempotent",
    idempotencyKey: () => "misma-clave",
    async run() {
      calls += 1;
      return { calls };
    },
  });

  const first = await engine.run("flujo-idempotente", {});
  const second = await engine.run("flujo-idempotente", {});

  assert.equal(first.status, "completed");
  assert.equal(second.status, "completed");
  assert.equal(second.skipped, true);
  assert.equal(second.reason, "idempotent");
  assert.equal(calls, 1);
  assert.equal(RunModel.docs.length, 1);
});

test("un flujo deshabilitado en la base de datos se omite", async () => {
  const FlowModel = createFakeFlowModel([
    { key: "flujo-deshabilitado", enabled: false },
  ]);
  const RunModel = createFakeRunModel();

  const engine = createAutomationEngine({
    FlowModel,
    RunModel,
    logger: quietLogger(),
  });

  engine.register({
    key: "flujo-deshabilitado",
    name: "Flujo deshabilitado",
    event: "test.disabled",
    async run() {
      return { ok: true };
    },
  });

  const result = await engine.run("flujo-deshabilitado", {});
  assert.equal(result.skipped, true);
  assert.equal(result.reason, "disabled");
  assert.equal(RunModel.docs.length, 0);
});

test("emit ejecuta solo los flujos del evento y aísla los fallos", async () => {
  const RunModel = createFakeRunModel();
  const engine = createAutomationEngine({
    RunModel,
    logger: quietLogger(),
  });

  engine.registerMany([
    {
      key: "flujo-a",
      name: "Flujo A",
      event: "documento.creado",
      maxRetries: 0,
      async run() {
        return { a: true };
      },
    },
    {
      key: "flujo-b",
      name: "Flujo B",
      event: "documento.creado",
      maxRetries: 0,
      async run() {
        throw new Error("B falló");
      },
    },
    {
      key: "flujo-c",
      name: "Flujo C",
      event: "otro.evento",
      async run() {
        return { c: true };
      },
    },
  ]);

  const results = await engine.emit("documento.creado", {});

  assert.equal(results.length, 2);
  assert.equal(results.find((r) => r.flowKey === "flujo-a").status, "completed");
  assert.equal(results.find((r) => r.flowKey === "flujo-b").status, "failed");
  assert.equal(results.some((r) => r.flowKey === "flujo-c"), false);
});

test("syncFlowDefinitions conserva el enabled persistido", async () => {
  const FlowModel = createFakeFlowModel([
    { key: "flujo-sync", enabled: false, name: "viejo" },
  ]);
  const engine = createAutomationEngine({
    FlowModel,
    logger: quietLogger(),
  });

  engine.register({
    key: "flujo-sync",
    name: "Flujo sincronizado",
    event: "test.sync",
    async run() {
      return {};
    },
  });

  const result = await engine.syncFlowDefinitions();
  assert.equal(result.synced, 1);
  assert.equal(FlowModel.docs[0].enabled, false);
  assert.equal(FlowModel.docs[0].name, "Flujo sincronizado");
});
