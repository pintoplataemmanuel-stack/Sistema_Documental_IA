const app = require("./app");
const connectDB = require("./config/db");
const { runStartupRecovery } = require("./services/processingService");
const { port } = require("./config/env");

connectDB().then(async () => {
  // Recupera documentos que quedaron en "processing" por una caída/reinicio.
  await runStartupRecovery();
  app.listen(port, () => {
    console.log(`Backend corriendo en http://localhost:${port}`);
  });
});
