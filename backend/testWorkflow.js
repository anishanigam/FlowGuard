
import { executeWorkflow } from "./src/services/workflowEngine.js";

const application = {
  name: "Rahul",
  age: 25,
  monthlyIncome: 60000,
  creditScore: 780,
  loanAmount: 300000
};

const result = await executeWorkflow(application, {
  dependencyMode: "FAIL_ONCE"
});

console.log(JSON.stringify(result, null, 2));
