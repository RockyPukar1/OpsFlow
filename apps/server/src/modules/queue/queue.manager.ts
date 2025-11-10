import Bull from "bull";

import logger from "@/config/logger";

import {
  AnalyticsJobData,
  analyticsProcessor,
} from "./processors/analytics.processor";
import { EmailJobData, emailProcessor } from "./processors/email.processor";
import {
  NotificationJobData,
  notificationProcessor,
} from "./processors/notification.processor";
import { queueService } from "./queue.service";

class QueueManager {
  async initialize(): Promise<void> {
    logger.info("Initializing queue manager...");
    // Create queues
    const emailQueue = queueService.createQueue("email", {
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });

    const notificationQueue = queueService.createQueue("notification", {
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
      },
    });

    const analyticsQueue = queueService.createQueue("analytics", {
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    // Register processors
    emailQueue.process("*", 5, emailProcessor.process.bind(emailProcessor));
    notificationQueue.process(
      "*",
      10,
      notificationProcessor.process.bind(notificationProcessor),
    );
    analyticsQueue.process(
      "*",
      20,
      analyticsProcessor.process.bind(analyticsProcessor),
    );

    logger.info("Queue manager initialized successfully");
  }

  // Helper methods for adding jobs
  async sendEmail(data: EmailJobData, options?: Bull.JobOptions) {
    return queueService.addJob("email", "send_email", data, options);
  }

  async sendNotification(data: NotificationJobData, options?: Bull.JobOptions) {
    return queueService.addJob(
      "notification",
      "send_notification",
      data,
      options,
    );
  }

  async trackAnalytics(data: AnalyticsJobData, options?: Bull.JobOptions) {
    return queueService.addJob("analytics", "track_event", data, options);
  }

  // Bulk operations
  async sendBulkEmails(emails: EmailJobData[]) {
    const jobs = emails.map((email) =>
      queueService.addJob("email", "send_email", email, { priority: -1 }),
    );
    return Promise.all(jobs);
  }

  async sendBulkNotifications(notifications: NotificationJobData[]) {
    const jobs = notifications.map((notification) =>
      queueService.addJob("notification", "send_notification", notification),
    );
    return Promise.all(jobs);
  }

  // Queue monitoring
  async getQueueStats() {
    const [emailStats, notificationStats, analyticsStats] = await Promise.all([
      queueService.getQueueStats("email"),
      queueService.getQueueStats("notification"),
      queueService.getQueueStats("analytics"),
    ]);

    return {
      email: emailStats,
      notification: notificationStats,
      analytics: analyticsStats,
    };
  }

  async shutdown() {
    logger.info("Shutting down queue manager...");
    await Promise.all([
      queueService.getQueue("email")?.close(),
      queueService.getQueue("notification")?.close(),
      queueService.getQueue("analytics")?.close(),
    ]);
    logger.info("Queue manager shutdown completed");
  }
}

export const queueManager = new QueueManager();
