/**
 * Application configuration
 * CORS origins should be specified via ALLOWED_ORIGINS environment variable
 * as a comma-separated list of allowed origins.
 */

const parseAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
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
    // Allow requests with no origin (like mobile apps, curl, Postman)
    // In production, you may want to be more restrictive
    if (!origin) {
      callback(null, true);
      return;
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
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
