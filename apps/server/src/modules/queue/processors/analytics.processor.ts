import { Job } from "bull";

import logger from "@/config/logger";
import { redisService } from "@/modules/realtime/redis.service";

export interface AnalyticsJobData {
  event: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

class AnalyticsProcessor {
  async process(job: Job<AnalyticsJobData>): Promise<void> {
    const {
      event,
      userId,
      projectId,
      taskId,
      metadata,
      timestamp = new Date(),
    } = job.data;

    try {
      logger.info(`Processing analytics job: ${job.id}`, {
        event,
        userId,
        projectId,
      });

      // Process different types of analytics events
      switch (event) {
        case "user_login":
          await this.trackUserLogin(userId!, timestamp);
          break;

        case "task_created":
          await this.trackTaskCreated(taskId!, userId!, projectId!, metadata);
          break;

        case "task_completed":
          await this.trackTaskCompleted(taskId!, userId!, metadata);
          break;

        case "project_created":
          await this.trackProjectCreated(projectId!, userId!, metadata);
          break;

        case "user_activity":
          await this.trackUserActivity(userId!, metadata);
          break;

        default:
          await this.trackGenericEvent(event, {
            userId,
            projectId,
            taskId,
            metadata,
            timestamp,
          });
          break;
      }
    } catch (error) {
      logger.error(`Analytics processing failed: ${job.id}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        event,
        userId,
      });
      throw error;
    }
  }

  private async trackUserLogin(userId: string, timestamp: Date): Promise<void> {
    const today = timestamp.toISOString().split("T")[0];

    // Daily login count
    await redisService.client.incr(`analytics:logins:daily:${today}`);

    // User-specific login tracking
    await redisService.client.incr(`analytics:user:${userId}:logins:${today}`);

    // Last login timestamp
    await redisService.set(
      `analytics:user:${userId}:last_login`,
      timestamp.toISOString(),
    );

    // Active users set (for DAU calculation)
    await redisService.client.sadd(`analytics:active_users:${today}`, userId);
  }

  private async trackTaskCreated(
    taskId: string,
    userId: string,
    projectId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Daily task creation count
    await redisService.client.incr(`analytics:tasks:created:daily:${today}`);

    // User task creation count
    await redisService.client.incr(
      `analytics:user:${userId}:tasks_created:${today}`,
    );

    // Project task count
    if (projectId) {
      await redisService.client.incr(
        `analytics:project:${projectId}:tasks_created`,
      );
    }

    // Task metadata for reporting
    await redisService.set(
      `analytics:task:${taskId}:created`,
      JSON.stringify({
        userId,
        projectId,
        timestamp: new Date(),
        metadata,
      }),
      2592000, // 30 days TTL
    );
  }

  private async trackTaskCompleted(
    taskId: string,
    userId: string,
    _metadata?: Record<string, unknown>,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Daily task completion count
    await redisService.client.incr(`analytics:tasks:completed:daily:${today}`);

    // User task completion count
    await redisService.client.incr(
      `analytics:user:${userId}:tasks_completed:${today}`,
    );

    // Calculate task completion time if creation data exists
    const createdData = await redisService.get(
      `analytics:task:${taskId}:created`,
    );
    if (createdData) {
      const created = JSON.parse(createdData);
      const completionTime = Date.now() - new Date(created.timestamp).getTime();

      // Store completion time for average calculation
      await redisService.client.lpush(
        `analytics:task_completion_times:${today}`,
        completionTime.toString(),
      );

      // Keep only last 1000 completion times per day
      await redisService.client.ltrim(
        `analytics:task_completion_times:${today}`,
        0,
        999,
      );
    }
  }

  private async trackProjectCreated(
    projectId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Daily project creation count
    await redisService.client.incr(`analytics:projects:created:daily:${today}`);

    // User project creation count
    await redisService.client.incr(
      `analytics:user:${userId}:projects_created:${today}`,
    );

    // Track activity type if provided
    if (metadata?.activityType) {
      await redisService.client.incr(
        `analytics:activity:${metadata.activityType}:${today}`,
      );
    }
  }

  private async trackUserActivity(
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Update user activity timestamp
    await redisService.set(
      `analytics:user:${userId}:last_activity`,
      now.toString(),
    );

    // Add to daily active users
    await redisService.client.sadd(`analytics:active_users:${today}`, userId);

    // Track activity type if provided
    if (metadata?.activityType) {
      await redisService.client.incr(
        `analytics:activity:${metadata.activityType}:${today}`,
      );
    }
  }

  private async trackGenericEvent(
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Generic event counter
    await redisService.client.incr(`analytics:events:${event}:${today}`);

    // Store event data for detailed analysis
    await redisService.client.lpush(
      `analytics:events:${event}:data:${today}`,
      JSON.stringify(data),
    );
  }

  // Helper method to get analytics summary
  async getAnalyticsSummary(date?: string): Promise<Record<string, unknown>> {
    const targetDate = date || new Date().toISOString().split("T")[0];

    const [logins, tasksCreated, tasksCompleted, projectsCreated, activeUsers] =
      await Promise.all([
        redisService.get(`analytics:logins:daily:${targetDate}`),
        redisService.get(`analytics:tasks:created:daily:${targetDate}`),
        redisService.get(`analytics:tasks:completed:daily:${targetDate}`),
        redisService.get(`analytics:projects:created:daily:${targetDate}`),
        redisService.client.scard(`analytics:active_users:${targetDate}`),
      ]);

    return {
      date: targetDate,
      logins: parseInt(logins || "0"),
      tasksCreated: parseInt(tasksCreated || "0"),
      tasksCompleted: parseInt(tasksCompleted || "0"),
      projectsCreated: parseInt(projectsCreated || "0"),
      activeUsers,
    };
  }
}

export const analyticsProcessor = new AnalyticsProcessor();
