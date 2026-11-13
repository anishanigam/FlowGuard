# FlowGuard – Decision Explanation Examples

## 1. Overview

FlowGuard evaluates loan applications using configurable business rules and an external credit verification dependency. Every execution produces a decision, rule trace, retry information, and execution history.

The following examples demonstrate how the platform explains its decisions.

---

## 2. Example 1 – Application Approved

### Input

```json
{
  "requestId": "LOAN-1001",
  "name": "Rahul",
  "age": 25,
  "monthlyIncome": 60000,
  "creditScore": 780,
  "loanAmount": 300000
}
```

### Rules Evaluated

| Rule | Condition | Actual | Expected | Result |
|---|---|---:|---:|---|
| R1 – Minimum Age | age >= 18 | 25 | 18 | PASS |
| R2 – Minimum Income | monthlyIncome >= 20000 | 60000 | 20000 | PASS |
| R3 – Credit Score | creditScore >= 700 | 780 | 700 | PASS |
| R4 – Loan Amount Limit | loanAmount <= monthlyIncome × 10 | 300000 | 600000 | PASS |

### Final Decision

**APPROVED**

### Explanation

All four business rules passed. The external credit verification dependency succeeded on the first attempt. Therefore, the workflow completed successfully without requiring a retry or manual intervention.

### Audit Information

- Rules passed: 4
- Rules failed: 0
- Dependency attempts: 1
- Retry count: 0
- Final status: APPROVED

---

## 3. Example 2 – Application Rejected

### Input

```json
{
  "requestId": "LOAN-1002",
  "name": "Aman",
  "age": 16,
  "monthlyIncome": 60000,
  "creditScore": 780,
  "loanAmount": 300000
}
```

### Rules Evaluated

| Rule | Condition | Actual | Expected | Result |
|---|---|---:|---:|---|
| R1 – Minimum Age | age >= 18 | 16 | 18 | FAIL |
| R2 – Minimum Income | monthlyIncome >= 20000 | 60000 | 20000 | PASS |
| R3 – Credit Score | creditScore >= 700 | 780 | 700 | PASS |
| R4 – Loan Amount Limit | loanAmount <= monthlyIncome × 10 | 300000 | 600000 | PASS |

### Final Decision

**REJECTED**

### Explanation

The applicant failed the mandatory minimum age requirement. Rule R1 is configured with the failure action REJECT. The workflow therefore rejects the application without proceeding to external credit verification.

### Audit Information

- Rules passed: 3
- Rules failed: 1
- Failed rule: R1
- Failure action: REJECT
- External dependency: Not executed
- Final status: REJECTED

---

## 4. Example 3 – Application Sent for Manual Review

### Input

```json
{
  "requestId": "LOAN-1003",
  "name": "Priya",
  "age": 25,
  "monthlyIncome": 60000,
  "creditScore": 650,
  "loanAmount": 300000
}
```

### Rules Evaluated

| Rule | Condition | Actual | Expected | Result |
|---|---|---:|---:|---|
| R1 – Minimum Age | age >= 18 | 25 | 18 | PASS |
| R2 – Minimum Income | monthlyIncome >= 20000 | 60000 | 20000 | PASS |
| R3 – Credit Score | creditScore >= 700 | 650 | 700 | FAIL |
| R4 – Loan Amount Limit | loanAmount <= monthlyIncome × 10 | 300000 | 600000 | PASS |

### Final Decision

**MANUAL_REVIEW**

### Explanation

The applicant satisfies the mandatory eligibility requirements but has a credit score below the configured approval threshold. Since R3 is configured with the failure action MANUAL_REVIEW, the system does not automatically reject the application.

### Audit Information

- Rules passed: 3
- Rules failed: 1
- Failed rule: R3
- Failure action: MANUAL_REVIEW
- External dependency: Not executed
- Final status: MANUAL_REVIEW

---

## 5. Example 4 – Temporary Dependency Failure and Retry

