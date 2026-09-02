const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwt: jwtConfig } = require("../config/env");

async function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, jwtConfig.secret);
      // Excluye password del usuario cargado
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "Usuario no encontrado" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No autorizado, token faltante" });
  }
}

module.exports = { protect };