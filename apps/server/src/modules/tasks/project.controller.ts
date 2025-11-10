import { ApiSuccess } from "@/common/utils/ApiResponse";
import { asyncHandler } from "@/common/utils/asyncHandler";
import {
  buildPaginationMeta,
  parsePagination,
} from "@/common/utils/pagination";

import { projectService } from "./project.service";
import {
  addMemberSchema,
  createProjectSchema,
  updateProjectSchema,
} from "./project.validation";

export const createProjectController = asyncHandler(async (req, res) => {
  const validatedData = createProjectSchema.parse(req.body);
  const userId = req.user._id;

  const project = await projectService.createProject(
    validatedData.name,
    validatedData.description,
    validatedData.memberIds,
    userId! as string,
  );

  new ApiSuccess(project, "Project created successfully").send(res);
});

export const getProjectsController = asyncHandler(async (req, res) => {
  const userId = req.user._id as string;

  const { page, limit, skip } = parsePagination(req.query);

  const { projects, total } = await projectService.getProjects(
    userId,
    page,
    limit,
    skip,
  );

  const meta = buildPaginationMeta(total, page, limit);

  new ApiSuccess(projects, "Projects fetch successfully", 200, meta).send(res);
});

export const getProjectController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id as string;

  const project = await projectService.getProjectById(id, userId);

  new ApiSuccess(project, "Project fetch successfully").send(res);
});

export const updateProjectController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id as string;
  const validatedData = updateProjectSchema.parse(req.body);

  const project = await projectService.updateProject(id, userId, validatedData);

  new ApiSuccess(project, "Project updated successfully").send(res);
});

export const deleteProjectController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user!._id as string;

  await projectService.deleteProject(id, userId);

  new ApiSuccess(null, "Project deleted successfully").send(res);
});

export const addMemberController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id as string;
  const validatedData = addMemberSchema.parse(req.body);

  const project = await projectService.addMember(
    id,
    userId,
    validatedData.userId,
  );

  new ApiSuccess(project, "Member added successfully").send(res);
});

export const removeMemberController = asyncHandler(async (req, res) => {
  const { id, userId: memberId } = req.params;

  const userId = req.user!._id as string;
  const project = await projectService.removeMember(id, userId, memberId);

  new ApiSuccess(project, "Member removed successfully").send(res);
});
