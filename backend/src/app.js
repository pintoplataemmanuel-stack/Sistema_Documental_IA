const express = require("express");
const cors = require("cors");
const path = require("path");

const apiRoutes = require("./routes/index");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// CORS: permite peticiones desde el frontend desplegado (Vercel) y de desarrollo local.
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

function isAllowedOrigin(origin) {
  return (
    allowedOrigins.includes(origin) ||
    (typeof origin === "string" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin))
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
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

// Rutas (todas bajo el prefijo /api)
app.use("/api", apiRoutes);

// Manejo de errores
app.use(notFound);
app.use(errorHandler);

module.exports = app;
