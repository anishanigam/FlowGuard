
import { describe, it, expect } from "vitest";
import { evaluateRules } from "../src/services/ruleEngine.js";

describe("FlowGuard Rules Engine", () => {

  it("should approve a valid application", () => {

    const input = {
      age: 25,
      monthlyIncome: 60000,
      creditScore: 780,
      loanAmount: 300000
    };

    const result = evaluateRules(input);

    expect(result.decision).toBe("APPROVED");
    expect(result.passedRules).toBe(4);
  });

  it("should reject an applicant below minimum age", () => {

    const input = {
      age: 16,
      monthlyIncome: 60000,
      creditScore: 780,
      loanAmount: 300000
    };

    const result = evaluateRules(input);

    expect(result.decision).toBe("REJECTED");
  });

  it("should send low credit score applications for review", () => {

    const input = {
      age: 25,
      monthlyIncome: 60000,
      creditScore: 650,
      loanAmount: 300000
    };

    const result = evaluateRules(input);

    expect(result.decision).toBe("MANUAL_REVIEW");
  });

  it("should check loan amount dynamically", () => {

    const input = {
      age: 25,
      monthlyIncome: 25000,
      creditScore: 780,
      loanAmount: 300000
    };

    const result = evaluateRules(input);

    expect(result.decision).toBe("MANUAL_REVIEW");
  });

});
