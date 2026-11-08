const express = require("express");
const {
  listNotifications,
  markAsRead,
  markAllAsRead,
  unreadCount,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

module.exports = router;
