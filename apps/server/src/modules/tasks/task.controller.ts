import { ApiSuccess } from "@/common/utils/ApiResponse";
import { asyncHandler } from "@/common/utils/asyncHandler";
import {
  buildPaginationMeta,
  parsePagination,
} from "@/common/utils/pagination";

import { taskService } from "./task.service";
import {
  createTaskSchema,
  taskFilterSchema,
  updateTaskSchema,
} from "./task.validation";

export const createTaskController = asyncHandler(async (req, res) => {
  const validatedData = createTaskSchema.parse(req.body);
  const userId = req.user._id as string;

  const task = await taskService.createTask(
    validatedData.title,
    validatedData.projectId,
    userId,
    {
      description: validatedData.description,
      status: validatedData.status,
      priority: validatedData.priority,
      assignee: validatedData.assignee,
      dueDate: validatedData.dueDate,
      tags: validatedData.tags,
    },
  );

  new ApiSuccess(task, "Task created successfully").send(res);
});

export const getTasksController = asyncHandler(async (req, res) => {
  const userId = req.user._id as string;
  const { page, limit, skip } = parsePagination(req.query);
  const validatedFilters = taskFilterSchema.parse(req.query);

  const { tasks, total } = await taskService.getTasks(
    userId,
    {
      projectId: validatedFilters.projectId,
      status: validatedFilters.status,
      priority: validatedFilters.priority,
      assignee: validatedFilters.assignee,
    },
    page,
    limit,
    skip,
  );

  const meta = buildPaginationMeta(total, page, limit);
  new ApiSuccess(tasks, "Tasks retrieved successfully", 200, meta).send(res);
});

export const getTaskController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id as string;

  const task = await taskService.getTaskById(id, userId);
  new ApiSuccess(task, "Task retrieved successfully").send(res);
});

export const updateTaskController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id as string;
  const validatedData = updateTaskSchema.parse(req.body);

  const task = await taskService.updateTask(id, userId, validatedData);

  new ApiSuccess(task, "Task updated successfully").send(res);
});

export const deleteTaskController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id as string;

  await taskService.deleteTask(id, userId);

  new ApiSuccess(null, "Task deleted successfully").send(res);
});
