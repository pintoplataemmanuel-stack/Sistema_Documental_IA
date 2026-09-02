// Middleware para validar roles permitidos.
// Uso: authorize("admin") o authorize("admin", "editor")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "No tienes permisos para esta acción" });
    }
    return next();
  };
}

module.exports = { authorize };