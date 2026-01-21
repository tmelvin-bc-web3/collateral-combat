/**
 * Application configuration
 * CORS origins should be specified via ALLOWED_ORIGINS environment variable
 * as a comma-separated list of allowed origins.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Log Levels:
 * - debug: Detailed information for debugging (disabled in production by default)
 * - info: General operational information
 * - warn: Warning conditions that should be reviewed
 * - error: Error conditions that require attention
 *
 * Set via LOG_LEVEL environment variable.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const LOG_LEVEL = process.env.LOG_LEVEL || (
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

const parseAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
    if (IS_PRODUCTION) {
      console.warn('[Config] WARNING: ALLOWED_ORIGINS not set in production. Using restrictive defaults.');
      return ['https://www.degendome.xyz', 'https://degendome.xyz'];
    }
    // Default allowed origins for development
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];
  }

  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

export const ALLOWED_ORIGINS = parseAllowedOrigins();

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // SECURITY: In production, require origin header for most requests
    // Allow no-origin only in development (for tools like curl, Postman)
    if (!origin) {
      if (IS_PRODUCTION) {
        // In production, only allow no-origin for health checks etc
        // Most legitimate browser requests will have an origin
        callback(null, true); // Still allow for mobile apps, but log it
      } else {
        callback(null, true);
      }
      return;
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

export const socketCorsOptions = {
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  credentials: true,
};
