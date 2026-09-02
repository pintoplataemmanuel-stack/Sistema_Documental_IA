const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");

/**
 * POST /api/auth/register
 * Crea un usuario nuevo y devuelve token + datos del usuario.
 */
async function registerUser(req, res, next) {
  try {
    const { name, email, password, role, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Los campos name, email y password son obligatorios",
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    const user = await User.create({ name, email, password, role, company });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Autentica y devuelve token + datos del usuario.
 */
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Se requieren correo y contraseña" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ message: "Correo o contraseña inválidos" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Usuario desactivado" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/profile
 * Devuelve el perfil del usuario autenticado.
 */
async function getProfile(req, res) {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    company: req.user.company,
    createdAt: req.user.createdAt,
  });
}

module.exports = { registerUser, loginUser, getProfile };