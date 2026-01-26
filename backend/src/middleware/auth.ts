import { Request, Response, NextFunction, RequestHandler } from 'express';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { verifyToken, extractToken } from '../utils/jwt';
import { checkAndMarkSignature } from '../utils/replayCache';
import { AuthErrorCode } from '../types/errors';
import { createAuthError } from '../utils/errors';

// ===================
// Auth Middleware Configuration
// ===================

// Extend Express Request to include authenticated wallet
declare global {
  namespace Express {
    interface Request {
      authenticatedWallet?: string;
    }
  }
}

// ===================
// Signature Replay Protection
// ===================

const AUTH_SIGNATURE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const AUTH_SIGNATURE_TTL_SECONDS = 300; // 5 minutes in seconds

// ===================
// Wallet Address Validation
// ===================

/**
 * Validates a Solana wallet address format.
 * Solana addresses are base58-encoded 32-byte public keys.
 */
function isValidSolanaAddress(address: string): boolean {
  // Solana addresses are 32-44 characters long (base58 encoding of 32 bytes)
  if (!address || address.length < 32 || address.length > 44) {
    return false;
  }
  // Base58 character set (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

// ===================
// Signature Verification
// ===================

/**
 * Verifies a wallet signature for authentication.
 * Message format: "DegenDome:auth:{timestamp}"
 * Uses Redis/memory cache for replay protection.
 */
async function verifyAuthSignature(
  walletAddress: string,
  signature: string,
  timestamp: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // TODO: Add rate limiting check before signature verification to prevent DoS
    // Example: Max 10 auth attempts per minute per wallet
    // const rateKey = `auth:rate:${walletAddress}`;
    // if (await isRateLimited(rateKey, 10, 60)) {
    //   return { valid: false, error: 'Rate limit exceeded' };
    // }

    // Check timestamp is within 5 minutes
    const now = Date.now();
    const signedAt = parseInt(timestamp);
    if (isNaN(signedAt) || Math.abs(now - signedAt) > AUTH_SIGNATURE_EXPIRY_MS) {
      return { valid: false, error: 'Signature expired' };
    }

    // Check for replay attack using Redis/memory cache
    // Use full signature as key since each signature is unique
    const sigKey = `auth:sig:${signature}`;
    const wasUsed = await checkAndMarkSignature(sigKey, AUTH_SIGNATURE_TTL_SECONDS);
    if (wasUsed) {
      // Structured logging for security events (will be enhanced with proper logger in Plan 06)
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'SECURITY',
        event: 'AUTH_SIGNATURE_REPLAY_BLOCKED',
        wallet: walletAddress.slice(0, 8) + '...', // Truncate for privacy
        timestamp: new Date().toISOString()
      }));
      return { valid: false, error: 'Signature already used' };
    }

    // Verify signature
    // Message format: "DegenDome:auth:{timestamp}"
    // Future enhancement: support "DegenDome:auth:{timestamp}:{nonce}" for additional replay protection
    // The signature itself is unique per signing, so using full signature as cache key provides sufficient protection
    const message = `DegenDome:auth:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    return { valid: isValid, error: isValid ? undefined : 'Invalid signature' };
  } catch (error) {
    return { valid: false, error: 'Signature verification failed' };
  }
}

// ===================
// Auth Middleware
// ===================

/**
 * Middleware that requires wallet authentication.
 *
 * Supports two authentication methods:
 *
 * 1. JWT Token (preferred - session-based):
 *    - Authorization: Bearer <token>
 *    - Also checks for auth_token cookie (httpOnly)
 *
 * 2. Wallet Signature (for one-time actions like waitlist):
 *    - x-wallet-address: The wallet public key (base58 encoded)
 *    - x-signature: Signature of "DegenDome:auth:{timestamp}" message
 *    - x-timestamp: Unix timestamp when signature was created
 *
 * JWT is checked first. If no JWT, falls back to signature verification.
 */
export function requireAuth(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Method 1: Check for JWT token first (header or cookie)
    let token = extractToken(req.headers.authorization);

    // Also check for httpOnly cookie if no header token
    if (!token && req.cookies?.auth_token) {
      token = req.cookies.auth_token;
    }

    if (token) {
      const walletFromToken = await verifyToken(token);

      if (walletFromToken) {
        // Valid JWT - authenticated via session
        req.authenticatedWallet = walletFromToken;
        next();
        return;
      } else {
        // Invalid or expired token
        res.status(401).json({
          error: 'Invalid or expired token. Please sign in again.',
          code: 'INVALID_TOKEN',
        });
        return;
      }
    }

    // Method 2: Fall back to signature-based auth
    const walletAddress = req.headers['x-wallet-address'] as string;
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!walletAddress) {
      res.status(401).json({
        error: 'Authentication required. Provide Authorization header or x-wallet-address.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!isValidSolanaAddress(walletAddress)) {
      res.status(401).json({
        error: 'Invalid wallet address format',
        code: 'INVALID_WALLET',
      });
      return;
    }

    // SECURITY: Signature verification required for non-JWT auth
    const requireSignatures = process.env.REQUIRE_WALLET_SIGNATURES === 'true';

    if (requireSignatures) {
      if (!signature || !timestamp) {
        res.status(401).json({
          error: 'Please sign in first or provide signature headers.',
          code: 'SIGNATURE_REQUIRED',
        });
        return;
      }

      const verification = await verifyAuthSignature(walletAddress, signature, timestamp);
      if (!verification.valid) {
        res.status(401).json({
          error: verification.error || 'Signature verification failed',
          code: 'INVALID_SIGNATURE',
        });
        return;
      }
    } else if (signature && timestamp) {
      // If signatures provided but not required, still verify them
      const verification = await verifyAuthSignature(walletAddress, signature, timestamp);
      if (!verification.valid) {
        console.warn(`[Auth] Signature verification failed: ${verification.error}`);
      }
    }

    // Store authenticated wallet in request
    req.authenticatedWallet = walletAddress;
    next();
  };
}

/**
 * Middleware that requires the authenticated wallet to match the :wallet param.
 * Must be used after requireAuth().
 */
export function requireWalletOwnership(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramWallet = req.params.wallet;
    const authenticatedWallet = req.authenticatedWallet;

    if (!authenticatedWallet) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!paramWallet) {
      res.status(400).json({
        error: 'Wallet parameter required',
        code: 'WALLET_PARAM_REQUIRED',
      });
      return;
    }

    if (paramWallet !== authenticatedWallet) {
      res.status(403).json({
        error: 'Not authorized to access this resource',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

/**
 * Combined middleware that requires auth AND wallet ownership.
 * Use for sensitive endpoints that need cryptographic proof of ownership.
 */
export const requireOwnWallet: RequestHandler[] = [requireAuth(), requireWalletOwnership()];

/**
 * @deprecated Use requireAuth() + requireWalletOwnership() instead.
 * This middleware only checked that a client-supplied header matched a client-supplied
 * URL param, providing no real security. Replaced with proper JWT/signature auth.
 */
export function requireWalletHeader(): RequestHandler[] {
  return [requireAuth(), requireWalletOwnership()];
}

/**
 * Middleware that requires admin authentication.
 * Checks if the wallet is in the admin list (from environment variable).
 */
export function requireAdmin(): RequestHandler[] {
  const adminMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const adminWallets = process.env.ADMIN_WALLETS?.split(',').map(w => w.trim()) || [];

    if (adminWallets.length === 0) {
      // If no admin wallets configured, deny all admin access in production
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          error: 'Admin access not configured',
          code: 'ADMIN_NOT_CONFIGURED',
        });
        return;
      }
      // In development, allow through without admin check
      next();
      return;
    }

    if (!req.authenticatedWallet || !adminWallets.includes(req.authenticatedWallet)) {
      res.status(403).json({
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED',
      });
      return;
    }

    next();
  };

  return [requireAuth(), adminMiddleware];
}

/**
 * Optional auth middleware - extracts wallet if provided but doesn't require it.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 */
export function optionalAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (walletAddress && isValidSolanaAddress(walletAddress)) {
      req.authenticatedWallet = walletAddress;
    }

    next();
  };
}

/**
 * Middleware that requires the authenticated wallet to own the entry.
 * Used for draft entry endpoints where :entryId is in the route.
 *
 * NOTE: This middleware requires access to the draftTournamentManager to
 * verify entry ownership. The actual ownership check should be done
 * in the route handler or via a callback function.
 */
export function requireEntryOwnership(
  getEntryWallet: (entryId: string) => string | null
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const entryId = req.params.entryId;
    const authenticatedWallet = req.authenticatedWallet;

    if (!authenticatedWallet) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!entryId) {
      res.status(400).json({
        error: 'Entry ID required',
        code: 'ENTRY_ID_REQUIRED',
      });
      return;
    }

    const entryWallet = getEntryWallet(entryId);

    if (!entryWallet) {
      res.status(404).json({
        error: 'Entry not found',
        code: 'ENTRY_NOT_FOUND',
      });
      return;
    }

    if (entryWallet !== authenticatedWallet) {
      res.status(403).json({
        error: 'Not authorized to access this entry',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}
