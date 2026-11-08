const notificationService = require("../services/notificationService");

/**
 * GET /api/notifications
 * Bandeja de notificaciones del usuario autenticado.
 */
async function listNotifications(req, res, next) {
  try {
    const { unreadOnly, limit, page } = req.query;
    const data = await notificationService.listNotifications({
      userId: req.user._id,
      unreadOnly: String(unreadOnly) === "true",
      limit,
      page,
    });
    return res.json(data);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead({
      userId: req.user._id,
      notificationId: req.params.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificación no encontrada" });
    }

    return res.json(notification);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    const modified = await notificationService.markAllAsRead({
      userId: req.user._id,
    });
    return res.json({ message: "Notificaciones marcadas como leídas", modified });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/notifications/unread-count
 */
async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.countUnread({
      userId: req.user._id,
    });
    return res.json({ count });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
  unreadCount,
};
