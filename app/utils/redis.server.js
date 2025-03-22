/**
 * Redis client utility for caching
 * This file provides a Redis client instance and helper functions for caching
 */

import Redis from "ioredis";
import { logEvent, LogLevel, LogCategory } from "../services/logging.server.js";
import { withRetry } from "./retry.server.js";

// Initialize Redis client from environment variables or use default localhost
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "3600", 10); // Default 1 hour in seconds

let redisClient = null;

/**
 * Get Redis client instance with lazy initialization
 */
export function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        retryStrategy: (times) => {
          // Retry connection with exponential backoff
          const delay = Math.min(times * 100, 3000);
          console.log(`Retrying Redis connection attempt ${times} after ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 5,
        // Enable offline queue to prevent errors when Redis is temporarily unavailable
        enableOfflineQueue: true,
        // Connection timeout (5 seconds)
        connectTimeout: 5000,
        // Set a reasonable command timeout (2 seconds)
        commandTimeout: 2000
      });

      // Log Redis connection events
      redisClient.on("connect", () => {
        console.info("Redis client connected");
      });

      redisClient.on("ready", () => {
        console.info("Redis client ready and accepting commands");
      });

      redisClient.on("reconnecting", () => {
        console.info("Redis client reconnecting...");
      });

      redisClient.on("error", (err) => {
        console.error("Redis connection error:", err);
        logEvent({
          message: `Redis connection error: ${err.message}`,
          level: LogLevel.ERROR,
          category: LogCategory.SYSTEM,
          source: "redis.server.js",
          metadata: { error: err.message }
        }).catch(console.error);
      });
    } catch (error) {
      console.error("Failed to initialize Redis client:", error);
      logEvent({
        message: `Failed to initialize Redis client: ${error.message}`,
        level: LogLevel.ERROR,
        category: LogCategory.SYSTEM,
        source: "redis.server.js",
        metadata: { error: error.message }
      }).catch(console.error);
    }
  }
  
  return redisClient;
}

/**
 * Get a value from the cache with retry mechanism
 * @param {string} key - Cache key
 * @returns {Promise<any>} - The cached value or null
 */
export async function getCache(key) {
  return withRetry(async () => {
    const client = getRedisClient();
    if (!client) {
      return null;
    }
    
    const cachedData = await client.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  }, {
    maxRetries: 2,
    initialDelay: 200,
    retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'Stream isn\'t writeable']
  }).catch(error => {
    console.error(`Error getting cache for key ${key} after retries:`, error);
    return null;
  });
}

/**
 * Set a value in the cache with retry mechanism
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<boolean>} - True if successful
 */
export async function setCache(key, value, ttl = CACHE_TTL) {
  return withRetry(async () => {
    const client = getRedisClient();
    if (!client) {
      return false;
    }
    
    // Handle objects by serializing to JSON
    const serializedValue = typeof value === 'string' 
      ? value 
      : JSON.stringify(value);
    
    if (ttl > 0) {
      await client.set(key, serializedValue, 'EX', ttl);
    } else {
      await client.set(key, serializedValue);
    }
    return true;
  }, {
    maxRetries: 2,
    initialDelay: 200,
    retryableErrors: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'Stream isn\'t writeable']
  }).catch(error => {
    console.error(`Error setting cache for key ${key} after retries:`, error);
    return false;
  });
}

/**
 * Delete a value from the cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - True if successful
 */
export async function deleteCache(key) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple values matching a pattern
 * @param {string} pattern - Key pattern (e.g., "user:*")
 * @returns {Promise<boolean>} - True if successful
 */
export async function deleteCachePattern(pattern) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting cache pattern ${pattern}:`, error);
    return false;
  }
}

/**
 * Create a memoized function that uses Redis for caching
 * @param {Function} fn - The function to memoize
 * @param {string} keyPrefix - Prefix for cache keys
 * @param {number} ttl - Time to live in seconds
 * @returns {Function} - Memoized function
 */
export function memoize(fn, keyPrefix, ttl = CACHE_TTL) {
  return async (...args) => {
    // Create a cache key based on the function name, prefix and arguments
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
    
    // Try to get from cache first
    const cachedResult = await getCache(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }
    
    // Not in cache, execute function
    const result = await fn(...args);
    
    // Cache the result
    await setCache(cacheKey, result, ttl);
    
    return result;
  };
} 