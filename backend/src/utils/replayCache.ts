/**
 * Replay Cache - Prevents signature replay attacks
 *
 * Uses Redis if available, falls back to in-memory cache.
 * Redis is preferred because:
 * - Survives server restarts
 * - Works across multiple server instances (load balancing)
 * - Automatic TTL cleanup
 */

import { createClient, RedisClientType } from 'redis';

// ===================
// Redis Connection
// ===================

const REDIS_URL = process.env.REDIS_URL;
let redisClient: RedisClientType | null = null;
let redisAvailable = false;

// In-memory fallback cache
const memoryCache = new Map<string, number>();
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every minute

// Initialize Redis if URL is provided
async function initializeRedis(): Promise<void> {
  if (!REDIS_URL) {
    console.log('[ReplayCache] REDIS_URL not set, using in-memory cache');
    return;
  }

  try {
    redisClient = createClient({ url: REDIS_URL });

    redisClient.on('error', (err) => {
      console.error('[ReplayCache] Redis error:', err.message);
      redisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[ReplayCache] Redis connected');
      redisAvailable = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('[ReplayCache] Redis reconnecting...');
    });

    await redisClient.connect();
    redisAvailable = true;
    console.log('[ReplayCache] Redis initialized successfully');
  } catch (error) {
    console.warn('[ReplayCache] Redis connection failed, using in-memory cache:', error);
    redisAvailable = false;
  }
}

// Clean up expired entries from memory cache
function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, expiry] of memoryCache.entries()) {
    if (now > expiry) {
      memoryCache.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupMemoryCache, CLEANUP_INTERVAL_MS);

// Initialize on module load
initializeRedis();

// ===================
// Cache Operations
// ===================

/**
 * Check if a signature has been used (replay attack check).
 * Returns true if signature was already used.
 */
export async function isSignatureUsed(key: string): Promise<boolean> {
  if (redisAvailable && redisClient) {
    try {
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[ReplayCache] Redis check failed, falling back to memory:', error);
      // Fall through to memory check
    }
  }

  // Memory fallback
  const expiry = memoryCache.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    memoryCache.delete(key);
    return false;
  }
  return true;
}

/**
 * Mark a signature as used.
 * @param key - Unique identifier for the signature (e.g., "login:wallet:signature")
 * @param ttlSeconds - Time-to-live in seconds (default: 5 minutes)
 */
export async function markSignatureUsed(key: string, ttlSeconds: number = 300): Promise<void> {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.setEx(key, ttlSeconds, '1');
      return;
    } catch (error) {
      console.error('[ReplayCache] Redis set failed, falling back to memory:', error);
      // Fall through to memory storage
    }
  }

  // Memory fallback
  memoryCache.set(key, Date.now() + ttlSeconds * 1000);
}

/**
 * Check if signature is used and mark it as used in one atomic operation.
 * Returns true if signature was already used (reject the request).
 */
export async function checkAndMarkSignature(key: string, ttlSeconds: number = 300): Promise<boolean> {
  if (redisAvailable && redisClient) {
    try {
      // SETNX returns 1 if key was set (not exists), 0 if key already exists
      const wasSet = await redisClient.setNX(key, '1');
      if (wasSet) {
        // Set TTL on the key
        await redisClient.expire(key, ttlSeconds);
        return false; // Signature was NOT used before
      }
      return true; // Signature WAS already used
    } catch (error) {
      console.error('[ReplayCache] Redis atomic check failed, falling back to memory:', error);
      // Fall through to memory check
    }
  }

  // Memory fallback (not truly atomic, but best effort)
  const expiry = memoryCache.get(key);
  if (expiry && Date.now() <= expiry) {
    return true; // Already used
  }
  memoryCache.set(key, Date.now() + ttlSeconds * 1000);
  return false; // Not used before
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  type: 'redis' | 'memory';
  available: boolean;
  memorySize: number;
} {
  return {
    type: redisAvailable ? 'redis' : 'memory',
    available: redisAvailable || true, // Memory is always available
    memorySize: memoryCache.size,
  };
}

/**
 * Gracefully shutdown Redis connection.
 */
export async function shutdown(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[ReplayCache] Redis connection closed');
    } catch (error) {
      console.error('[ReplayCache] Error closing Redis:', error);
    }
  }
}
