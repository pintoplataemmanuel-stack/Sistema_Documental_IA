// Se configuran las variables antes de cargar el servicio para probar el
// camino nativo de Gemini sin una clave real ni conexión a internet.
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.EMBEDDINGS_PROVIDER = "gemini";
process.env.GEMINI_EMBEDDING_DIMENSIONS = "768";

const test = require("node:test");
const assert = require("node:assert/strict");
const aiService = require("../src/services/aiService");

function fakeFetch(vectorLength, capture) {
  return async (url, options) => {
    if (capture) capture.push({ url, options });
    const body = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return {
          embeddings: body.requests.map(() => ({
            values: Array(vectorLength).fill(0.01),
          })),
        };
      },
      async text() {
        return "";
      },
    };
  };
}

test("Gemini usa el endpoint nativo y fija 768 dimensiones", async (t) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = fakeFetch(768, calls);
  t.after(() => {
    global.fetch = originalFetch;
  });

  const vector = await aiService.generateEmbeddings("texto de prueba");

  assert.equal(vector.length, 768);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /gemini-embedding-001:batchEmbedContents$/);
  assert.equal(calls[0].options.headers["x-goog-api-key"], "test-gemini-key");

  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.requests.length, 1);
  assert.equal(body.requests[0].outputDimensionality, 768);
  assert.equal(body.requests[0].model, "models/gemini-embedding-001");
});

test("Gemini rechaza una dimensión distinta a la configurada", async (t) => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  global.fetch = fakeFetch(512);
  console.warn = () => {};
  t.after(() => {
    global.fetch = originalFetch;
    console.warn = originalWarn;
  });

  await assert.rejects(
    () => aiService.generateEmbeddings("texto de prueba"),
    /512 dimensiones y se esperaban 768/
  );
});
