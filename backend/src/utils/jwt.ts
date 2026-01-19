import jwt from 'jsonwebtoken';
import { getTokenVersion } from '../db/authDatabase';

// JWT secret - MUST be set in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('[JWT] FATAL: JWT_SECRET not set in production!');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '4h'; // Token valid for 4 hours (reduced from 24h for security)

export interface JwtPayload {
  wallet: string;
  version: number; // Token version for revocation support
  iat?: number;
  exp?: number;
}

/**
 * Create a JWT token for a wallet address with version
 */
export function createToken(walletAddress: string, version: number = 1): string {
  const payload: JwtPayload = {
    wallet: walletAddress,
    version,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 * Returns the wallet address if valid, null if invalid
 * Also checks token version against database to support revocation
 */
export async function verifyToken(token: string): Promise<string | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check token version against current version in database
    const currentVersion = await getTokenVersion(decoded.wallet);
    if (decoded.version !== currentVersion) {
      // Token version doesn't match - token has been revoked
      return null;
    }

    return decoded.wallet;
  } catch {
    return null;
  }
}

/**
 * Verify token synchronously (without version check)
 * Use only when async is not possible, prefer verifyToken for security
 */
export function verifyTokenSync(token: string): string | null {
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
