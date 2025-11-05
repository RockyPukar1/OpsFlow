import { NextFunction, Request, Response } from "express";

import { AuthenticationError } from "@/common/errors/AppError";
import { authService } from "@/modules/auth/auth.service";
import { User } from "@/modules/auth/user.model";

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("Access token is required");
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const userId = authService.verifyAccessToken(token);
    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthenticationError("Insufficient permissions"));
    }

    next();
  };
};
