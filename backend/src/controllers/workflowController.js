
import WorkflowExecution from "../models/WorkflowExecution.js";
import { executeWorkflow } from "../services/workflowEngine.js";

export async function runWorkflow(req, res) {
  const {
  requestId,
  dependencyMode = "SUCCESS",
  ...input
} = req.validatedBody;

  try {
    // Check whether this request was already processed.
    const existing = await WorkflowExecution.findOne({ requestId });

    if (existing) {
      return res.status(200).json({
        success: true,
        idempotentReplay: true,
        message: "Request already exists",
        data: existing
      });
    }

    // Reserve the request ID before execution.
    // The unique index prevents concurrent duplicate requests.
    let execution;

    try {
      execution = await WorkflowExecution.create({
        requestId,
        input,
        status: "PROCESSING"
      });
    } catch (error) {
      if (error.code === 11000) {
        const duplicate = await WorkflowExecution.findOne({
          requestId
        });

        return res.status(200).json({
          success: true,
          idempotentReplay: true,
          message: "Request already exists",
          data: duplicate
        });
      }

      throw error;
    }

    const result = await executeWorkflow(input, { dependencyMode });

    execution.status = result.status;
    execution.decision = result.decision;
    execution.retryCount = result.retryCount;
    execution.workflowVersion = result.workflowVersion;
    execution.ruleTrace = result.ruleTrace || [];
    execution.history = result.history || [];
    execution.dependencyResult = result.dependencyResult || null;

    await execution.save();

    return res.status(201).json({
      success: true,
      idempotentReplay: false,
      data: execution
    });
  } catch (error) {
    console.error("Workflow execution error:", error);

    return res.status(500).json({
      success: false,
      message: "Workflow execution failed",
      error: error.message
    });
  }
}

export async function getWorkflow(req, res) {
  try {
    const execution = await WorkflowExecution.findOne({
      requestId: req.params.requestId
    });

    if (!execution) {
      return res.status(404).json({
        success: false,
        message: "Workflow execution not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: execution
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export async function getAllWorkflows(req, res) {
  try {
    const executions = await WorkflowExecution.find()
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: executions.length,
      data: executions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
