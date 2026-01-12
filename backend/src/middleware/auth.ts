import { Request, Response, NextFunction, RequestHandler } from 'express';

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
// Auth Middleware
// ===================

/**
 * Middleware that requires wallet authentication via header.
 *
 * Expected header:
 *   - x-wallet-address: The wallet public key (base58 encoded)
 *
 * NOTE: This is a basic implementation that trusts the header.
 * For production, implement signature verification using tweetnacl/bs58:
 *   - x-signature: Signature of "DegenDome:{timestamp}" message
 *   - x-timestamp: Unix timestamp when signature was created
 */
export function requireAuth(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      res.status(401).json({
        error: 'Authentication required. Provide x-wallet-address header.',
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
 * Use for endpoints like PUT /api/profile/:wallet
 */
export const requireOwnWallet: RequestHandler[] = [requireAuth(), requireWalletOwnership()];

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
