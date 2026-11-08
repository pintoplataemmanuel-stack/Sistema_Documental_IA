const test = require("node:test");
const assert = require("node:assert/strict");
const { parseJsonContent } = require("../src/services/llmService");

test("parseJsonContent acepta JSON plano", () => {
  assert.deepEqual(parseJsonContent('{"categoria":"Factura"}'), {
    categoria: "Factura",
  });
});

test("parseJsonContent limpia bloques de código Markdown", () => {
  const raw = '```json\n{"resumen":"texto"}\n```';
  assert.deepEqual(parseJsonContent(raw), { resumen: "texto" });
});

test("parseJsonContent extrae el JSON aunque haya texto alrededor", () => {
  const raw = 'Claro, aquí está el resultado: {"total": 100} Espero que sirva.';
  assert.deepEqual(parseJsonContent(raw), { total: 100 });
});

test("parseJsonContent falla con un mensaje claro si no hay JSON", () => {
  assert.throws(
    () => parseJsonContent("No tengo una respuesta estructurada."),
    /no devolvió JSON válido/
  );
});
