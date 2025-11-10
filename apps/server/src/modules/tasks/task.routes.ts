import { Router } from "express";

import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  getTasksController,
  updateTaskController,
} from "./task.controller";

const router = Router();

// /api/v1/tasks
router
  .route("/")
  // POST
  .post(createTaskController)
  // GET
  .get(getTasksController);

// /api/v1/tasks/:id
router
  .route("/:id")
  // GET
  .get(getTaskController)
  // PATCH
  .patch(updateTaskController)
  // DELETE
  .delete(deleteTaskController);

export { router as taskRoutes };
