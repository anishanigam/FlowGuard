import express from "express";
import cors from "cors";
import workflowRoutes from "./routes/workflowRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FlowGuard API is running!",
    timestamp: new Date()
  });
});

app.use("/api/workflows", workflowRoutes);

export default app;

