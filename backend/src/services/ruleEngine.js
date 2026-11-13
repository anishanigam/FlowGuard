
import rulesConfig from "../config/rules.json"
  with { type: "json" };

// Generic comparison function
function compare(actual, operator, expected) {
  switch (operator) {
    case ">":
      return actual > expected;

    case "<":
      return actual < expected;

    case ">=":
      return actual >= expected;

    case "<=":
      return actual <= expected;

    case "==":
      return actual === expected;

    case "!=":
      return actual !== expected;

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

// Evaluate all configured rules
export function evaluateRules(input, config = rulesConfig) {

  const results = [];

  for (const rule of config.rules) {

    const actualValue = input[rule.field];

    // Resolve expected value
    let expectedValue;

    if (rule.valueFrom) {
      expectedValue =
        input[rule.valueFrom] * (rule.multiplier ?? 1);
    } else {
      expectedValue = rule.value;
    }

    // Check missing values
    if (
      actualValue === undefined ||
      actualValue === null ||
      typeof actualValue !== "number" ||
      !Number.isFinite(actualValue) ||
      typeof expectedValue !== "number" ||
      !Number.isFinite(expectedValue)
    ) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed: false,
        actualValue: actualValue ?? null,
        expectedValue,
        operator: rule.operator,
        action: "MANUAL_REVIEW",
        reason: "Required numeric value is missing or invalid"
      });

      continue;
    }

    const passed = compare(
      actualValue,
      rule.operator,
      expectedValue
    );

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      field: rule.field,
      actualValue,
      expectedValue,
      operator: rule.operator,
      passed,
      action: passed ? "CONTINUE" : rule.failureAction,
      reason: passed
        ? "Rule passed successfully"
        : rule.reason
    });
  }

  // Determine final decision
  let decision = "APPROVED";

  if (results.some(r => !r.passed && r.action === "REJECT")) {
    decision = "REJECTED";
  } else if (results.some(r => !r.passed)) {
    decision = "MANUAL_REVIEW";
  }

  return {
    workflowName: config.workflowName,
    workflowVersion: config.version,
    decision,
    totalRules: results.length,
    passedRules: results.filter(r => r.passed).length,
    failedRules: results.filter(r => !r.passed).length,
    ruleTrace: results
  };
}
