import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from "@/common/errors/AppError";
import logger from "@/config/logger";

import { Project } from "./project.model";
import { Task } from "./task.model";

class TaskService {
  async createTask(
    title: string,
    projectId: string,
    userId: string,
    data: {
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      dueDate?: string;
      tags?: string[];
    },
  ) {
    try {
      // Check if project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        throw new NotFoundError("Project");
      }

      if (!project.hasAccess(userId)) {
        throw new AuthorizationError("You don't have access to this project");
      }

      // Create task
      const task = new Task({
        title,
        project: projectId,
        createdBy: userId,
        ...data,
      });

      await task.save();

      logger.info(`Task created: ${task.title} by project ${projectId}`);

      return await task
        .populate("assignee", "name email")
        .populate("createdBy", "name email");
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }
      logger.error("Create task error:", error);
      throw new Error("Failed to create task");
    }
  }

  async getTasks(
    userId: string,
    filters: {
      projectId?: string;
      status?: string;
      priority?: string;
      assignee?: string;
    },
    page: number,
    limit: number,
    skip: number,
  ) {
    try {
      // Build query
      const query: Record<string, unknown> = {};

      // If projectId provided, check access
      if (filters.projectId) {
        const project = await Project.findById(filters.projectId);
        if (!project) {
          throw new NotFoundError("Project");
        }

        if (!project.hasAccess(userId)) {
          throw new AuthorizationError("You don't have access to this project");
        }
        query.project = filters.projectId;
      } else {
        // Get all projects user has access to
        const userProjects = await Project.find({
          $or: [{ owner: userId }, { members: userId }],
        }).select("_id");

        query.project = { $in: userProjects.map((p) => p.id) };
      }

      // Add other filter
      if (filters.status) query.status = filters.status;
      if (filters.priority) query.priority = filters.priority;
      if (filters.assignee) query.assignee = filters.assignee;

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate("assignee", "name email")
          .populate("createdBy", "name email")
          .populate("project", "name")
          .sort({ createdA: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Task.countDocuments(query),
      ]);

      logger.info(`Retrieved ${tasks.length} tasks for user ${userId}`);

      return { tasks, total };
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }
      logger.error("get tasks error:", error);
      throw new Error("Failed to retrieve tasks");
    }
  }
  async getTaskById(taskId: string, userId: string) {
    try {
      const task = await Task.findById(taskId)
        .populate("assignee", "name email")
        .populate("createdBy", "name email")
        .populate("project", "name");

      if (!task) {
        throw new NotFoundError("Task");
      }

      // Check if user has access to project
      const project = await Project.findById(task.project);
      if (!project || !project.hasAccess(userId)) {
        throw new AuthorizationError("You don't have access to this task");
      }

      return task;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }
    }
  }
  async updateTask(
    taskId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      dueDate?: string;
      tags?: string[];
    },
  ) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError("Task");
      }

      // Check if user has access to project
      const project = await Project.findById(task.project);
      if (!project || !project.hasAccess(userId)) {
        throw new AuthorizationError("You don't have access to this task");
      }

      Object.assign(task, updates);
      await task.save();

      logger.info(`Task updated: ${taskId} by user ${userId}`);

      return await task
        .populate("assignee", "name email")
        .populate("createdBy", "name email");
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }
      logger.info(`Task updated: ${taskId} by user ${userId}`);
      throw new Error("Failed to update task");
    }
  }

  async deleteTask(taskId: string, userId: string) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new NotFoundError("Task");
      }

      // Check if user has access and is creator
      const project = await Project.findById(task.project);
      if (!project || !project.hasAccess(userId)) {
        throw new AuthorizationError("You don't have access to this task");
      }

      // Only creator or project owner can delete task
      if (task.createdBy.toString() !== userId && !project.isOwner(userId)) {
        throw new AuthorizationError(
          "Only task creator or project owner can delete the task",
        );
      }

      await task.deleteOne();
      logger.info(`Task deleted: ${taskId} by user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthenticationError
      ) {
        throw error;
      }
      logger.error("Delete task error:", error);
      throw new Error("Failed to delete chat");
    }
  }
}

export const taskService = new TaskService();
