const fs = require("fs");
const Document = require("../models/Document");
const Repository = require("../models/Repository");

// Pasos del procesamiento (se completarán en el día 3 con IA)
const PROCESSING_STEPS = {
  extraction: "extraccion",
  classification: "clasificacion",
  summarization: "resumen",
  keyInfo: "extraccion_info",
  embeddings: "embeddings",
};

/**
 * POST /api/files/upload
 * Sube un archivo a un repositorio (multipart: file, repositoryId).
 */
async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ningún archivo" });
    }

    const { repositoryId } = req.body;
    if (!repositoryId) {
      // Si falla la validación de repositorio, borramos el archivo temporal
      fs.unlink(req.file.path, () => {});
      return res
        .status(400)
        .json({ message: "El repositoryId es obligatorio" });
    }

    const repository = await Repository.findById(repositoryId);
    if (!repository) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Repositorio no encontrado" });
    }

    const isOwner = repository.owner.toString() === req.user._id.toString();
    const isMember = repository.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isOwner && !isMember) {
      fs.unlink(req.file.path, () => {});
      return res
        .status(403)
        .json({ message: "No tienes acceso a este repositorio" });
    }

    const extension = req.file.originalname.split(".").pop().toLowerCase();

    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: extension, // pdf, docx, txt
      size: req.file.size,
      mimeType: req.file.mimetype,
      path: req.file.path,
      repository: repository._id,
      owner: req.user._id,
      status: "pending",
    });

    return res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/files
 * Lista documentos (filtrables por repositorio). Acceso restringido a repos propios/miembro.
 */
async function getFiles(req, res, next) {
  try {
    const { repositoryId, status } = req.query;

    const query = {};

    if (repositoryId) {
      const repository = await Repository.findById(repositoryId);
      if (!repository) {
        return res.status(404).json({ message: "Repositorio no encontrado" });
      }
      const isOwner = repository.owner.toString() === req.user._id.toString();
      const isMember = repository.members.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isOwner && !isMember) {
        return res
          .status(403)
          .json({ message: "No tienes acceso a este repositorio" });
      }
      query.repository = repository._id;
    }

    if (status) {
      query.status = status;
    }

    // Si no hay filtro de repositorio, solo ver documentos de repos del usuario
    if (!query.repository) {
      const myRepos = await Repository.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).select("_id");
      query.repository = { $in: myRepos.map((r) => r._id) };
    }

    const documents = await Document.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json(documents);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/files/:id
 * Detalle de un documento.
 */
async function getFileById(req, res, next) {
  try {
    const document = await getDocumentForUserOrFail(req, res);
    if (!document) return;
    return res.json(document);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/files/:id/download
 * Descarga el archivo físico.
 */
async function downloadFile(req, res, next) {
  try {
    const document = await getDocumentForUserOrFail(req, res);
    if (!document) return;

    res.download(document.path, document.originalName, (err) => {
      if (err) {
        // Si el archivo no existe o hay error de red, no lanzamos para evitar crash
        console.error("Error descargando archivo:", err.message);
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/files/:id
 * Elimina el documento (requiere ser admin o propietario del documento).
 */
async function deleteFile(req, res, next) {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Documento no encontrado" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = document.owner.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "Solo el propietario o un admin pueden eliminar el archivo" });
    }

    // Elimina el archivo físico (ignorando si no existe)
    fs.unlink(document.path, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("No se pudo eliminar archivo físico:", err.message);
      }
    });

    await document.deleteOne();

    return res.json({ message: "Documento eliminado" });
  } catch (error) {
    next(error);
  }
}

// ---- utilidad interna ----
async function getDocumentForUserOrFail(req, res) {
  const document = await Document.findById(req.params.id);
  if (!document) {
    res.status(404).json({ message: "Documento no encontrado" });
    return null;
  }

  const repository = await Repository.findById(document.repository);
  if (!repository) {
    res.status(404).json({ message: "Repositorio no encontrado" });
    return null;
  }

  const isOwner = repository.owner.toString() === req.user._id.toString();
  const isMember = repository.members.some(
    (m) => m.toString() === req.user._id.toString()
  );

  if (!isOwner && !isMember) {
    res.status(403).json({ message: "No tienes acceso a este documento" });
    return null;
  }

  return document;
}

module.exports = {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile,
  PROCESSING_STEPS,
};