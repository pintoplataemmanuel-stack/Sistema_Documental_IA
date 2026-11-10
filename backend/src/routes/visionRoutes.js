const express = require("express");
const router = express.Router();
const {
  scanInvoice,
  listScans,
  getScan,
  confirmScan,
  deleteScan,
  listInvoices,
} = require("../controllers/visionController");
const { protect } = require("../middleware/authMiddleware");
const { visionUpload } = require("../middleware/visionUploadMiddleware");

// Todas las rutas requieren autenticación.
router.use(protect);

router.post("/scan", visionUpload.single("file"), scanInvoice);
router.get("/scans", listScans);
router.get("/invoices", listInvoices);
router.get("/scans/:id", getScan);
router.post("/scans/:id/confirm", confirmScan);
router.delete("/scans/:id", deleteScan);

module.exports = router;
