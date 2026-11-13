# FlowGuard – System Architecture

## 1. Overview

FlowGuard is a configurable workflow decision platform designed to automate business processes involving input validation, business rules, conditional decisions, external dependencies, and failure recovery.

The current implementation demonstrates a loan approval workflow. Its core components are separated so that business rules, workflow orchestration, persistence, and presentation can be developed independently.

## 2. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + Vite | User interface and workflow monitoring |
| Backend | Node.js + Express | REST API and request handling |
| Validation | Zod | Structured input validation |
| Business Logic | JavaScript | Rule evaluation and workflow execution |
| Database | MongoDB + Mongoose | Execution records and audit history |
| Testing | Vitest | Automated backend tests |

## 3. High-Level Architecture

```text
                USER
                 |
                 v
          React Dashboard
                 |
                 v
          Express REST API
                 |
                 v
          Input Validation
                 |
                 v
          Idempotency Check
                 |
                 v
         Workflow Execution
                 |
          +------+------+
          |             |
          v             v
      Rules Engine   Credit Service
          |             |
          |         Retry Handling
          |             |
          +------+------+
                 |
                 v
          Final Decision
                 |
                 v
        Audit History Creation
                 |
                 v
             MongoDB
                 |
                 v
          Dashboard Result
```

## 4. System Components

### 4.1 Frontend

The React dashboard provides an interface for:

- Submitting loan applications.
- Viewing approval, rejection, and manual-review decisions.
- Displaying individual rule evaluation results.
- Inspecting workflow execution history.
- Viewing previously processed applications.
- Identifying duplicate requests.

The frontend communicates with the backend using HTTP REST APIs.

### 4.2 API Layer

Express handles incoming requests and exposes the following endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server health |
| POST | `/api/workflows/execute` | Submit a workflow |
| GET | `/api/workflows` | Retrieve recent executions |
| GET | `/api/workflows/:requestId` | Retrieve a specific execution |

The API layer separates HTTP request handling from the underlying business logic.

### 4.3 Input Validation

Zod validates incoming application data before execution.

It checks:

- Required fields.
- Correct data types.
- Valid numerical ranges.
- Request ID format.
- Dependency simulation mode.

Invalid requests receive an HTTP 400 response with field-level validation errors.

Business eligibility is evaluated separately by the rules engine. For example, an applicant below the minimum age can pass structural validation but fail a mandatory business rule.

### 4.4 Idempotency Manager

Every workflow request contains a unique `requestId`.

FlowGuard uses a MongoDB unique index on this field to prevent duplicate execution records.

The request processing sequence is:

1. Search for an existing request ID.
2. Return the existing execution if found.
3. Otherwise, reserve the request ID by creating a PROCESSING record.
4. Execute the workflow and update the record.

The unique database constraint also protects against concurrent duplicate submissions.

An existing request returns `idempotentReplay: true`.

### 4.5 Rules Engine

The rules engine evaluates business conditions independently of the workflow orchestration.

Rules are stored in `backend/src/config/rules.json`.

Each rule defines:

- Rule ID and name.
- Input field.
- Comparison operator.
- Expected value or dynamically calculated threshold.
- Rule category.
- Failure action.
- Explanation for failure.

Supported comparison operators include:

`>`, `<`, `>=`, `<=`, `==`, `!=`

The engine supports dynamic thresholds using `valueFrom` and `multiplier`.

For each rule, it generates a trace containing the actual value, expected value, comparison operator, result, and explanation.

The overall decision is derived from the rule results:

- APPROVED: All rules pass.
- REJECTED: At least one mandatory rejection rule fails.
- MANUAL_REVIEW: No mandatory rejection occurs, but one or more other rules fail.

### 4.6 Workflow Engine

The workflow engine coordinates the execution process.

The current loan workflow follows these logical stages:

1. VALIDATION
2. RULE_EVALUATION
3. EXTERNAL_DEPENDENCY
4. FINAL_DECISION

It manages application states, invokes the rules engine, calls the external dependency service, handles retries, and records state transitions.

The current implementation orchestrates these stages in code. The JSON workflow configuration stores workflow metadata and retry policy; fully dynamic stage execution is a planned extension.

### 4.7 External Dependency and Retry Manager

The credit service simulates an external credit verification dependency.

Three simulation modes are supported:

