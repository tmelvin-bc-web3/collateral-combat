// Socket.io Rate Limiter
// Limits the rate of socket events per client/wallet

interface SocketRateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window per key
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for socket rate limiting
const socketRateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of socketRateLimitStore.entries()) {
    if (now > entry.resetTime) {
      socketRateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

/**
 * Check if an action is rate limited
 * Returns true if the action should be blocked
 */
export function isRateLimited(
  key: string,
  config: SocketRateLimitConfig
): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = socketRateLimitStore.get(key);

  // Create new entry or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    socketRateLimitStore.set(key, entry);
    return { limited: false };
  }

  // Increment counter
  entry.count++;

  // Check if over limit
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

/**
 * Create a rate limit key for socket events
 */
export function createSocketKey(
  socketId: string,
  walletAddress: string | undefined,
  action: string
): string {
  // Use wallet if available (more accurate), fall back to socket ID
  const identifier = walletAddress || socketId;
  return `socket:${action}:${identifier}`;
}

// ===================
// Pre-configured Socket Rate Limits
// ===================

// Game join/leave actions (5 per minute - prevents spam joining)
export const GAME_JOIN_LIMIT: SocketRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5,
};

// Betting/prediction actions (20 per minute - allows active play)
export const BET_ACTION_LIMIT: SocketRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
};

// Subscription actions (10 per minute - prevents subscription spam)
export const SUBSCRIPTION_LIMIT: SocketRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
};

// General socket actions (100 per minute)
export const GENERAL_SOCKET_LIMIT: SocketRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

// Chat message actions (20 per minute - allows active chatting but prevents spam)
export const CHAT_MESSAGE_LIMIT: SocketRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
};

// ===================
// Helper for common rate limit check pattern
// ===================

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
}

/**
 * Check rate limit and return a standardized result
 */
export function checkSocketRateLimit(
  socketId: string,
  walletAddress: string | undefined,
  action: string,
  config: SocketRateLimitConfig
): RateLimitResult {
  const key = createSocketKey(socketId, walletAddress, action);
  const { limited, retryAfter } = isRateLimited(key, config);

  if (limited) {
    return {
      allowed: false,
      error: `Rate limit exceeded for ${action}. Please wait ${retryAfter} seconds.`,
    };
  }

  return { allowed: true };
}

// ===================
// Stats and Utilities
// ===================

export function getSocketRateLimitStats(): { totalKeys: number; activeKeys: number } {
  const now = Date.now();
  let activeKeys = 0;

  for (const entry of socketRateLimitStore.values()) {
    if (now <= entry.resetTime) {
      activeKeys++;
    }
  }

  return {
    totalKeys: socketRateLimitStore.size,
    activeKeys,
  };
}

export function clearSocketRateLimits(): void {
  socketRateLimitStore.clear();
}
