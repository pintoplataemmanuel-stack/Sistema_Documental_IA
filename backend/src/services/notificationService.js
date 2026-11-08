const Notification = require("../models/Notification");

/**
 * Crea una notificación interna para un usuario.
 *
 * @param {object} data
 * @param {string|object} data.userId
 * @param {"info"|"success"|"warning"|"error"} [data.type]
 * @param {string} data.title
 * @param {string} data.message
 * @param {{kind?: string, id?: string|object|null}} [data.resource]
 * @param {object} [data.metadata]
 * @returns {Promise<object>}
 */
async function createNotification({
  userId,
  type = "info",
  title,
  message,
  resource = {},
  metadata = {},
} = {}) {
  if (!userId) {
    throw new Error("La notificación requiere un usuario destinatario.");
  }
  if (!title || !message) {
    throw new Error("La notificación requiere título y mensaje.");
  }

  return Notification.create({
    user: userId,
    type,
    title,
    message,
    resource: {
      kind: resource.kind || "",
      id: resource.id || null,
    },
    metadata,
  });
}

/**
 * Lista las notificaciones del usuario autenticado.
 */
async function listNotifications({
  userId,
  unreadOnly = false,
  limit = 50,
  page = 1,
} = {}) {
  if (!userId) throw new Error("Falta el usuario.");

  const query = { user: userId };
  if (unreadOnly) query.read = false;

  const max = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const currentPage = Math.max(Number(page) || 1, 1);

  const [items, total, unread] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * max)
      .limit(max)
      .lean()
      .exec(),
    Notification.countDocuments(query),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return { items, total, unread, page: currentPage, limit: max };
}

/**
 * Marca una notificación como leída, solo si pertenece al usuario.
 */
async function markAsRead({ userId, notificationId } = {}) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  ).exec();
}

/**
 * Marca todas las notificaciones del usuario como leídas.
 */
async function markAllAsRead({ userId } = {}) {
  const result = await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  ).exec();
  return result.modifiedCount || 0;
}

async function countUnread({ userId } = {}) {
  return Notification.countDocuments({ user: userId, read: false });
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
  countUnread,
};
