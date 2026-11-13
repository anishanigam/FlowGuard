
import { z } from "zod";

const workflowSchema = z.object({
  requestId: z.string().min(8),
  name: z.string().min(2),
  age: z.number().int().min(0).max(100),
  monthlyIncome: z.number().positive(),
  creditScore: z.number().int().min(300).max(900),
  loanAmount: z.number().positive(),
  dependencyMode: z.enum([
  "SUCCESS",
  "FAIL_ONCE",
  "ALWAYS_FAIL"
]).optional().default("SUCCESS"),
});

export function validateWorkflow(req, res, next) {
  const result = workflowSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid workflow input",
      errors: result.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  req.validatedBody = result.data;
  next();
}
