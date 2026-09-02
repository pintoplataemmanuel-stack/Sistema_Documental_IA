// Middleware de manejo de errores centralizado

function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Ruta no encontrada: ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  res.status(statusCode).json({
    message: err.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };