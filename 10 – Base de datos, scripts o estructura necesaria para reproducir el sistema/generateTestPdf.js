/**
 * Genera un PDF mínimo y válido (texto en Helvetica) sin dependencias
 * externas, calculando offsets correctos para la tabla xref.
 * Utilidad de desarrollo para probar la extracción de texto (pdfjs-dist) localmente.
 *
 * Uso: node "10 – Base de datos, scripts o estructura necesaria para reproducir el sistema/generateTestPdf.js" [outputPath]
 */
const fs = require("fs");
const path = require("path");

const out = process.argv[2] || path.join(__dirname, "..", "uploads", "test-minimo.pdf");

const lines = [];
let bytes = 0;
const offsets = {};

function push(line) {
  lines.push(line);
}

function obj(num, body) {
  offsets[num] = bytes;
  const head = `${num} 0 obj\n`;
  bytes += Buffer.byteLength(head, "utf8");
  const tail = `${body}\nendobj\n`;
  bytes += Buffer.byteLength(tail, "utf8");
  lines.push(head, tail);
}

push("%PDF-1.4\n");
bytes += 9;

obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>");

const streamText = "Hello world. This is a minimal PDF used to test text extraction.";
const streamContent = `BT /F1 12 Tf 72 720 Td (${streamText}) Tj ET\n`;
const streamLen = Buffer.byteLength(streamContent, "utf8");
obj(4, `<< /Length ${streamLen} >>\nstream\n${streamContent}endstream`);
obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

const xrefOffset = bytes;
const xrefBody = `xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5]
  .map((n) => `${String(offsets[n]).padStart(10, "0")} 00000 n \n`)
  .join("")}`;
bytes += Buffer.byteLength(xrefBody, "utf8");
lines.push(xrefBody);

const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
bytes += Buffer.byteLength(trailer, "utf8");
lines.push(trailer);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join(""), "utf8");
console.log(`PDF generado: ${out} (${bytes} bytes)`);