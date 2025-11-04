import { randomUUID } from "crypto";

import { Request, Response, NextFunction } from "express";

import logger from "@/config/logger";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = randomUUID();
  req.headers["x-request-id"] = requestId;

  logger.info("Incoming request", {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
  });

  next();
};