### Input

```json
{
  "requestId": "LOAN-1004",
  "name": "Rahul",
  "age": 25,
  "monthlyIncome": 60000,
  "creditScore": 780,
  "loanAmount": 300000,
  "dependencyMode": "FAIL_ONCE"
}
```

### Execution Timeline

| Attempt | Event | Result |
|---|---|---|
| 1 | DEPENDENCY_ATTEMPT | Started |
| 1 | DEPENDENCY_FAILED | Temporary failure |
| - | RETRY_PENDING | Retry scheduled |
| 2 | DEPENDENCY_ATTEMPT | Started |
| 2 | DEPENDENCY_SUCCEEDED | Verification successful |
| - | APPROVED | Workflow completed |

### Final Decision

**APPROVED**

### Explanation

The external credit verification service failed temporarily during the first attempt. FlowGuard recorded the failure and retried according to the configured retry policy. The second attempt succeeded, allowing the application to proceed to approval.

### Audit Information

- Dependency attempts: 2
- Retry count: 1
- Temporary failures: 1
- Final status: APPROVED

---

## 6. Example 5 – Persistent Dependency Failure

### Input

```json
{
  "requestId": "LOAN-1005",
  "name": "Rahul",
  "age": 25,
  "monthlyIncome": 60000,
  "creditScore": 780,
  "loanAmount": 300000,
  "dependencyMode": "ALWAYS_FAIL"
}
```

### Execution Timeline

| Attempt | Event | Result |
|---|---|---|
| 1 | DEPENDENCY_ATTEMPT | Started |
| 1 | DEPENDENCY_FAILED | Service unavailable |
| - | RETRY_PENDING | Retry scheduled |
| 2 | DEPENDENCY_ATTEMPT | Started |
| 2 | DEPENDENCY_FAILED | Service unavailable |
| - | RETRY_PENDING | Retry scheduled |
| 3 | DEPENDENCY_ATTEMPT | Started |
| 3 | DEPENDENCY_FAILED | Service unavailable |
| - | MANUAL_REVIEW | Retry limit reached |

### Final Decision

**MANUAL_REVIEW**

### Explanation

The external credit verification dependency remained unavailable across all configured attempts. Instead of approving the application without verification, FlowGuard recorded each failure and moved the application to manual review after exhausting the retry limit.

### Audit Information

- Maximum attempts: 3
- Actual attempts: 3
- Retry count: 3
- Dependency result: Failed
- Final status: MANUAL_REVIEW

---

## 7. Idempotency and Duplicate Requests

When the same request ID is submitted more than once, FlowGuard returns the previously stored execution result instead of processing the application again.

Example:

| Request | Result |
|---|---|
| First submission: LOAN-1001 | New execution |
| Second submission: LOAN-1001 | Existing result returned |

The second response contains:

```json
{
  "idempotentReplay": true
}
```

This prevents duplicate workflow executions for the same request ID.

---

## 8. Configuration Change Example

Business rules can be modified through `config/rules.json` without changing the rule engine implementation.

For example, changing the minimum age from 18 to 21:

**Before:**

```json
{
  "field": "age",
  "operator": ">=",
  "value": 18
}
```

**After:**

```json
{
  "field": "age",
  "operator": ">=",
  "value": 21
}
```

An applicant aged 19 who previously passed this rule will now fail it.

The rule trace records the updated expected value, making the reason for the changed decision visible.

---

## 9. Auditability

For every completed workflow execution, FlowGuard maintains:

- Original application input.
- Workflow configuration version.
- Individual rule evaluation results.
- Actual and expected values for evaluated rules.
- Final decision and execution status.
- Dependency attempts and failure details.
- Retry count.
- Timestamped execution history.

These records allow a reviewer to understand not only the final decision, but also the sequence of events and conditions that produced it.

**Note:** The examples illustrate the current configured loan workflow and simulated dependency behavior. The external credit verification service is mocked for demonstration purposes.