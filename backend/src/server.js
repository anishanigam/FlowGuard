import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`FlowGuard server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();

