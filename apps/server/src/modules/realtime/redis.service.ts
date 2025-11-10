import Redis from "ioredis";

import logger from "@/config/logger";

class RedisService {
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor() {
    const redisConfig = {
      host: process.env.REDIST_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };

    this.client = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.publisher = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on("connect", () => {
      logger.info("Redis client connected");
    });

    this.client.on("error", (error) => {
      logger.info("Redis client error:", error);
    });

    this.subscriber.on("connect", () => {
      logger.info("Redis subscriber connected");
    });

    this.subscriber.on("connect", () => {
      logger.info("Redis publisher connected");
    });
  }

  // Cache operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Pub/Sub operations
  async public(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on("message", (receivedChannel, message) => {
      if (receivedChannel === channel) {
        callback(message);
      }
    });
  }

  // User presence operatinos
  async setUserOnline(userId: string, socketId: string): Promise<void> {
    await this.client.hset("users:online", userId, socketId);
    await this.client.sadd("online:users", userId);
  }

  async setUserOffline(userId: string): Promise<void> {
    await this.client.hdel("users:online", userId);
    await this.client.srem("online:users", userId);
  }

  async getOnlineUsers(): Promise<string[]> {
    return await this.client.smembers("online:users");
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const result = await this.client.sismember("online:users", userId);
    return result === 1;
  }

  // Room operations
  async joinRoom(userId: string, roomId: string): Promise<void> {
    await this.client.sadd(`room:${roomId}:users`, userId);
    await this.client.sadd(`user:${userId}:rooms`, roomId);
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    await this.client.srem(`room:${roomId}:users`, userId);
    await this.client.srem(`user:${userId}:rooms`, roomId);
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    return await this.client.smembers(`room:${roomId}:users`);
  }

  async getUserRooms(userId: string): Promise<string[]> {
    return await this.client.smembers(`user:${userId}:rooms`);
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
    logger.info("Redis connections closed");
  }
}

export const redisService = new RedisService();
