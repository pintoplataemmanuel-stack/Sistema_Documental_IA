const app = require("./app");
const connectDB = require("./config/db");
const { runStartupRecovery } = require("./services/processingService");
const { initializeAutomation } = require("./automation");
const { port } = require("./config/env");

connectDB().then(async () => {
  // Sincroniza el inventario de flujos del motor propio (sin n8n).
  await initializeAutomation();
  // Recupera documentos que quedaron en "processing" por una caída/reinicio.
  await runStartupRecovery();
  app.listen(port, () => {
    console.log(`Backend corriendo en http://localhost:${port}`);
  });
});
