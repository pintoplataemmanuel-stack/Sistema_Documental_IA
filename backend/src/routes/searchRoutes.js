const express = require("express");
const router = express.Router();
const { search, chat } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

// Todas las rutas requieren autenticación
router.use(protect);

router.post("/search", search);
router.post("/chat", chat);

module.exports = router;