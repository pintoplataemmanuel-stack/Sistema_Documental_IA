const express = require("express");
const router = express.Router();
const {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile,
} = require("../controllers/fileController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");
const { processFile } = require("../controllers/aiController");

// Todas las rutas requieren autenticación
router.use(protect);

router.post("/upload", upload.single("file"), uploadFile);
router.post("/:id/process", processFile);
router.get("/", getFiles);
router.get("/:id", getFileById);
router.get("/:id/download", downloadFile);
router.delete("/:id", deleteFile);

module.exports = router;