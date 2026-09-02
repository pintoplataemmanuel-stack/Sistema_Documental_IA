const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { limits } = require("../config/env");

// Tipos de archivo permitidos
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const ALLOWED_MIMETYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre único: timestamp + id de usuario + extensión
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${req.user?._id || "anon"}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, unique);
  },
});

// Filtro de archivos: valida extensión y mime
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const typeOk = ALLOWED_EXTENSIONS.includes(ext);
  const mimeOk =
    ALLOWED_MIMETYPES.includes(file.mimetype) ||
    // fallback pragmático para algunos navegadores/Windows
    (ext === ".txt" && file.mimetype.startsWith("text/"));
  if (typeOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de archivo no permitido. Solo PDF, DOCX o TXT."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: limits.maxFileSizeMB * 1024 * 1024 },
});

module.exports = { upload, ALLOWED_EXTENSIONS, ALLOWED_MIMETYPES };