import mongoose from "mongoose";

import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/common/errors/AppError";
import logger from "@/config/logger";

import { Project } from "./project.model";
import { User } from "../auth/user.model";

class ProjectService {
  async createProject(
    name: string,
    description: string | undefined,
    memberIds: string[],
    ownerId: string,
  ) {
    try {
      // Validate member IDs exist
      if (memberIds.length > 0) {
        const validMembers = await User.find({
          _id: { $in: memberIds },
        });
        if (validMembers.length !== memberIds.length) {
          throw new ValidationError("One or more member IDs are invalid");
        }
      }

      // Create project with owner as first member
      const project = new Project({
        name,
        description,
        owner: ownerId,
        members: [ownerId, ...memberIds],
      });

      await project.save();

      logger.info(`Project created: ${project.name} by user ${ownerId}`);

      return await project.populate("owner", "name email");
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error("Create project error:", error);
      throw new Error("Failed to create project");
    }
  }

  async getProjects(userId: string, page: number, limit: number, skip: number) {
    try {
      // Find projects where user is owner or member
      const query = {
        $or: [{ owner: userId }, { members: userId }],
        status: "active",
      };

      const [projects, total] = await Promise.all([
        Project.find(query)
          .populate("owner", "name email")
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Project.countDocuments(query),
      ]);

      logger.info(`Retrieved ${projects.length}`);

      return { projects, total };
    } catch (error) {
      logger.error("Get projects error:", error);
      throw new Error("Failed to retrieve projects");
    }
  }

  async getProjectById(projectId: string, userId: string) {
    try {
      const project = await Project.findById(projectId)
        .populate("owner", "name email")
        .populate("members", "name email");

      if (!project) {
        throw new NotFoundError("Project");
      }

      // Check if user has access
      if (!project.hasAccess(userId)) {
        throw new AuthorizationError("You don't have access to this project");
      }

      return project;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      logger.error("Get project error:", error);
      throw new Error("Failed to retrieve project");
    }
  }

  async updateProject(
    projectId: string,
    userId: string,
    updates: { name?: string; description?: string; status?: string },
  ) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError("Project");
      }
      // Only owner can update project
      if (!project.isOwner(userId)) {
        throw new AuthorizationError(
          "Only project owner can update the project",
        );
      }

      Object.assign(project, updates);
      await project.save();

      logger.info(`Project updated: ${projectId} by user ${userId}`);

      return await project.populate("owner", "name email");
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      logger.error("Update project error:", error);
      throw new Error("Failed to update project");
    }
  }

  async deleteProject(projectId: string, userId: string) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError("Project");
      }

      // Only owner can delete project
      if (!project.isOwner(userId)) {
        throw new AuthorizationError(
          "Only project owner can delete the project",
        );
      }

      await project.deleteOne();
      logger.info(`Project deleted: ${projectId} by user ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }
      logger.error("Delete project error:", error);
      throw new Error("Failed to delete project");
    }
  }

  async addMember(projectId: string, userId: string, memberId: string) {
    try {
      const project = await Project.findById(projectId);

      if (!project) {
        throw new NotFoundError("Project");
      }

      // Only owner can add members
      if (!project.isOwner(userId)) {
        throw new AuthorizationError("Only project owner can add members");
      }

      // Check if member exists
      const member = await User.findById(memberId);
      if (!member) {
        throw new NotFoundError("User");
      }

      // Check if already a member
      if (project.members.some((m) => m.toString() === memberId)) {
        throw new ValidationError("User is already a member of this project");
      }

      project.members.push(new mongoose.Types.ObjectId(memberId));
      await project.save();

      logger.info(`Member ${memberId} add to project ${projectId}`);

      return await project.populate("members", "name email");
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error("Add member error:", error);
      throw new Error("Failed to add member");
    }
  }

  async removeMember(projectId: string, userId: string, memberId: string) {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new NotFoundError("Project");
      }

      // Only owner can remove members
      if (!project.isOwner(userId)) {
        throw new AuthorizationError("Only project owner can remove members");
      }

      // Can't remove owner
      if (project.owner.toString() === memberId) {
        throw new ValidationError("Cannot remove project owner");
      }

      project.members = project.members.filter(
        (m) => m.toString() !== memberId,
      );
      await project.save();

      logger.info(`Member ${memberId} removed from project ${projectId}`);

      return await project.populate("members", "name email");
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof AuthorizationError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error("Remove member error:", error);
      throw new Error("Failed to remove member");
    }
  }
}

export const projectService = new ProjectService();
