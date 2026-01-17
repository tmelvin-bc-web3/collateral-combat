import jwt from 'jsonwebtoken';

// JWT secret - MUST be set in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('[JWT] FATAL: JWT_SECRET not set in production!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '4h'; // Token valid for 4 hours (reduced from 24h for security)

export interface JwtPayload {
  wallet: string;
  iat?: number;
  exp?: number;
}

/**
 * Create a JWT token for a wallet address
 */
export function createToken(walletAddress: string): string {
  const payload: JwtPayload = {
    wallet: walletAddress,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 * Returns the wallet address if valid, null if invalid
 */
export function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded.wallet;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Supports: "Bearer <token>" format
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}
