import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";
import Bull, { Job, Queue } from "bull";

import logger from "@/config/logger";

export interface JobData {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  userId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

class QueueService {
  private queues: Map<string, Queue> = new Map();
  private serverAdapter: ExpressAdapter;

  constructor() {
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath("/admin/queues");
    this.initializedBullBoard();
  }

  private initializedBullBoard() {
    // Bull board for queue monitoring
    createBullBoard({
      queues: [],
      serverAdapter: this.serverAdapter,
    });
  }

  // Create a new queue
  createQueue(name: string, options?: Bull.QueueOptions): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Bull(name, {
      redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
      ...options,
    });

    // Add to Bull Board for monitoring
    createBullBoard({
      queues: [new BullAdapter(queue)],
      serverAdapter: this.serverAdapter,
    });

    // Event listeners for logging
    queue.on("completed", (job: Job) => {
      logger.info(`Job completed: ${job.id} in queue: ${name}`);
    });

    queue.on("failed", (job: Job, err: Error) => {
      logger.error(`Job failed: ${job.id} in queue: ${name}`, {
        error: err.message,
        jobData: job.data,
      });
    });

    queue.on("stalled", (job: Job) => {
      logger.warn(`Job stalled: ${job.id} in queue: ${name}`);
    });

    this.queues.set(name, queue);
    return queue;
  }

  // Get existing queue
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  // Add job to queue
  async addJob(
    queueName: string,
    jobType: string,
    data: JobData,
    options?: Bull.JobOptions,
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobType, jobType, {
      priority: data.priority || 0,
      delay: data.delay || 0,
      attempts: data.attempts || 3,
      ...options,
    });

    logger.info(`Job added: ${job.id} to queue: ${queueName}`, {
      jobType,
      jobId: job.id,
    });

    return job;
  }

  // Get queue statistics
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total:
        waiting.length +
        active.length +
        completed.length +
        failed.length +
        delayed.length,
    };
  }

  // Get Bull Board router for Express
  getBullBoardRouter() {
    return this.serverAdapter.getRouter();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    logger.info("Dhutting down queues...");

    const closePromises = Array.from(this.queues.values()).map((queue) =>
      queue.close(),
    );

    await Promise.all(closePromises);
    logger.info("All queues closed");
  }
}

export const queueService = new QueueService();
