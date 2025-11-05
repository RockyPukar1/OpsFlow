import { Router } from "express";

import {
  loginController,
  refreshController,
  registerController,
} from "./auth.controller";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", registerController);

// POST /api/v1/auth/login
router.post("/login", loginController);

// POST /api/v1/auth/refresh
router.post("/refresh", refreshController);

export { router as authRoutes };
