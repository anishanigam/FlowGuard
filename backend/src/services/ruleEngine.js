
import { readFileSync } from "node:fs";

function loadRulesConfig() {
  const configPath = new URL(
    "../config/rules.json",
    import.meta.url
  );

  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function compare(actual, operator, expected) {
  switch (operator) {
    case ">": return actual > expected;
    case "<": return actual < expected;
    case ">=": return actual >= expected;
    case "<=": return actual <= expected;
    case "==": return actual === expected;
    case "!=": return actual !== expected;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

export function evaluateRules(input, config = null) {
  // Load the latest file configuration for every evaluation.
  const activeConfig = config ?? loadRulesConfig();

  const results = [];

  for (const rule of activeConfig.rules) {
    const actualValue = input[rule.field];

    const expectedValue = rule.valueFrom
      ? input[rule.valueFrom] * (rule.multiplier ?? 1)
      : rule.value;

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
        field: rule.field,
        actualValue: actualValue ?? null,
        expectedValue,
        operator: rule.operator,
        passed: false,
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

  let decision = "APPROVED";

  if (results.some(
    rule => !rule.passed && rule.action === "REJECT"
  )) {
    decision = "REJECTED";
  } else if (results.some(rule => !rule.passed)) {
    decision = "MANUAL_REVIEW";
  }

  return {
    workflowName: activeConfig.workflowName,
    workflowVersion: activeConfig.version,
    decision,
    totalRules: results.length,
    passedRules: results.filter(rule => rule.passed).length,
    failedRules: results.filter(rule => !rule.passed).length,
    ruleTrace: results
  };
}

