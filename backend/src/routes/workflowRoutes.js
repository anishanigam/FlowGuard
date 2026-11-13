
import express from "express";
import {
  runWorkflow,
  getWorkflow,
  getAllWorkflows
} from "../controllers/workflowController.js";

import { validateWorkflow } from "../middleware/validateWorkflow.js";

const router = express.Router();

router.post("/execute", validateWorkflow, runWorkflow);
router.get("/", getAllWorkflows);
router.get("/:requestId", getWorkflow);

export default router;
