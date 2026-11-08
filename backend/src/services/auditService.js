const AuditLog = require("../models/AuditLog");

/**
 * Registra una acción de auditoría.
 *
 * La auditoría no debe tumbar el proceso que la origina: si la escritura falla
 * se informa por consola, pero la ejecución principal continúa. El error queda
 * visible en los logs del servidor para poder corregirlo.
 *
 * @param {object} entry
 * @param {string|object|null} [entry.user]
 * @param {string} entry.action
 * @param {string} [entry.resource]
 * @param {string|object|null} [entry.resourceId]
 * @param {"success"|"error"|"denied"} [entry.status]
 * @param {object} [entry.metadata]
 * @param {string} [entry.ip]
 * @returns {Promise<object|null>}
 */
async function record({
  user = null,
  action,
  resource = "",
  resourceId = null,
  status = "success",
  metadata = {},
  ip = "",
} = {}) {
  if (!action) {
    console.warn("[audit] Se intentó registrar una acción sin nombre.");
    return null;
  }

  try {
    return await AuditLog.create({
      user: user || null,
      action,
      resource,
      resourceId: resourceId || null,
      status,
      metadata,
      ip,
    });
  } catch (error) {
    console.error(`[audit] No se pudo registrar "${action}":`, error.message);
    return null;
  }
}

/**
 * Lista registros de auditoría con filtros opcionales.
 * Pensado para el rol admin.
 */
async function list({ action, status, userId, limit = 100, page = 1 } = {}) {
  const query = {};
  if (action) query.action = action;
  if (status) query.status = status;
  if (userId) query.user = userId;

  const max = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const currentPage = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * max)
      .limit(max)
      .populate("user", "name email role")
      .lean()
      .exec(),
    AuditLog.countDocuments(query),
  ]);

  return { items, total, page: currentPage, limit: max };
}

module.exports = { record, list };
