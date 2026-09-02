require("dotenv").config();
const { openai } = require("../src/config/env");
const OpenAI = require("openai");

console.log("model:", openai.model, "| apikey set:", openai.apiKey ? "SI (len " + openai.apiKey.length + ")" : "NO");

const client = new OpenAI({ apiKey: openai.apiKey, timeout: 20000, maxRetries: 0 });

(async () => {
  console.log("Llamando chat.completions.json_object con timeout 20s...");
  const t0 = Date.now();
  try {
    const resp = await client.chat.completions.create({
      model: openai.model,
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: 'Eres un clasificador. Clasifica el documento en una categoria de: Contrato, Factura, Reporte, Otro. Responde unicamente JSON: {"categoria":"<categoria>"}',
        },
        { role: "user", content: "Contrato de servicios de consultoria entre dos empresas." },
      ],
    });
    console.log("RESPUESTA (" + (Date.now() - t0) + "ms):", JSON.stringify(resp.choices[0].message.content));
  } catch (e) {
    console.log("ERROR (" + (Date.now() - t0) + "ms):");
    console.log("  status:", e.status);
    console.log("  code:", e.code);
    console.log("  type:", e.type);
    console.log("  message:", e.message);
  }
})();
