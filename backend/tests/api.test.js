import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll
} from "vitest";

import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import WorkflowExecution from "../src/models/WorkflowExecution.js";
import "dotenv/config";

const TEST_DB =
  process.env.MONGO_URI;

describe("Workflow API", () => {
  beforeAll(async () => {
  if (!TEST_DB) {
    throw new Error("MONGO_URI is missing from backend/.env");
  }

  await mongoose.connect(TEST_DB, {
    dbName: "flowguard_test",
    serverSelectionTimeoutMS: 15000
  });

  await WorkflowExecution.init();
}, 20000);

  beforeEach(async () => {
    await WorkflowExecution.deleteMany({});
  });

  afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}, 15000);
  const validApplication = {
    requestId: "TEST-LOAN-1001",
    name: "Rahul",
    age: 25,
    monthlyIncome: 60000,
    creditScore: 780,
    loanAmount: 300000
  };

  it("should process a valid application successfully", async () => {
    const response = await request(app)
      .post("/api/workflows/execute")
      .send(validApplication);

    const result = response.body.data ?? response.body;

    expect(response.status).toBe(201);
    expect(result.status).toBe("APPROVED");
    expect(result.retryCount).toBe(0);
  });

  it("should reject invalid input", async () => {
    const invalidApplication = {
      ...validApplication,
      requestId: "TEST-LOAN-1002",
      age: "twenty-five"
    };

    const response = await request(app)
      .post("/api/workflows/execute")
      .send(invalidApplication);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should return the existing result for a duplicate request", async () => {
    const firstResponse = await request(app)
      .post("/api/workflows/execute")
      .send(validApplication);

    const secondResponse = await request(app)
      .post("/api/workflows/execute")
      .send(validApplication);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.body.idempotentReplay).toBe(true);

    const count = await WorkflowExecution.countDocuments({
      requestId: validApplication.requestId
    });

    expect(count).toBe(1);
  });

  it("should retry after a temporary dependency failure", async () => {
    const response = await request(app)
      .post("/api/workflows/execute")
      .send({
        ...validApplication,
        requestId: "TEST-LOAN-1003",
        dependencyMode: "FAIL_ONCE"
      });

    const result = response.body.data ?? response.body;

    expect(response.status).toBe(201);
    expect(result.status).toBe("APPROVED");
    expect(result.retryCount).toBe(1);

    const attempts = result.history.filter(
      event => event.event === "DEPENDENCY_ATTEMPT"
    );

    expect(attempts).toHaveLength(2);
  });

  it("should move to manual review when the dependency keeps failing", async () => {
    const response = await request(app)
      .post("/api/workflows/execute")
      .send({
        ...validApplication,
        requestId: "TEST-LOAN-1004",
        dependencyMode: "ALWAYS_FAIL"
      });

    const result = response.body.data ?? response.body;

    expect(response.status).toBe(201);
    expect(result.status).toBe("MANUAL_REVIEW");
    expect(result.retryCount).toBe(3);

    const attempts = result.history.filter(
      event => event.event === "DEPENDENCY_ATTEMPT"
    );

    expect(attempts).toHaveLength(3);
  });
});