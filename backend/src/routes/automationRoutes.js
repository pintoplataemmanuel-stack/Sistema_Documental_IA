const express = require("express");
const {
  listFlows,
  listRuns,
  getRun,
  triggerFlow,
} = require("../controllers/automationController");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorize");

const router = express.Router();

router.use(protect);

router.get("/flows", listFlows);
router.get("/runs", listRuns);
router.get("/runs/:id", getRun);
router.post("/flows/:key/run", authorize("admin"), triggerFlow);

module.exports = router;
