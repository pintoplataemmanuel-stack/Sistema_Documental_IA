const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { limits } = require("../config/env");

// La lectura de facturas acepta imágenes y PDF.
const VISION_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const VISION_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const visionDir = path.join(__dirname, "..", "..", "uploads", "vision");
if (!fs.existsSync(visionDir)) {
  fs.mkdirSync(visionDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, visionDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${req.user?._id || "anon"}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const typeOk = VISION_EXTENSIONS.includes(ext);
  const mimeOk = VISION_MIMETYPES.includes(file.mimetype);
  if (typeOk && mimeOk) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Archivo no permitido. Para facturas usa JPG, PNG, WEBP o PDF."
      ),
      false
    );
  }
};

const visionUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: limits.maxFileSizeMB * 1024 * 1024 },
});

module.exports = { visionUpload, VISION_EXTENSIONS, VISION_MIMETYPES };
