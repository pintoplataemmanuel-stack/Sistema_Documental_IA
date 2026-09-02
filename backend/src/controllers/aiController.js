const { getDocumentForUserOrFail } = require("./fileController");
const { processDocument } = require("../services/processingService");

/**
 * POST /api/files/:id/process
 * Dispara el procesamiento con IA de un documento de forma asíncrona (202).
 * No bloquea la respuesta: el pipeline corre en background y actualiza
 * el documento (status: completed | error) + el ProcessingLog.
 */
async function processFile(req, res, next) {
  try {
    const document = await getDocumentForUserOrFail(req, res);
    if (!document) return;

    if (document.status === "processing") {
      return res
        .status(409)
        .json({ message: "El documento ya está siendo procesado" });
    }

    document.status = "processing";
    document.processingError = undefined;
    await document.save();

    // Fire-and-forget: el pipeline nunca lanza hacia el llamador,
    // pero el catch evita errores no capturados si algo sale mal.
    processDocument(document._id.toString(), req.user._id.toString()).catch(
      (error) => {
        console.error(
          `[processFile ${document._id}] Error inesperado:`,
          error.message
        );
      }
    );

    return res.status(202).json({
      message: "Procesamiento iniciado",
      document,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { processFile };