| Mode | Behaviour |
|---|---|
| SUCCESS | Verification succeeds on the first attempt |
| FAIL_ONCE | First attempt fails, second succeeds |
| ALWAYS_FAIL | Every attempt fails |

The retry policy is stored in `workflow.json`.

The current configuration allows a maximum of three attempts.

If verification eventually succeeds, the workflow proceeds to approval.

If all attempts fail, the application moves to MANUAL_REVIEW.

Each attempt and failure is recorded in execution history.

### 4.8 Persistence and Audit History

MongoDB stores workflow execution records.

Each record contains:

- Request ID.
- Original application input.
- Current status and final decision.
- Retry count.
- Workflow version.
- Rule evaluation trace.
- Execution history.
- External dependency result.
- Creation and update timestamps.

The history records status changes, validation outcomes, rule evaluations, dependency attempts, and failures.

This provides an explanation of how a decision was reached.

## 5. Data Flow

A typical workflow execution follows these steps:

1. A user submits a loan application through the React dashboard.
2. The frontend sends a POST request to the Express API.
3. Zod validates the request structure and field values.
4. The API checks whether the request ID already exists.
5. A new execution record is reserved in MongoDB.
6. The workflow engine evaluates configured business rules.
7. Mandatory rule failures result in rejection.
8. Non-mandatory rule failures result in manual review.
9. If the rules pass, the external credit service is invoked.
10. Temporary dependency failures trigger retries.
11. The final decision and execution history are persisted.
12. The frontend displays the result and audit explanation.

## 6. Configuration Model

FlowGuard separates business rules and retry settings from the main execution logic.

### Rule configuration

File: `backend/src/config/rules.json`

Example:

```json
{
  "id": "R3",
  "name": "Credit Score",
  "field": "creditScore",
  "operator": ">=",
  "value": 700,
  "type": "THRESHOLD",
  "failureAction": "MANUAL_REVIEW",
  "reason": "Credit score is below the approval threshold"
}
```

The threshold can be changed through configuration rather than modifying the comparison logic.

### Workflow configuration

File: `backend/src/config/workflow.json`

Example:

```json
{
  "workflowName": "Loan Approval",
  "version": 1,
  "stages": [
    { "id": "validation", "type": "VALIDATION" },
    { "id": "rules", "type": "RULE_EVALUATION" },
    { "id": "creditCheck", "type": "EXTERNAL_DEPENDENCY" },
    { "id": "finalDecision", "type": "DECISION" }
  ],
  "retryPolicy": {
    "maxAttempts": 3,
    "onFailure": "MANUAL_REVIEW"
  }
}
```

The current workflow engine reads the retry policy from this configuration. Rule and workflow configuration changes require a backend restart because the JSON files are imported when the application loads.

## 7. State Management

The workflow uses explicit states to represent execution progress.

| State | Meaning |
|---|---|
| RECEIVED | Request received |
| VALIDATING | Input validation in progress |
| RULE_EVALUATION | Business rules being evaluated |
| PROCESSING | External dependency processing |
| RETRY_PENDING | Waiting for another attempt |
| APPROVED | Application approved |
| REJECTED | Application rejected |
| MANUAL_REVIEW | Human intervention required |
| FAILED | Input or execution failure |

Transitions are recorded in the execution history with timestamps and relevant details.

## 8. Design Trade-offs

### JSON configuration instead of a configuration database

JSON files are lightweight and easy to inspect, edit, and version-control. They are appropriate for the current demonstration.

The trade-off is that changes require a backend restart and are not managed through a runtime configuration interface.

### MongoDB instead of a relational database

MongoDB supports flexible workflow records containing nested rule traces and audit events.

The trade-off is that relational constraints and complex multi-record transactions require additional handling.

### Synchronous execution instead of a message queue

The current engine executes requests directly through the API.

This keeps the implementation simple and easy to demonstrate.

For higher workloads, a message queue and background workers would improve scalability and isolate long-running dependency calls.

### Bounded retries instead of unlimited retries

A maximum retry count prevents requests from retrying indefinitely and consuming resources.

The trade-off is that some temporary outages may persist beyond the configured retry window.

### Simulated dependency instead of a real credit bureau

Simulation provides predictable and repeatable testing of success, temporary failure, and permanent failure scenarios.

It does not represent a real external credit verification