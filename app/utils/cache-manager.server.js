/**
 * Cache management utility for monitoring and managing the Redis cache
 */
import { getRedisClient } from './redis.server.js';
import { logEvent, LogLevel, LogCategory } from '../services/logging.server.js';

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache statistics
 */
export async function getCacheStats() {
  const client = getRedisClient();
  if (!client) {
    return {
      status: 'disconnected',
      keyCount: 0,
      memoryUsage: 0,
      uptime: 0
    };
  }
  
  try {
    const info = await client.info();
    const keyCount = await client.dbsize();
    
    // Parse Redis INFO command output
    const lines = info.split('\r\n');
    const parsedInfo = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsedInfo[key.trim()] = value.trim();
        }
      }
    }
    
    return {
      status: 'connected',
      keyCount,
      memoryUsage: parsedInfo.used_memory_human || '0B',
      uptime: parsedInfo.uptime_in_seconds ? Math.floor(parsedInfo.uptime_in_seconds / 60) : 0,
      hitRate: parsedInfo.keyspace_hits ? 
        (parseInt(parsedInfo.keyspace_hits) / (parseInt(parsedInfo.keyspace_hits) + parseInt(parsedInfo.keyspace_misses)) * 100).toFixed(2) : 
        '0.00'
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    logEvent({
      message: `Error getting cache stats: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { error: error.message }
    }).catch(console.error);
    
    return {
      status: 'error',
      keyCount: 0,
      memoryUsage: '0B',
      uptime: 0,
      error: error.message
    };
  }
}

/**
 * Clear all caches
 * @returns {Promise<Object>} Result of the clear operation
 */
export async function clearAllCaches() {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      message: 'Redis client not available'
    };
  }
  
  try {
    await client.flushdb();
    
    // Log the cache clear
    await logEvent({
      message: "Cleared all Redis caches",
      level: LogLevel.INFO,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js"
    });
    
    return {
      success: true,
      message: 'All caches cleared successfully'
    };
  } catch (error) {
    console.error("Error clearing cache:", error);
    
    await logEvent({
      message: `Error clearing Redis caches: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { error: error.message }
    });
    
    return {
      success: false,
      message: `Error clearing caches: ${error.message}`
    };
  }
}

/**
 * Get all cache keys matching a pattern
 * @param {string} pattern - Key pattern (default: *)
 * @returns {Promise<Array<string>>} - List of matching keys
 */
export async function getCacheKeys(pattern = '*') {
  const client = getRedisClient();
  if (!client) {
    return [];
  }
  
  try {
    return await client.keys(pattern);
  } catch (error) {
    console.error(`Error getting cache keys for pattern ${pattern}:`, error);
    return [];
  }
}

/**
 * Clear caches by key pattern
 * @param {string} pattern - Key pattern to match
 * @returns {Promise<Object>} Result of the clear operation
 */
export async function clearCachePattern(pattern) {
  const client = getRedisClient();
  if (!client) {
    return {
      success: false,
      message: 'Redis client not available'
    };
  }
  
  try {
    const keys = await client.keys(pattern);
    let deletedCount = 0;
    
    if (keys.length > 0) {
      deletedCount = await client.del(...keys);
    }
    
    // Log the cache clear
    await logEvent({
      message: `Cleared ${deletedCount} Redis caches matching pattern: ${pattern}`,
      level: LogLevel.INFO,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { pattern, deletedCount }
    });
    
    return {
      success: true,
      message: `Cleared ${deletedCount} caches matching pattern: ${pattern}`,
      deletedCount
    };
  } catch (error) {
    console.error(`Error clearing cache pattern ${pattern}:`, error);
    
    await logEvent({
      message: `Error clearing Redis caches with pattern ${pattern}: ${error.message}`,
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      source: "cache-manager.server.js",
      metadata: { pattern, error: error.message }
    });
    
    return {
      success: false,
      message: `Error clearing caches: ${error.message}`
    };
  }
} 