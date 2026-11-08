const AutomationFlow = require("../models/AutomationFlow");
const AutomationRun = require("../models/AutomationRun");
const auditService = require("../services/auditService");
const notificationService = require("../services/notificationService");
const { createAutomationEngine } = require("./engine");
const { documentProcessedFlow } = require("./flows/documentProcessedFlow");
const { documentFailedFlow } = require("./flows/documentFailedFlow");

/**
 * Instancia única del motor de automatización del backend.
 *
 * Los flujos viven en código y se sincronizan con la colección
 * automationflows al arrancar. Así el sistema no depende de n8n en la nube.
 */
const engine = createAutomationEngine({
  FlowModel: AutomationFlow,
  RunModel: AutomationRun,
  auditService,
});

engine.registerMany([
  documentProcessedFlow({ notificationService, auditService }),
  documentFailedFlow({ notificationService, auditService }),
]);

/**
 * Sincroniza el inventario de flujos. Se llama después de conectar a MongoDB.
 */
async function initializeAutomation() {
  return engine.syncFlowDefinitions();
}

module.exports = {
  engine,
  initializeAutomation,
  notificationService,
  auditService,
};
