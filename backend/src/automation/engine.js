const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_TIMEOUT_MS = 15000;

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta una promesa con límite de tiempo. Si el flujo se cuelga, se rechaza
 * para que el motor pueda reintentar o marcar la ejecución como fallida.
 */
function withTimeout(promise, ms, label = "flujo") {
  const timeoutMs = Math.max(Number(ms) || DEFAULT_TIMEOUT_MS, 1);
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout de ${label} después de ${timeoutMs} ms`)),
      timeoutMs
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function validateFlow(flow) {
  if (!flow || typeof flow !== "object") {
    throw new Error("La definición del flujo es inválida.");
  }
  if (!flow.key || typeof flow.key !== "string") {
    throw new Error("El flujo debe tener un key único.");
  }
  if (!flow.event || typeof flow.event !== "string") {
    throw new Error(`El flujo ${flow.key} debe declarar un evento.`);
  }
  if (typeof flow.run !== "function") {
    throw new Error(`El flujo ${flow.key} debe implementar run().`);
  }
}

/**
 * Crea una instancia del motor de automatización.
 *
 * Se inyectan los modelos y servicios para poder probar el motor sin MongoDB.
 * En producción se usa la instancia exportada por backend/src/automation.
 */
function createAutomationEngine({
  FlowModel = null,
  RunModel = null,
  auditService = null,
  logger = console,
  sleepFn = defaultSleep,
} = {}) {
  const registry = new Map();

  function register(flow) {
    validateFlow(flow);
    if (registry.has(flow.key)) {
      throw new Error(`Ya existe un flujo registrado con key "${flow.key}".`);
    }
    registry.set(flow.key, {
      enabled: true,
      description: "",
      steps: [],
      maxRetries: DEFAULT_MAX_RETRIES,
      retryDelayMs: DEFAULT_RETRY_DELAY_MS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      version: 1,
      ...flow,
    });
    return registry.get(flow.key);
  }

  function registerMany(flows = []) {
    flows.forEach(register);
    return registry.size;
  }

  function listFlows() {
    return [...registry.values()].map((flow) => ({
      key: flow.key,
      name: flow.name,
      description: flow.description,
      event: flow.event,
      enabled: flow.enabled !== false,
      steps: flow.steps,
      maxRetries: flow.maxRetries,
      retryDelayMs: flow.retryDelayMs,
      timeoutMs: flow.timeoutMs,
      version: flow.version,
    }));
  }

  function getFlow(key) {
    return registry.get(key) || null;
  }

  /**
   * Sincroniza el inventario ejecutable con la colección automationflows.
   * No reactiva un flujo que un administrador haya deshabilitado.
   */
  async function syncFlowDefinitions() {
    if (!FlowModel) return { synced: 0 };

    let synced = 0;
    for (const flow of registry.values()) {
      await FlowModel.updateOne(
        { key: flow.key },
        {
          $set: {
            name: flow.name,
            description: flow.description,
            event: flow.event,
            steps: flow.steps,
            maxRetries: flow.maxRetries,
            retryDelayMs: flow.retryDelayMs,
            timeoutMs: flow.timeoutMs,
            version: flow.version,
          },
          $setOnInsert: {
            enabled: flow.enabled !== false,
          },
        },
        { upsert: true }
      ).exec();
      synced += 1;
    }

    logger.info?.(`[automation] ${synced} flujo(s) sincronizado(s).`);
    return { synced };
  }

  async function isDisabled(flow) {
    if (flow.enabled === false) return true;
    if (!FlowModel) return false;

    try {
      const persisted = await FlowModel.findOne({ key: flow.key })
        .select("enabled")
        .lean()
        .exec();
      return Boolean(persisted && persisted.enabled === false);
    } catch (error) {
      logger.warn?.(
        `[automation] No se pudo leer el estado de ${flow.key}: ${error.message}`
      );
      return false;
    }
  }

  async function findCompletedRun(idempotencyKey) {
    if (!RunModel || !idempotencyKey) return null;
    return RunModel.findOne({
      idempotencyKey,
      status: "completed",
    })
      .lean()
      .exec();
  }

  /**
   * Ejecuta un flujo con reintentos y registro de cada intento.
   *
   * @returns {Promise<object>} Resultado de la ejecución. Nunca lanza hacia el
   * llamador cuando el flujo falla: devuelve status "failed" y el error.
   */
  async function run(flowOrKey, payload = {}, context = {}, options = {}) {
    const flow =
      typeof flowOrKey === "string" ? registry.get(flowOrKey) : flowOrKey;

    if (!flow) {
      throw new Error(`Flujo no registrado: ${String(flowOrKey)}`);
    }

    if (!options.force && (await isDisabled(flow))) {
      return {
        skipped: true,
        reason: "disabled",
        flowKey: flow.key,
        status: "skipped",
      };
    }

    const maxAttempts = Math.max(
      1,
      Number(flow.maxRetries ?? DEFAULT_MAX_RETRIES) + 1
    );
    const timeoutMs = Number(flow.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const retryDelayMs = Number(flow.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
    const idempotencyKey =
      (typeof flow.idempotencyKey === "function"
        ? flow.idempotencyKey(payload)
        : payload.idempotencyKey) || undefined;

    const existing = await findCompletedRun(idempotencyKey);
    if (existing) {
      return {
        skipped: true,
        reason: "idempotent",
        flowKey: flow.key,
        runId: existing._id ? existing._id.toString() : undefined,
        status: "completed",
      };
    }

    const startedAt = new Date();
    let runDoc = null;

    if (RunModel) {
      try {
        runDoc = await RunModel.create({
          flowKey: flow.key,
          flowName: flow.name,
          event: flow.event,
          status: "running",
          attempts: 1,
          maxAttempts,
          input: payload,
          triggeredBy: context.userId || payload.userId || null,
          idempotencyKey,
          startedAt,
        });
      } catch (error) {
        // Si choca el índice único de idempotencia, otra ejecución ya terminó.
        if (error && error.code === 11000) {
          const completed = await findCompletedRun(idempotencyKey);
          return {
            skipped: true,
            reason: "idempotent",
            flowKey: flow.key,
            runId: completed?._id ? completed._id.toString() : undefined,
            status: "completed",
          };
        }
        logger.error?.(
          `[automation:${flow.key}] No se pudo crear el registro de ejecución:`,
          error.message
        );
      }
    }

    const runId = runDoc && runDoc._id ? runDoc._id.toString() : undefined;
    let currentAttempt = 1;

    async function writeLog(level, message) {
      const entry = {
        attempt: currentAttempt,
        level,
        message,
        at: new Date(),
      };

      if (runDoc) {
        try {
          await RunModel.updateOne(
            { _id: runDoc._id },
            { $push: { logs: entry } }
          ).exec();
        } catch (error) {
          logger.warn?.(
            `[automation:${flow.key}] No se pudo guardar el log: ${error.message}`
          );
        }
      }

      const method =
        level === "error" ? "error" : level === "warn" ? "warn" : "info";
      logger[method]?.(`[automation:${flow.key}] ${message}`);
    }

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      currentAttempt = attempt;

      try {
        if (runDoc && attempt > 1) {
          await RunModel.updateOne(
            { _id: runDoc._id },
            { $set: { status: "running", attempts: attempt } }
          ).exec();
        }

        const output = await withTimeout(
          Promise.resolve().then(() =>
            flow.run({
              payload,
              attempt,
              runId,
              context,
              log: writeLog,
            })
          ),
          timeoutMs,
          flow.key
        );

        const finishedAt = new Date();
        if (runDoc) {
          await RunModel.updateOne(
            { _id: runDoc._id },
            {
              $set: {
                status: "completed",
                attempts: attempt,
                output: output === undefined ? {} : output,
                error: "",
                finishedAt,
                durationMs: finishedAt.getTime() - startedAt.getTime(),
              },
            }
          ).exec();
        }

        if (auditService) {
          await auditService.record({
            user: context.userId || payload.userId || null,
            action: `automation.${flow.key}`,
            resource: "AutomationRun",
            resourceId: runDoc ? runDoc._id : null,
            status: "success",
            metadata: {
              event: flow.event,
              attempts: attempt,
              durationMs: finishedAt.getTime() - startedAt.getTime(),
            },
          });
        }

        return {
          skipped: false,
          flowKey: flow.key,
          runId,
          status: "completed",
          attempts: attempt,
          output: output === undefined ? {} : output,
        };
      } catch (error) {
        lastError = error;
        await writeLog(
          "warn",
          `Intento ${attempt}/${maxAttempts} falló: ${error.message}`
        );

        if (attempt < maxAttempts) {
          if (runDoc) {
            await RunModel.updateOne(
              { _id: runDoc._id },
              {
                $set: {
                  status: "retrying",
                  attempts: attempt,
                  error: error.message,
                },
              }
            ).exec();
          }
          await sleepFn(retryDelayMs * attempt);
        }
      }
    }

    const finishedAt = new Date();
    const errorMessage = lastError ? lastError.message : "Error desconocido";

    if (runDoc) {
      await RunModel.updateOne(
        { _id: runDoc._id },
        {
          $set: {
            status: "failed",
            attempts: maxAttempts,
            error: errorMessage,
            finishedAt,
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          },
        }
      ).exec();
    }

    if (auditService) {
      await auditService.record({
        user: context.userId || payload.userId || null,
        action: `automation.${flow.key}`,
        resource: "AutomationRun",
        resourceId: runDoc ? runDoc._id : null,
        status: "error",
        metadata: {
          event: flow.event,
          attempts: maxAttempts,
          error: errorMessage,
        },
      });
    }

    await writeLog("error", `Ejecución fallida: ${errorMessage}`);

    return {
      skipped: false,
      flowKey: flow.key,
      runId,
      status: "failed",
      attempts: maxAttempts,
      error: errorMessage,
    };
  }

  /**
   * Dispara todos los flujos habilitados para un evento.
   * Un fallo en un flujo no impide que se ejecuten los demás.
   */
  async function emit(event, payload = {}, context = {}) {
    const matching = [...registry.values()].filter(
      (flow) => flow.event === event && flow.enabled !== false
    );

    const results = [];
    for (const flow of matching) {
      try {
        results.push(await run(flow, payload, context));
      } catch (error) {
        logger.error?.(
          `[automation:${flow.key}] Error inesperado al disparar ${event}:`,
          error.message
        );
        results.push({
          skipped: false,
          flowKey: flow.key,
          status: "failed",
          error: error.message,
        });
      }
    }

    return results;
  }

  return {
    register,
    registerMany,
    listFlows,
    getFlow,
    syncFlowDefinitions,
    emit,
    run,
    // Expuesto para pruebas unitarias.
    _withTimeout: withTimeout,
  };
}

module.exports = {
  createAutomationEngine,
  withTimeout,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
};
