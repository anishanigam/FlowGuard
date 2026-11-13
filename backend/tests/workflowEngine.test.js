
import { describe, it, expect } from "vitest";
import { executeWorkflow } from "../src/services/workflowEngine.js";

const validApplication = {
  name: "Rahul",
  age: 25,
  monthlyIncome: 60000,
  creditScore: 780,
  loanAmount: 300000
};

describe("FlowGuard Workflow Engine", () => {

  it("should approve a valid application", async () => {
    const result = await executeWorkflow(validApplication);

    expect(result.status).toBe("APPROVED");
    expect(result.retryCount).toBe(0);
  });

  it("should reject an application with failed mandatory rules", async () => {
    const result = await executeWorkflow({
      ...validApplication,
      age: 16
    });

    expect(result.status).toBe("REJECTED");
  });

  it("should send low credit score applications for manual review", async () => {
    const result = await executeWorkflow({
      ...validApplication,
      creditScore: 650
    });

    expect(result.status).toBe("MANUAL_REVIEW");
  });

  it("should retry after a temporary dependency failure", async () => {
    const result = await executeWorkflow(validApplication, {
      dependencyMode: "FAIL_ONCE"
    });

    expect(result.status).toBe("APPROVED");
    expect(result.retryCount).toBe(1);
  });

  it("should move to manual review after all retries fail", async () => {
    const result = await executeWorkflow(validApplication, {
      dependencyMode: "ALWAYS_FAIL"
    });

    expect(result.status).toBe("MANUAL_REVIEW");
    expect(result.retryCount).toBe(3);
  });

  it("should record dependency failures in history", async () => {
    const result = await executeWorkflow(validApplication, {
      dependencyMode: "FAIL_ONCE"
    });

    const failures = result.history.filter(
      item => item.event === "DEPENDENCY_FAILED"
    );

    expect(failures.length).toBe(1);
  });

});
