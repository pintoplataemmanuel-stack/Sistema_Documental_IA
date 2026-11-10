const fs = require("fs");
const VisionScan = require("../models/VisionScan");
const Invoice = require("../models/Invoice");
const { ai } = require("../config/env");
const { extractInvoice, needsReview, normalizeInvoiceData } = require("../services/visionService");
const auditService = require("../services/auditService");

function isAdmin(user) {
  return user?.role === "admin";
}

function canAccess(scan, user) {
  return (
    isAdmin(user) || scan.user.toString() === user._id.toString()
  );
}

function invoicePayload(data, userId, scanId) {
  return {
    user: userId,
    scan: scanId,
    proveedor: data.proveedor,
    nit: data.nit,
    fecha: data.fecha,
    numero_factura: data.numero_factura,
    items: data.items,
    subtotal: data.subtotal,
    impuestos: data.impuestos,
    total: data.total,
    moneda: data.moneda,
    origin: "vision",
    status: "confirmed",
  };
}

/**
 * POST /api/vision/scan
 * Recibe una imagen o PDF de factura, extrae los datos y decide si requiere
 * revisión humana.
 */
async function scanInvoice(req, res, next) {
  let scan = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se recibió ninguna imagen ni PDF." });
    }

    const fileType = req.file.originalname.split(".").pop().toLowerCase();
    const source = fileType === "pdf" ? "pdf" : "image";

    scan = await VisionScan.create({
      user: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      fileType,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      source,
      status: "processing",
    });

    let result;
    try {
      result = await extractInvoice({
        filePath: req.file.path,
        fileType,
        mimeType: req.file.mimetype,
        meta: {
          userId: req.user._id,
          scanId: scan._id,
          ip: req.ip,
        },
      });
    } catch (error) {
      scan.status = "error";
      scan.error = error.message;
      scan.processedAt = new Date();
      await scan.save();
      return res.status(422).json({ message: error.message, scan });
    }

    const requiresReview = needsReview(result);

    scan.data = result.data;
    scan.confianza = result.confianza;
    scan.camposBajaConfianza = result.camposBajaConfianza;
    scan.requiresReview = requiresReview;
    scan.provider = result.provider;
    scan.model = result.model;
    scan.mode = result.mode;
    scan.processedAt = new Date();

    let invoice = null;
    if (!requiresReview) {
      invoice = await Invoice.create(
        invoicePayload(result.data, req.user._id, scan._id)
      );
      scan.status = "saved";
      scan.invoice = invoice._id;
      scan.reviewedAt = new Date();
    } else {
      scan.status = "review";
    }

    await scan.save();

    return res.status(201).json({
      scan,
      invoice,
      requiresReview,
      threshold: ai.vision.minConfidence,
    });
  } catch (error) {
    if (scan && !scan.invoice) {
      scan.status = "error";
      scan.error = error.message;
      scan.processedAt = scan.processedAt || new Date();
      await scan.save().catch(() => {});
    }
    next(error);
  }
}

/**
 * GET /api/vision/scans
 * Historial del usuario. Un admin puede ver todo con ?all=true.
 */
async function listScans(req, res, next) {
  try {
    const all = isAdmin(req.user) && req.query.all === "true";
    const query = all ? {} : { user: req.user._id };
    const items = await VisionScan.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      items,
      threshold: ai.vision.minConfidence,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vision/scans/:id
 */
async function getScan(req, res, next) {
  try {
    const scan = await VisionScan.findById(req.params.id).lean();
    if (!scan) {
      return res.status(404).json({ message: "Lectura no encontrada." });
    }
    if (!canAccess(scan, req.user)) {
      return res.status(403).json({ message: "No tienes acceso a esta lectura." });
    }
    return res.json({ scan, threshold: ai.vision.minConfidence });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/vision/scans/:id/confirm
 * El usuario revisa/corrige los campos y confirma la creación del gasto.
 */
async function confirmScan(req, res, next) {
  try {
    const scan = await VisionScan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Lectura no encontrada." });
    }
    if (!canAccess(scan, req.user)) {
      return res.status(403).json({ message: "No tienes acceso a esta lectura." });
    }
    if (scan.invoice) {
      return res.status(409).json({ message: "Esta lectura ya fue guardada." });
    }

    const incoming =
      req.body && req.body.data && typeof req.body.data === "object"
        ? req.body.data
        : req.body || {};

    const current = scan.data ? scan.data.toObject?.() || scan.data : {};
    // La confianza vive fuera de `data`; se conserva la del modelo para no
    // mostrarla en 0 % después de que el usuario corrige y confirma.
    const normalized = normalizeInvoiceData({
      ...current,
      ...incoming,
      confianza: scan.confianza,
    });

    scan.data = normalized.data;
    scan.confianza = normalized.confianza;
    scan.camposBajaConfianza = normalized.camposBajaConfianza;
    scan.requiresReview = false;
    scan.status = "saved";
    scan.reviewedAt = new Date();
    scan.error = undefined;

    const invoice = await Invoice.create(
      invoicePayload(normalized.data, scan.user, scan._id)
    );
    scan.invoice = invoice._id;

    await scan.save();

    await auditService.record({
      user: req.user._id,
      action: "vision.factura_confirmada",
      resource: "Invoice",
      resourceId: invoice._id,
      status: "success",
      metadata: {
        scanId: scan._id,
        confianza: normalized.confianza,
        corrigioCampos: Object.keys(incoming).length > 0,
      },
      ip: req.ip,
    });

    return res.json({ scan, invoice });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/vision/scans/:id
 * Elimina el intento y el archivo físico. El gasto ya confirmado se conserva.
 */
async function deleteScan(req, res, next) {
  try {
    const scan = await VisionScan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ message: "Lectura no encontrada." });
    }
    if (!canAccess(scan, req.user)) {
      return res.status(403).json({ message: "No tienes acceso a esta lectura." });
    }

    fs.unlink(scan.path, (error) => {
      if (error && error.code !== "ENOENT") {
        console.error("No se pudo eliminar la imagen de la factura:", error.message);
      }
    });

    await scan.deleteOne();
    return res.json({ message: "Lectura eliminada." });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/vision/invoices
 * Gastos/facturas confirmados por el usuario.
 */
async function listInvoices(req, res, next) {
  try {
    const all = isAdmin(req.user) && req.query.all === "true";
    const query = all ? {} : { user: req.user._id };
    const items = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ items });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  scanInvoice,
  listScans,
  getScan,
  confirmScan,
  deleteScan,
  listInvoices,
};
