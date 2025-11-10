import { Socket } from "socket.io";

import { AuthenticationError } from "@/common/errors/AppError";
import logger from "@/config/logger";
import { authService } from "@/modules/auth/auth.service";
import { User } from "@/modules/auth/user.model";

import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket.types";

export const socketAuthMiddleware = async (
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  next: (err?: Error) => void,
) => {
  try {
    // Get token from handshake auth or query
    const token =
      socket.handshake.auth?.token || (socket.handshake.query?.token as string);

    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    // Verify JWT token
    const userId = authService.verifyAccessToken(token);

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Attach user data to socket
    socket.data.userId = user.id;
    socket.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    logger.info(`Socket authenticated for user: ${user.email}`);
    next();
  } catch (error) {
    logger.error("Socket authentication failed:", error);
    next(new Error("Authentication failed"));
  }
};
