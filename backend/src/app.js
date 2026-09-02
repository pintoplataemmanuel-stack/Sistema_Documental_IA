const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const repositoryRoutes = require("./routes/repositoryRoutes");
const fileRoutes = require("./routes/fileRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos subidos expuestos para descarga
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/repos", repositoryRoutes);
app.use("/api/files", fileRoutes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
