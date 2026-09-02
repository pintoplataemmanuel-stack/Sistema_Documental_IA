const fs = require("fs");
const mammoth = require("mammoth");

const SUPPORTED_TYPES = ["pdf", "docx", "txt"];

// pdfjs-dist es ESM; lo cargamos de forma diferida y cacheada desde CommonJS.
let pdfjsPromise;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsPromise;
}

async function extractPdf(filePath) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const doc = await loadingTask.promise;

  try {
    const parts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => (item && typeof item.str === "string") ? item.str : "")
        .join(" ");
      parts.push(text.trim());
    }
    // pdfjs puede incluir caracteres nulos
    return parts.join("\n").replace(/\u0000/g, "").trim();
  } finally {
    try {
      loadingTask.destroy();
    } catch {
      // limpieza best-effort
    }
  }
}

/**
 * Extrae el texto plano de un archivo según su tipo.
 * @param {string} filePath Ruta física del archivo.
 * @param {string} fileType pdf | docx | txt
 * @returns {Promise<string>}
 */
async function extractText(filePath, fileType) {
  const type = String(fileType).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo físico no existe: ${filePath}`);
  }

  switch (type) {
    case "pdf":
      return extractPdf(filePath);
    case "docx": {
      const result = await mammoth.extractRawText({ path: filePath });
      return (result && result.value) ? result.value.trim() : "";
    }
    case "txt": {
      const content = await fs.promises.readFile(filePath, "utf-8");
      return content.trim();
    }
    default:
      throw new Error(`Tipo de archivo no soportado: ${type}`);
  }
}

function isSupportedType(fileType) {
  return SUPPORTED_TYPES.includes(String(fileType).toLowerCase());
}

module.exports = { extractText, isSupportedType, SUPPORTED_TYPES };