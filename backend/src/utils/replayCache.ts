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
const lockSet = new Set<string>(); // Synchronous lock for atomic check-and-set
const MAX_MEMORY_CACHE_SIZE = 100000; // 100k entries max (DDoS protection)
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
      // Use SET with NX and EX options (single atomic operation)
      // This is the correct way to set a key with expiry atomically
      const result = await redisClient.set(key, '1', {
        NX: true,  // Only set if not exists
        EX: ttlSeconds,  // Set expiry in same operation
      });
      // result is 'OK' if key was set, null if key already existed
      return result === null; // null means key existed (signature was used)
    } catch (error) {
      console.error('[ReplayCache] Redis atomic check failed, falling back to memory:', error);
      // Fall through to memory check
    }
  }

  // Memory fallback - use synchronous operations for atomicity
  // JavaScript is single-threaded, so synchronous check+set is atomic within one tick
  // But async operations between check and set create race window

  // Use a lock to make the operation atomic
  if (lockSet.has(key)) {
    return true; // Already being processed by another concurrent request
  }

  const expiry = memoryCache.get(key);
  if (expiry && Date.now() <= expiry) {
    return true; // Already used
  }

  // Check cache size limit to prevent memory exhaustion (DDoS protection)
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    // LRU-ish: delete oldest entries (first 10%)
    const deleteCount = Math.floor(MAX_MEMORY_CACHE_SIZE * 0.1);
    const keys = Array.from(memoryCache.keys()).slice(0, deleteCount);
    keys.forEach(k => memoryCache.delete(k));
    console.warn(`[ReplayCache] Cache size limit reached. Evicted ${deleteCount} oldest entries.`);
  }

  // Acquire lock, set value, release lock (all synchronous = atomic)
  lockSet.add(key);
  memoryCache.set(key, Date.now() + ttlSeconds * 1000);
  // Release lock after a microtask to allow the value to be set
  setImmediate(() => lockSet.delete(key));

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
