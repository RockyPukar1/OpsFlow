import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "@/common/errors/AppError";
import { ApiError } from "@/common/utils/ApiResponse";
import logger from "@/config/logger";
import type { MongoServerError } from "@/types/errors";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return new ApiError("Validation failed", 400, err.issues).send(res);
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return new ApiError(err.message, err.statusCode).send(res);
  }

  // Handle mongoose errors
  if (err.name === "CastError") {
    return new ApiError("Invalid ID format", 400).send(res);
  }

  if (
    err.name === "MongoServerError" &&
    (err as MongoServerError).code === 11000
  ) {
    return new ApiError("Duplicate field value", 409).send(res);
  }

  // Default error
  new ApiError(
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
    500,
  ).send(res);
};
