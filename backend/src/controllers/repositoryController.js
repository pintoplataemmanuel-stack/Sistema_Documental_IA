const Repository = require("../models/Repository");
const Document = require("../models/Document");

/**
 * POST /api/repos
 * Crea un repositorio (carpeta) para el usuario autenticado.
 */
async function createRepository(req, res, next) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ message: "El nombre del repositorio es obligatorio" });
    }

    const repository = await Repository.create({
      name,
      description,
      owner: req.user._id,
    });

    return res.status(201).json(repository);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/repos
 * Lista repositorios donde el usuario es propietario o miembro.
 */
async function getRepositories(req, res, next) {
  try {
    const repositories = await Repository.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).sort({ createdAt: -1 });

    return res.json(repositories);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/repos/:id
 * Devuelve un repositorio con su conteo de documentos.
 */
async function getRepositoryById(req, res, next) {
  try {
    const repository = await Repository.findById(req.params.id);

    if (!repository) {
      return res.status(404).json({ message: "Repositorio no encontrado" });
    }

    // Solo propietario o miembros
    const isOwner = repository.owner.toString() === req.user._id.toString();
    const isMember = repository.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isOwner && !isMember) {
      return res
        .status(403)
        .json({ message: "No tienes acceso a este repositorio" });
    }

    const docCount = await Document.countDocuments({ repository: repository._id });

    return res.json({ ...repository.toObject(), docCount });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/repos/:id
 * Actualiza nombre/descripción de un repositorio (solo propietario).
 */
async function updateRepository(req, res, next) {
  try {
    const repository = await Repository.findById(req.params.id);

    if (!repository) {
      return res.status(404).json({ message: "Repositorio no encontrado" });
    }

    if (repository.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Solo el propietario puede editar el repositorio" });
    }

    repository.name = req.body.name || repository.name;
    repository.description =
      req.body.description !== undefined
        ? req.body.description
        : repository.description;

    const updated = await repository.save();
    return res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/repos/:id
 * Elimina un repositorio y sus documentos. Solo propietario.
 */
async function deleteRepository(req, res, next) {
  try {
    const repository = await Repository.findById(req.params.id);

    if (!repository) {
      return res.status(404).json({ message: "Repositorio no encontrado" });
    }

    if (repository.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Solo el propietario puede eliminar el repositorio" });
    }

    // Elimina documentos asociados (los embeddings y chunks viven en el Document)
    await Document.deleteMany({ repository: repository._id });
    await repository.deleteOne();

    return res.json({ message: "Repositorio eliminado" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRepository,
  getRepositories,
  getRepositoryById,
  updateRepository,
  deleteRepository,
};