const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAmount,
  normalizeDate,
  normalizeConfidence,
  normalizeInvoiceData,
  needsReview,
  isUnreadable,
} = require("../src/services/visionService");

test("parseAmount entiende montos colombianos y símbolos", () => {
  assert.equal(parseAmount("$ 1.250.000"), 1250000);
  assert.equal(parseAmount("12,50"), 12.5);
  assert.equal(parseAmount("1.250,75"), 1250.75);
  assert.equal(parseAmount(0), 0);
  assert.equal(parseAmount("sin valor"), 0);
});

test("normalizeDate convierte ISO y dd/mm/aaaa", () => {
  assert.equal(normalizeDate("2026-11-08"), "2026-11-08");
  assert.equal(normalizeDate("8/11/2026"), "2026-11-08");
  assert.equal(normalizeDate("08-11-2026"), "2026-11-08");
  assert.equal(normalizeDate(""), "");
  assert.equal(normalizeDate("noviembre"), "");
});

test("normalizeConfidence acepta 0.92, 92 y porcentajes", () => {
  assert.equal(normalizeConfidence(0.92), 0.92);
  assert.equal(normalizeConfidence(92), 0.92);
  assert.equal(normalizeConfidence("92 %"), 0.92);
  assert.equal(normalizeConfidence(-5), 0);
  assert.equal(normalizeConfidence(150), 1);
});

test("normalizeInvoiceData estructura una factura completa", () => {
  const result = normalizeInvoiceData({
    proveedor: "Ferretería La Tuerca SAS",
    nit: "900.123.456-7",
    fecha: "08/11/2026",
    numero_factura: "FV-001",
    items: [
      { descripcion: "Tornillos", cantidad: "2", valor_unitario: "$ 12.500" },
      { descripcion: "Taladro", cantidad: 1, valor_unitario: "180.000" },
    ],
    subtotal: "$ 205.000",
    impuestos: "$ 38.950",
    total: "$ 243.950",
    moneda: "cop",
    confianza: 92,
    campos_baja_confianza: ["nit"],
  });

  assert.equal(result.data.proveedor, "Ferretería La Tuerca SAS");
  assert.equal(result.data.fecha, "2026-11-08");
  assert.equal(result.data.moneda, "COP");
  assert.equal(result.data.items.length, 2);
  assert.equal(result.data.items[0].valor_unitario, 12500);
  assert.equal(result.data.subtotal, 205000);
  assert.equal(result.data.total, 243950);
  assert.equal(result.confianza, 0.92);
  assert.deepEqual(result.camposBajaConfianza, ["nit"]);
});

test("normalizeInvoiceData calcula totales cuando el modelo los omite", () => {
  const result = normalizeInvoiceData({
    proveedor: "Papelería Centro",
    fecha: "2026-11-01",
    numero_factura: "P-88",
    items: [
      { descripcion: "Resma", cantidad: 2, valor_unitario: 15000 },
      { descripcion: "Bolígrafos", cantidad: 3, valor_unitario: 2000 },
    ],
    confianza: 0.9,
  });

  assert.equal(result.data.subtotal, 36000);
  assert.equal(result.data.total, 36000);
  assert.deepEqual(result.camposBajaConfianza, []);
});

test("normalizeInvoiceData marca campos obligatorios faltantes", () => {
  const result = normalizeInvoiceData({ confianza: 0.4 });

  assert.equal(result.data.proveedor, "");
  assert.equal(result.data.total, 0);
  assert.equal(result.confianza, 0.4);
  assert.deepEqual(
    result.camposBajaConfianza.sort(),
    ["fecha", "numero_factura", "proveedor", "total"].sort()
  );
});

test("needsReview exige revisión por baja confianza o campos dudosos", () => {
  assert.equal(
    needsReview({ confianza: 0.9, camposBajaConfianza: [] }, 0.85),
    false
  );
  assert.equal(
    needsReview({ confianza: 0.7, camposBajaConfianza: [] }, 0.85),
    true
  );
  assert.equal(
    needsReview({ confianza: 0.9, camposBajaConfianza: ["nit"] }, 0.85),
    true
  );
});

test("isUnreadable detecta una imagen sin datos útiles", () => {
  assert.equal(
    isUnreadable({
      data: { proveedor: "", numero_factura: "", fecha: "", total: 0, items: [] },
      confianza: 0,
    }),
    true
  );
  assert.equal(
    isUnreadable({
      data: { proveedor: "Ferretería", total: 0, items: [] },
      confianza: 0.2,
    }),
    false
  );
  assert.equal(
    isUnreadable({
      data: { proveedor: "", total: 548828, items: [] },
      confianza: 0.9,
    }),
    false
  );
});
