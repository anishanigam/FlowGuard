import { evaluateRules } from "./src/services/ruleEngine.js";

const application = {
  age: 25,
  monthlyIncome: 60000,
  creditScore: 780,
  loanAmount: 300000
};

const result = evaluateRules(application);

console.log(JSON.stringify(result, null, 2));