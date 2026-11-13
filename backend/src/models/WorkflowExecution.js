
import mongoose from "mongoose";

const workflowExecutionSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      default: "PROCESSING"
    },
    decision: String,
    retryCount: {
      type: Number,
      default: 0
    },
    workflowVersion: Number,
    ruleTrace: [mongoose.Schema.Types.Mixed],
    history: [mongoose.Schema.Types.Mixed],
    dependencyResult: mongoose.Schema.Types.Mixed,
    error: String
  },
  { timestamps: true }
);

export default mongoose.model(
  "WorkflowExecution",
  workflowExecutionSchema
);
