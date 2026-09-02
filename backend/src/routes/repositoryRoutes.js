const express = require("express");
const router = express.Router();
const {
  createRepository,
  getRepositories,
  getRepositoryById,
  updateRepository,
  deleteRepository,
} = require("../controllers/repositoryController");
const { protect } = require("../middleware/authMiddleware");

// Todas las rutas de repositorio requieren autenticación
router.use(protect);

router.post("/", createRepository);
router.get("/", getRepositories);
router.get("/:id", getRepositoryById);
router.put("/:id", updateRepository);
router.delete("/:id", deleteRepository);

module.exports = router;