import { createServer } from "http";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

// Import modules that depend on environment variables AFTER dotenv.config()
import { verifyToken } from "@/common/middleware/auth";
import { errorHandler } from "@/common/middleware/errorHandler";
import { requestLogger } from "@/common/middleware/requestLogger";
import { ApiError, ApiSuccess } from "@/common/utils/ApiResponse";
import { connectDB } from "@/config/database";
import logger from "@/config/logger";
import { authRoutes } from "@/modules/auth/auth.routes";
import { projectRoutes } from "@/modules/tasks/project.routes";
import { taskRoutes } from "@/modules/tasks/task.routes";

import { queueManager } from "./modules/queue/queue.manager";
import { webSocketService } from "./modules/realtime/websocket.service";

// Load environment variables FIRST
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// HTTP server for WebSocket integration
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMS,
  message: "Too many requests from this IP",
});
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestLogger);

// Health check endpoint
app.get("/health", async (req, res) => {
  const queueStats = await queueManager.getQueueStats();

  new ApiSuccess(
    {
      timestamp: new Date().toISOString(),
      websocket: !!webSocketService.getIO(),
      queues: queueStats,
    },
    "Server is running",
  ).send(res);
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/projects", verifyToken, projectRoutes);
app.use("/api/v1/tasks", verifyToken, taskRoutes);

// API base route
app.get("/api/v1", (req, res) => {
  new ApiSuccess(null, "OpsFlow API v1").send(res);
});

// 404 handler
app.use((req, res) => {
  new ApiError("Route not found", 404).send(res);
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Initialize WebSocket server
    webSocketService.initialize(httpServer);

    // Initialize queue manager
    await queueManager.initialize();

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info("WebSocket server initialized");
      logger.info("Queue manager initialized");

      if (process.env.BULL_BOARD_ENABLED === "true") {
        logger.info(
          `Queue dashboard available at: http://localhost:${PORT}/admin/queues`,
        );
      }
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await queueManager.shutdown();
  process.exit(0);
});
