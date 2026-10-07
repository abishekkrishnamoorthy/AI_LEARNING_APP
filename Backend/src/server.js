import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chat.js";
import dayRoutes from "./routes/day.js";
import notesRoutes from "./routes/notes.js";
import resourceRoutes from "./routes/resource.js";
import summaryRoutes from "./routes/summary.js";
import taskRoutes from "./routes/task.js";
import topicRoutes from "./routes/topicRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is not configured in Backend/.env");
}

if (!process.env.GROQ_MODEL) {
  throw new Error("GROQ_MODEL is not configured in Backend/.env");
}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-email"],
  })
);
app.use(express.json());

const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

app.get("/health", healthCheck);
app.get("/api/health", healthCheck);

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/topic", topicRoutes);
app.use("/day", dayRoutes);
app.use("/task", taskRoutes);
app.use("/notes", notesRoutes);
app.use("/resource", resourceRoutes);
app.use("/chat", chatRoutes);
app.use("/summary", summaryRoutes);
app.use("/api/topic", topicRoutes);
app.use("/api/day", dayRoutes);
app.use("/api/task", taskRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/resource", resourceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/summary", summaryRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend server is running" });
});

const startServer = async () => {
  await connectDB();

  app.listen(PORT, HOST, () => {
    console.log(`Server is running on ${HOST}:${PORT}`);
  });
};

startServer();
