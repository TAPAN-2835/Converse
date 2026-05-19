/**
 * 🚀 Horizontally Scalable Distributed Presence Cache
 * Abstracted Redis and Local memory fallback engine to guarantee 100% environment compatibility.
 */
class PresenceManager {
  constructor() {
    this.localCache = new Map(); // Fallback in-memory map
    this.isRedisConnected = false;
    this.redisClient = null;

    this.initializeRedis();
  }

  async initializeRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("Redis configuration not found. Initializing high-performance local memory fallback.");
      return;
    }

    try {
      // Dynamic import to prevent build errors if the peer dependency is omitted
      const { createClient } = await import("redis");
      this.redisClient = createClient({ url: redisUrl });

      this.redisClient.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isRedisConnected = false;
      });

      this.redisClient.on("connect", () => {
        console.log("🚀 Horizontally Scalable Presence Manager successfully connected to Redis.");
        this.isRedisConnected = true;
      });

      await this.redisClient.connect();
    } catch (err) {
      console.log("Could not establish Redis connection. Reverting to local memory store:", err.message);
      this.isRedisConnected = false;
    }
  }

  /**
   * Set user presence with TTL/Expiry to handle socket crashes automatically
   */
  async setPresence(userId, statusData, ttlSeconds = 300) {
    const presenceKey = `presence:${userId}`;
    const serializedData = JSON.stringify({
      ...statusData,
      updatedAt: new Date().toISOString()
    });

    if (this.isRedisConnected) {
      try {
        await this.redisClient.set(presenceKey, serializedData, { EX: ttlSeconds });
      } catch (err) {
        console.error("Redis setPresence failed:", err);
        this.localCache.set(userId, serializedData);
      }
    } else {
      this.localCache.set(userId, serializedData);
      // Local TTL handling fallback
      setTimeout(() => {
        if (this.localCache.get(userId) === serializedData) {
          this.localCache.delete(userId);
        }
      }, ttlSeconds * 1000);
    }
  }

  /**
   * Retrieve active presence data for a user
   */
  async getPresence(userId) {
    const presenceKey = `presence:${userId}`;

    if (this.isRedisConnected) {
      try {
        const data = await this.redisClient.get(presenceKey);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.error("Redis getPresence failed:", err);
        const localData = this.localCache.get(userId);
        return localData ? JSON.parse(localData) : null;
      }
    } else {
      const localData = this.localCache.get(userId);
      return localData ? JSON.parse(localData) : null;
    }
  }

  /**
   * Delete user presence cache on clean exit
   */
  async clearPresence(userId) {
    const presenceKey = `presence:${userId}`;

    if (this.isRedisConnected) {
      try {
        await this.redisClient.del(presenceKey);
      } catch (err) {
        console.error("Redis clearPresence failed:", err);
        this.localCache.delete(userId);
      }
    } else {
      this.localCache.delete(userId);
    }
  }
}

export const presenceManager = new PresenceManager();
