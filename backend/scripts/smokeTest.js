/**
 * Smoke test end-to-end (requiere backend corriendo en :5000):
 * 1. Login (o usa token dado)
 * 2. Lista repositorios / usa el repo dado
 * 3. Sube un TXT (multipart)
 * 4. POST /:id/process
 * 5. Espera a que se complete y muestra el resultado
 *
 * Uso: node scripts/smokeTest.js <TOKEN> <REPO_ID> <RUTA_TXT>
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000";
const TOKEN = process.argv[2];
const REPO = process.argv[3];
const FILE = process.argv[4];

function req(method, urlPath, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + urlPath);
    const options = { method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers };
    const r = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });
    r.on("error", reject);
    if (body) r.write(body);
    r.end();
  });
}

function uploadMultipart(filePath, fields) {
  const boundary = "----svg" + Date.now();
  const bufs = [];
  for (const [k, v] of Object.entries(fields)) {
    bufs.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  const base = path.basename(filePath);
  bufs.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${base}"\r\nContent-Type: text/plain\r\n\r\n`));
  bufs.push(fs.readFileSync(filePath));
  bufs.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(bufs);
  return req("POST", "/api/files/upload", {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": body.length,
    },
    body,
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!TOKEN || !REPO || !FILE) {
    console.error("Faltan argumentos: <TOKEN> <REPO_ID> <RUTA_TXT>");
    process.exit(1);
  }

  const authHeaders = { Authorization: `Bearer ${TOKEN}` };

  console.log("Subiendo archivo...");
  const up = await uploadMultipart(FILE, { repositoryId: REPO });
  if (up.status !== 201) {
    console.error("Upload falló:", up.status, JSON.stringify(up.body));
    process.exit(1);
  }
  const doc = up.body;
  console.log(`Subido id=${doc._id} originalName=${doc.originalName} status=${doc.status}`);

  console.log("Disparando procesamiento POST /api/files/" + doc._id + "/process ...");
  const pr = await req("POST", `/api/files/${doc._id}/process`, { headers: authHeaders });
  console.log(`process -> status HTTP ${pr.status}`, JSON.stringify(pr.body).slice(0, 200));

  // Espera a que termine el pipeline (poll cada 2s, hasta 90s)
  console.log("Esperando resultado del pipeline...");
  let final;
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const d = await req("GET", `/api/files/${doc._id}`, { headers: authHeaders });
    if (d.status !== 200) continue;
    if (d.body.status === "completed" || d.body.status === "error") {
      final = d.body;
      break;
    }
  }

  if (!final) {
    console.error("TimeOut: el documento sigue sin terminar.");
    process.exit(1);
  }

  console.log("\n=== RESULTADO FINAL ===");
  console.log("status        :", final.status);
  console.log("category      :", final.category);
  console.log("processingError:", final.processingError || "(ninguno)");
  console.log("summary       :");
  console.log("  " + (final.summary || "(vacío)"));
  console.log("extractedInfo :", JSON.stringify(final.extractedInfo, null, 2));
  console.log("chunks        :", Array.isArray(final.chunks) ? final.chunks.length : final.chunks);
  console.log("processedAt   :", final.processedAt);
}

main().catch((e) => {
  console.error("ERROR FATAL:", e.message);
  process.exit(1);
});
