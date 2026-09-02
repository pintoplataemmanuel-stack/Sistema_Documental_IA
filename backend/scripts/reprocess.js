/**
 * Reprocesa un documento por id y sigue su estado hasta completar (poll).
 * Uso: node scripts/reprocess.js <TOKEN> <DOC_ID>
 */
const http = require("http");
const TOKEN = process.argv[2];
const DOC = process.argv[3];
const BASE = "http://localhost:5000";

function req(method, urlPath, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + urlPath);
    const r = http.request({ method, hostname: u.hostname, port: u.port, path: u.pathname + u.search, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { let j = null; try { j = JSON.parse(data); } catch { j = data; } resolve({ status: res.statusCode, body: j }); });
    });
    r.on("error", reject);
    r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const h = { Authorization: "Bearer " + TOKEN };
  const p = await req("POST", `/api/files/${DOC}/process`, { headers: h });
  console.log("process HTTP:", p.status, JSON.stringify(p.body).slice(0, 150));

  let final = null;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const d = await req("GET", `/api/files/${DOC}`, { headers: h });
    if (d.status === 200 && d.body && (d.body.status === "completed" || d.body.status === "error")) {
      final = d.body;
      console.log("termostat:", d.body.status, "a los", (i + 1) * 3, "s");
      break;
    }
  }
  if (!final) {
    // GET detallado por última vez
    const d = await req("GET", `/api/files/${DOC}`, { headers: h });
    console.log("Estado final (timeout):", d.status, JSON.stringify(d.body).slice(0, 300));
    process.exit(0);
  }
  console.log("\n=== RESULTADO ===");
  console.log("status        :", final.status);
  console.log("category      :", final.category);
  console.log("processingError:", final.processingError || "(ninguno)");
  console.log("summary       :", (final.summary || "(vacío)"));
  console.log("extractedInfo :", JSON.stringify(final.extractedInfo));
  console.log("processedAt   :", final.processedAt);
}
main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
