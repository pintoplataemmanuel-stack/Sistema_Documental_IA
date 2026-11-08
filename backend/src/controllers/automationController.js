const AutomationFlow = require("../models/AutomationFlow");
const AutomationRun = require("../models/AutomationRun");
const { engine } = require("../automation");

/**
 * GET /api/automation/flows
 * Inventario de flujos registrados en código + estado persistido + estadísticas.
 */
async function listFlows(req, res, next) {
  try {
    const flows = engine.listFlows();
    const keys = flows.map((flow) => flow.key);

    const persisted = await AutomationFlow.find({ key: { $in: keys } })
      .lean()
      .exec();
    const persistedByKey = new Map(persisted.map((flow) => [flow.key, flow]));

    const statsMatch = { flowKey: { $in: keys } };
    if (req.user.role !== "admin") {
      statsMatch.triggeredBy = req.user._id;
    }

    const stats = await AutomationRun.aggregate([
      {
        $match: statsMatch,
      },
      {
        $group: {
          _id: { flowKey: "$flowKey", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsByKey = {};
    for (const item of stats) {
      const key = item._id.flowKey;
      if (!statsByKey[key]) {
        statsByKey[key] = {
          running: 0,
          retrying: 0,
          completed: 0,
          failed: 0,
          skipped: 0,
          total: 0,
        };
      }
      statsByKey[key][item._id.status] = item.count;
      statsByKey[key].total += item.count;
    }

    return res.json({
      flows: flows.map((flow) => {
        const stored = persistedByKey.get(flow.key);
        return {
          ...flow,
          enabled: stored ? stored.enabled !== false : flow.enabled,
          createdAt: stored ? stored.createdAt : null,
          updatedAt: stored ? stored.updatedAt : null,
          stats: statsByKey[flow.key] || {
            running: 0,
            retrying: 0,
            completed: 0,
            failed: 0,
            skipped: 0,
            total: 0,
          },
        };
      }),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/automation/runs
 * Historial de ejecuciones. El admin ve todas; el usuario ve las suyas.
 */
async function listRuns(req, res, next) {
  try {
    const { flowKey, status, limit = 50, page = 1 } = req.query;
    const query = {};

    if (flowKey) query.flowKey = flowKey;
    if (status) query.status = status;
    if (req.user.role !== "admin") {
      query.triggeredBy = req.user._id;
    }

    const max = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const currentPage = Math.max(Number(page) || 1, 1);

    const [items, total] = await Promise.all([
      AutomationRun.find(query)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * max)
        .limit(max)
        .populate("triggeredBy", "name email role")
        .lean()
        .exec(),
      AutomationRun.countDocuments(query),
    ]);

    return res.json({ items, total, page: currentPage, limit: max });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/automation/runs/:id
 * Detalle de una ejecución con sus logs.
 */
async function getRun(req, res, next) {
  try {
    const run = await AutomationRun.findById(req.params.id)
      .populate("triggeredBy", "name email role")
      .lean()
      .exec();

    if (!run) {
      return res.status(404).json({ message: "Ejecución no encontrada" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      run.triggeredBy &&
      run.triggeredBy._id &&
      run.triggeredBy._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "No tienes acceso a esta ejecución" });
    }

    return res.json(run);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/automation/flows/:key/run
 * Ejecuta un flujo manualmente (solo admin). Sirve para demostrar el flujo en
 * vivo durante la revisión o la sustentación.
 */
async function triggerFlow(req, res, next) {
  try {
    const flow = engine.getFlow(req.params.key);
    if (!flow) {
      return res.status(404).json({ message: "Flujo no encontrado" });
    }

    const payload = {
      ...(req.body || {}),
      userId: (req.body && req.body.userId) || req.user._id,
    };

    const result = await engine.run(
      req.params.key,
      payload,
      { userId: req.user._id, ip: req.ip },
      { force: true }
    );

    const statusCode = result.status === "failed" ? 502 : 200;
    return res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listFlows, listRuns, getRun, triggerFlow };
