const express = require("express");

const authRoutes = require("./authRoutes");
const repositoryRoutes = require("./repositoryRoutes");
const fileRoutes = require("./fileRoutes");
const searchRoutes = require("./searchRoutes");

// Todas las rutas de la API se montan aquí con el prefijo /api (en app.js)
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/repos", repositoryRoutes);
router.use("/files", fileRoutes);
router.use("/search", searchRoutes);

module.exports = router;