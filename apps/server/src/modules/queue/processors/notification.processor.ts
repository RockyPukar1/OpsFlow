import { Job } from "bull";

import logger from "@/config/logger";
import { redisService } from "@/modules/realtime/redis.service";
import { NotificationData } from "@/modules/realtime/types/socket.types";
import { webSocketService } from "@/modules/realtime/websocket.service";

export interface NotificationJobData {
  userId: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  channels?: ("websocket" | "email" | "sms" | "push")[];
  persistent?: boolean;
}

class NotificationProcessor {
  async process(job: Job<NotificationJobData>): Promise<void> {
    const {
      userId,
      type,
      title,
      message,
      metadata,
      channels = ["websocket"],
      persistent = true,
    } = job.data;

    try {
      logger.info(`Processing notification job: ${job.id}`, {
        userId,
        type,
        title,
      });

      const notification = {
        id: `notification_${job.id}`,
        type,
        title,
        message,
        userId,
        timestamp: new Date(),
        metadata,
      };

      // Process each notification channel
      for (const channel of channels) {
        await this.sendToChannel(channel, notification, job);
      }

      // Store persistent notification
      if (persistent) {
        await this.storeNotification(notification);
      }

      logger.info(`Notification send successfully: ${job.id}`);
      await job.progress(100);
    } catch (error) {
      logger.error(`Notification sending failed: ${job.id}`, {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        title,
      });
      throw error;
    }
  }

  private async sendToChannel(
    channel: string,
    notification: NotificationData,
    _job: Job,
  ): Promise<void> {
    switch (channel) {
      case "websocket":
        await webSocketService.sendNotification(
          notification.userId,
          notification,
        );
        break;
      case "email": {
        // Add email job to queue
        const { queueService } = await import("@/modules/queue/queue.service");
        await queueService.addJob("email", "notification_email", {
          to: await this.getUserEmail(notification.userId),
          subject: notification.title,
          template: "notification",
          templateData: {
            title: notification.title,
            message: notification.message,
            type: notification.type,
            timestamp: notification.timestamp,
          },
        });
        break;
      }
      case "sms":
        // Implement SMS sending logic
        await this.sendSMS(notification);
        break;
      case "push":
        // Implement push notification logic
        await this.sendPushNotification(notification);
        break;
      default:
        logger.warn(`Unsupported notification channel: ${channel}`);
        break;
    }
  }

  private async storeNotification(
    notification: NotificationData,
  ): Promise<void> {
    // Store in Redis for quick access
    await redisService.set(
      `notification:${notification.id}:${notification.id}`,
      JSON.stringify(notification),
      86400, // 24 hours TTL
    );

    // Add to user's notification list
    await redisService.client.lpush(
      `notifications:${notification.userId}`,
      notification.id,
    );

    // Keep only last 100 notifications per user
    await redisService.client.ltrim(
      `notifications:${notification.userId}`,
      0,
      99,
    );
  }

  private async getUserEmail(userId: string): Promise<string> {
    // Get user email from database
    const { User } = await import("@/modules/auth/user.model");
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return user.email;
  }

  private async sendSMS(notification: NotificationData): Promise<void> {
    // Implement SMS sending logic
    logger.info(`SMS notification sent: ${notification.id}`);
  }

  private async sendPushNotification(
    notification: NotificationData,
  ): Promise<void> {
    // Implement push notification logic (Firebase, OneSignal, etc)
    logger.info(`Push notification sent: ${notification.id}`);
  }
}

export const notificationProcessor = new NotificationProcessor();
