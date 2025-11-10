import jwt from "jsonwebtoken";

import { AuthenticationError, ValidationError } from "@/common/errors/AppError";
import logger from "@/config/logger";

import { User } from "./user.model";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Record<string, unknown>;
  tokens: TokenPair;
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
  private readonly ACCESS_TOKEN_EXPIRES_IN = "15m";
  private readonly REFRESH_TOKEN_EXPIRES_IN = "7d";

  constructor() {
    if (!this.JWT_SECRET || !this.JWT_REFRESH_SECRET) {
      throw new Error("JWT secrets are not configured");
    }
  }

  async register(
    email: string,
    password: string,
    name: string,
  ): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ValidationError("User with this email already exists");
      }

      // Create new user
      const user = new User({ email, password, name });
      await user.save();

      // Generate tokens
      const tokens = this.generateTokens(user.id);

      logger.info(`User registered successfully: ${user.email}`);

      return { user: user.toJSON(), tokens };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error("Registration error:", error);
      throw new Error("Registration failed");
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Generate tokens
      const tokens = this.generateTokens(user.id);

      logger.info(`User logged in successfully: ${email}`);

      // Remove password from user object before returning
      const userResponse = user.toJSON();

      return { user: userResponse, tokens };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error("Login error:", error);
      throw new AuthenticationError("Login failed");
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const userId = this.verifyRefreshToken(refreshToken);

      // Verify user still exists
      const user = await User.findById(userId);
      if (!user) {
        throw new AuthenticationError("User not found");
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(userId);
      logger.info(`Access token refreshed for user: ${userId}`);

      return { accessToken };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      logger.error("Token refresh error:", error);
      throw new AuthenticationError("Token refresh failed");
    }
  }

  generateTokens(userId: string): TokenPair {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  private generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
    });
  }

  verifyAccessToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string;
      };
      return decoded;
    } catch {
      throw new AuthenticationError("Invalid access token");
    }
  }

  verifyRefreshToken(token: string): string {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as {
        userId: string;
      };
      return decoded.userId;
    } catch {
      throw new AuthenticationError("Invalid refresh token");
    }
  }
}

export const authService = new AuthService();
