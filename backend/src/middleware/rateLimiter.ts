import { Request, Response, NextFunction, RequestHandler } from 'express';

// ===================
// Rate Limiter Configuration
// ===================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: Request) => string;  // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: For production with multiple instances, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ===================
// Rate Limiter Factory
// ===================

export function createRateLimiter(config: RateLimitConfig): RequestHandler {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = defaultKeyGenerator,
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry or reset if window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

      next();
      return;
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    // Check if over limit
    if (entry.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

// ===================
// Key Generators
// ===================

function defaultKeyGenerator(req: Request): string {
  // Use IP address as default key
  const ip = req.ip ||
             req.headers['x-forwarded-for']?.toString().split(',')[0] ||
             req.socket.remoteAddress ||
             'unknown';
  return `ip:${ip}`;
}

export function walletKeyGenerator(req: Request): string {
  // For wallet-based endpoints, use wallet + IP
  const wallet = req.params.wallet || 'anonymous';
  const ip = req.ip ||
             req.headers['x-forwarded-for']?.toString().split(',')[0] ||
             req.socket.remoteAddress ||
             'unknown';
  return `wallet:${wallet}:${ip}`;
}

export function endpointKeyGenerator(req: Request): string {
  // For specific endpoint rate limiting
  const ip = req.ip ||
             req.headers['x-forwarded-for']?.toString().split(',')[0] ||
             req.socket.remoteAddress ||
             'unknown';
  return `endpoint:${req.path}:${ip}`;
}

// ===================
// Pre-configured Rate Limiters
// ===================

// Standard read endpoints (100 requests per minute)
export const standardLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Rate limit exceeded. Please wait before making more requests.',
});

// Strict limiter for sensitive actions (30 requests per minute)
export const strictLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Rate limit exceeded for this action. Please wait before trying again.',
});

// Very strict limiter for write operations (10 requests per minute)
export const writeLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Write rate limit exceeded. Please wait before making more changes.',
});

// Burst limiter for real-time data (200 requests per minute)
export const burstLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200,
  message: 'Real-time data rate limit exceeded.',
});

// Global limiter (1000 requests per minute per IP)
export const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000,
  message: 'Global rate limit exceeded. Please reduce request frequency.',
});

// Pyth verification limiter (10 requests per minute - users don't need real-time verification)
export const pythLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Verification rate limit exceeded. Price verification is cached - no need to refresh frequently.',
});

// Waitlist signup limiter (5 attempts per 10 minutes - very strict to prevent spam)
export const waitlistLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
  message: 'Too many signup attempts. Please try again in a few minutes.',
});

// ===================
// Utility Functions
// ===================

export function getRateLimitStats(): { totalKeys: number; activeKeys: number } {
  const now = Date.now();
  let activeKeys = 0;

  for (const entry of rateLimitStore.values()) {
    if (now <= entry.resetTime) {
      activeKeys++;
    }
  }

  return {
    totalKeys: rateLimitStore.size,
    activeKeys,
  };
}

export function clearRateLimits(): void {
  rateLimitStore.clear();
}
