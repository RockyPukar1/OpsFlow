import { Server as HTTPServer } from "http";

import { Server as SocketIOServer, Socket } from "socket.io";

import logger from "@/config/logger";

import { socketAuthMiddleware } from "./middleware/socket.auth";
import { redisService } from "./redis.service";
import type {
  ClientToServerEvents,
  InterServerEvents,
  NotificationData,
  ServerToClientEvents,
  SocketData,
  SystemAlertData,
} from "./types/socket.types";

class WebSocketService {
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  > | null = null;

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    // Authentication middleware
    this.io.use(socketAuthMiddleware);

    // Connection handling
    this.io.use(socketAuthMiddleware);

    // Connection handling
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    logger.info("WebSocket server initialized");
  }

  private async handleConnection(
    socket: Socket<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >,
  ) {
    const { userId, user } = socket.data;

    logger.info(`User connected: ${user.email} (${socket.id})`);

    // Set user online in Reids
    await redisService.setUserOnline(userId, socket.id);

    // Broadcast user online status
    socket.broadcast.emit("userOnline", {
      userId,
      timestamp: new Date(),
    });

    // Send presence update to the connected user
    socket.emit("presenceUpdate", {
      userId: "system",
      status: "online",
      lastSeen: new Date(),
    });

    // Handle room joining
    socket.on("joinRoom", async (data: { roomId: string }) => {
      const { roomId } = data;

      await socket.join(roomId);
      await redisService.joinRoom(userId, roomId);

      const roomUsers = await redisService.getRoomUsers(roomId);

      socket.emit("roomJoined", { roomId, users: roomUsers });
      socket.to(roomId).emit("userOnline", { userId, timestamp: new Date() });

      logger.info(`User ${user.email} joined room: ${roomId}`);
    });

    // Handle room leaving
    socket.on("leaveRoom", async (data: { roomId: string }) => {
      const { roomId } = data;

      await socket.leave(roomId);
      await redisService.leaveRoom(userId, roomId);

      socket.to(roomId).emit("roomLeft", { roomId, userId });

      logger.info(`User ${user.email} left room: ${roomId}`);
    });

    // Handle typing indicators
    socket.on("typing", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.to(roomId).emit("userTyping", { userId, roomId });
    });

    socket.on("stopTyping", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.to(roomId).emit("userStoppedTyping", { userId, roomId });
    });

    // Handle activity updates
    socket.on(
      "updateActivity",
      async (data: {
        activity: string;
        metadata?: Record<string, unknown>;
      }) => {
        const { activity, metadata } = data;

        // Broadcast activity to relevant usrs/rooms
        socket.broadcast.emit("activityUpdate", {
          userId,
          activity,
          timestamp: new Date(),
          metadata,
        });

        // Store activity in Redis for analytics
        await redisService.set(
          `activity:${userId}:${Date.now()}`,
          JSON.stringify({ activity, metadata, timestamp: new Date() }),
          3600, // 1 hour TTL
        );
      },
    );

    // Handle presence updates
    socket.on(
      "updatePresence",
      async (data: { status: "online" | "away" | "busy" | "offline" }) => {
        const { status } = data;

        // Update presence in Redis
        await redisService.set(
          `presence:${userId}`,
          JSON.stringify({ status, lastSeen: new Date() }),
          86400, // 24 hours TTL
        );

        // Broadcast presence update
        socket.broadcast.emit("presenceUpdate", {
          userId,
          status,
          lastSeen: new Date(),
        });
      },
    );

    // Handle disconnection
    socket.on("disconnect", async (reason: string) => {
      logger.info(`User disconnected: ${user.email} (${reason})`);

      // Set user offline
      await redisService.setUserOffline(userId);

      // Leave all rooms
      const userRooms = await redisService.getUserRooms(userId);
      for (const roomId of userRooms) {
        await redisService.leaveRoom(userId, roomId);
        socket
          .to(roomId)
          .emit("userOffline", { userId, timestamp: new Date() });
      }

      // Broadcast user offline status
      socket.broadcast.emit("userOffline", {
        userId,
        timestamp: new Date(),
      });
    });
  }

  // Public methods for sending notifications
  async sendNotification(userId: string, notification: NotificationData) {
    if (!this.io) return;

    const userSockets = await this.io.in(`user:${userId}`).fetchSockets();
    if (userSockets.length > 0) {
      this.io.to(`user:${userId}`).emit("notification", notification);
    }
  }

  async sendSystemAlert(alert: SystemAlertData) {
    if (!this.io) return;
    this.io.emit("systemAlert", alert);
  }

  async sendToRoom(roomId: string, event: string, data: NotificationData) {
    if (!this.io) return;
    this.io.to(roomId).emit(event as keyof ServerToClientEvents, data);
  }

  getIO() {
    return this.io;
  }
}

export const webSocketService = new WebSocketService();
