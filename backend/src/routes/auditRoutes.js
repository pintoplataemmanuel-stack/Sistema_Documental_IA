const express = require("express");
const { listAuditLogs } = require("../controllers/auditController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/", listAuditLogs);

module.exports = router;
