
import workflowConfig from "../config/workflow.json"
  with { type: "json" };

import { evaluateRules } from "./ruleEngine.js";
import { verifyCreditScore } from "./creditService.js";

export async function executeWorkflow(
  input,
  { dependencyMode = "SUCCESS" } = {}
) {
  let status = "RECEIVED";
  const history = [];
  let retryCount = 0;

  function transition(nextStatus, details = {}) {
    const previousStatus = status;
    status = nextStatus;

    history.push({
      event: "STATUS_CHANGED",
      previousStatus,
      newStatus: nextStatus,
      timestamp: new Date().toISOString(),
      details
    });
  }

  function log(event, details = {}) {
    history.push({
      event,
      timestamp: new Date().toISOString(),
      details
    });
  }

  // Stage 1: Validation
  transition("VALIDATING");

  const requiredFields = [
    "name",
    "age",
    "monthlyIncome",
    "creditScore",
    "loanAmount"
  ];

  const missingFields = requiredFields.filter(
    field => input[field] === undefined ||
             input[field] === null
  );

  if (missingFields.length > 0) {
    transition("FAILED", { missingFields });

    return {
      status,
      error: "Required fields are missing",
      missingFields,
      history,
      retryCount
    };
  }

  log("VALIDATION_PASSED");

  // Stage 2: Rule evaluation
  transition("RULE_EVALUATION");

  const ruleResult = evaluateRules(input);

  log("RULES_EVALUATED", {
    decision: ruleResult.decision,
    passedRules: ruleResult.passedRules,
    failedRules: ruleResult.failedRules
  });

  // Stop if rejected
  if (ruleResult.decision === "REJECTED") {
    transition("REJECTED", {
      reason: "Mandatory business rule failed"
    });
  }

  // Stop if manual review is required
  else if (ruleResult.decision === "MANUAL_REVIEW") {
    transition("MANUAL_REVIEW", {
      reason: "Application requires human review"
    });
  }

  // Stage 3: External dependency
  else {
    transition("PROCESSING");

    const maxAttempts =
      workflowConfig.retryPolicy.maxAttempts;

    let verified = false;
    let dependencyResult = null;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      retryCount = attempt - 1;

      try {
        log("DEPENDENCY_ATTEMPT", { attempt });

        dependencyResult = await verifyCreditScore(
          dependencyMode,
          attempt
        );

        verified = dependencyResult.verified;

        log("DEPENDENCY_SUCCEEDED", {
          attempt,
          referenceId: dependencyResult.referenceId
        });

        break;

      } catch (error) {
        retryCount = attempt;

        log("DEPENDENCY_FAILED", {
          attempt,
          error: error.message
        });

        if (attempt < maxAttempts) {
          transition("RETRY_PENDING", {
            attempt,
            error: error.message
          });

          transition("PROCESSING", {
            retrying: true,
            attempt: attempt + 1
          });
        }
      }
    }

    // Stage 4: Final decision
    if (verified) {
      transition("APPROVED", {
        reason: "All rules passed and credit verification succeeded"
      });
    } else {
      transition(
        workflowConfig.retryPolicy.onFailure,
        {
          reason: "External dependency failed after all retries",
          attempts: maxAttempts
        }
      );
    }

    return {
      status,
      decision: status,
      retryCount,
      dependencyResult,
      ruleTrace: ruleResult.ruleTrace,
      workflowVersion: workflowConfig.version,
      history
    };
  }

  return {
    status,
    decision: status,
    retryCount,
    ruleTrace: ruleResult.ruleTrace,
    workflowVersion: workflowConfig.version,
    history
  };
}
