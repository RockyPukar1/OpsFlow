import { NextFunction, Request, Response } from "express";

import { ValidationError } from "@/common/errors/AppError";
import { ApiSuccess } from "@/common/utils/ApiResponse";

import { authService } from "./auth.service";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.validation";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Register user
    const result = await authService.register(
      validatedData.email,
      validatedData.password,
      validatedData.name,
    );

    new ApiSuccess(result, "User registered successfully", 201).send(res);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return next(new ValidationError("Invalid input data"));
    }
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const result = await authService.login(
      validatedData.email,
      validatedData.password,
    );

    new ApiSuccess(result, "Login successful").send(res);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return next(new ValidationError("Invalid input data"));
    }
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Validate request body
    const validatedData = refreshTokenSchema.parse(req.body);

    // Refresh token
    const result = await authService.refreshToken(validatedData.refreshToken);

    new ApiSuccess(result, "Token refreshed successfully").send(res);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return next(new ValidationError("Invalid input data"));
    }
    next(error);
  }
};
