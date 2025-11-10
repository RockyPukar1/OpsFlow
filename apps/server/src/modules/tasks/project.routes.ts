import { Router } from "express";

import {
  addMemberController,
  createProjectController,
  deleteProjectController,
  getProjectController,
  getProjectsController,
  removeMemberController,
  updateProjectController,
} from "./project.controller";

const router = Router();

// /api/v1/projects
router
  .route("/")
  // POST
  .post(createProjectController)
  // GET
  .get(getProjectsController);

// /api/v1/projects/:id
router
  .route("/:id")
  // GET
  .get(getProjectController)
  // PATCH
  .patch(updateProjectController)
  // DELETE
  .delete(deleteProjectController);

// POST /api/v1/projects/:id/members
router.post("/:id/members", addMemberController);

// DELETE /api/v1/projects/:id/members/:userId
router.delete("/:id/members/:userId", removeMemberController);

export { router as projectRoutes };
