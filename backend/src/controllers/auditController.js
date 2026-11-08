const auditService = require("../services/auditService");

/**
 * GET /api/audit
 * Registro de auditoría de acciones de IA y automatización (solo admin).
 */
async function listAuditLogs(req, res, next) {
  try {
    const { action, status, userId, limit, page } = req.query;
    const data = await auditService.list({
      action,
      status,
      userId,
      limit,
      page,
    });
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { listAuditLogs };
