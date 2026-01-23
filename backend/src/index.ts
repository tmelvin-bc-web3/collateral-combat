import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { corsOptions, socketCorsOptions } from './config';
import { logger, createLogger } from './utils/logger';
import { priceService } from './services/priceService';
import { battleManager } from './services/battleManager';
import { spectatorService } from './services/spectatorService';
import { battleSimulator } from './services/battleSimulator';
// Use off-chain prediction service for development (on-chain requires funded authority wallet)
import { predictionService } from './services/predictionService';
import { coinMarketCapService } from './services/coinMarketCapService';
import { draftTournamentManager } from './services/draftTournamentManager';
import { progressionService } from './services/progressionService';
import { freeBetEscrowService } from './services/freeBetEscrowService';
import { rakeRebateService } from './services/rakeRebateService';
import { battleSettlementService } from './services/battleSettlementService';
import { challengeNotificationService } from './services/challengeNotificationService';
import { ldsManager, LDSEvent } from './services/ldsManager';
import { tokenWarsManager, TWEvent } from './services/tokenWarsManager';
import { pythVerificationService } from './services/pythVerificationService';
import { chatService } from './services/chatService';
import { scheduledMatchManager } from './services/scheduledMatchManager';
import { startBackupScheduler } from './services/backupService';
import adminRoutes from './routes/admin';
import { setActiveConnections } from './services/adminService';
import * as adminService from './services/adminService';
import { alertService } from './services/alertService';
import { getProfile, upsertProfile, getProfiles, deleteProfile, isUsernameTaken, ProfilePictureType } from './db/database';
import * as userStatsDb from './db/userStatsDatabase';
import * as notificationDb from './db/notificationDatabase';
import * as achievementDb from './db/achievementDatabase';
import * as progressionDb from './db/progressionDatabase';
import * as waitlistDb from './db/waitlistDatabase';
import * as sharesDb from './db/sharesDatabase';
import * as challengesDb from './db/challengesDatabase';
import { ensureTokenVersion } from './db/authDatabase';
import { globalLimiter, standardLimiter, strictLimiter, writeLimiter, burstLimiter, pythLimiter, waitlistLimiter } from './middleware/rateLimiter';
import { checkSocketRateLimit, GAME_JOIN_LIMIT, BET_ACTION_LIMIT, SUBSCRIPTION_LIMIT, CHAT_MESSAGE_LIMIT } from './middleware/socketRateLimiter';
import { requireAuth, requireOwnWallet, requireAdmin, requireEntryOwnership, requireWalletHeader } from './middleware/auth';
import { createToken, verifyToken, verifyTokenSync } from './utils/jwt';
import { checkAndMarkSignature } from './utils/replayCache';
import { TRADABLE_ASSETS } from './tokens';
import { BattleConfig, ServerToClientEvents, ClientToServerEvents, PredictionSide, DraftTournamentTier, WagerType } from './types';
import { Request, Response } from 'express';
import { z } from 'zod';
import { validateBattleConfig } from './validation';

// ===================
// Service-Specific Loggers
// ===================
const socketLogger = createLogger('socket');
const authLogger = createLogger('auth');
const battleLogger = createLogger('battle');
const challengeLogger = createLogger('challenge');
const apiLogger = createLogger('api');

// ===================
// Wallet Signature Verification with Replay Protection
// ===================

// SECURITY: In-memory cache to prevent signature replay attacks
// Maps signature hash to expiry timestamp
const usedSignatures = new Map<string, number>();
const SIGNATURE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired signatures every minute
setInterval(() => {
  const now = Date.now();
  for (const [sig, expiry] of usedSignatures.entries()) {
    if (now > expiry) {
      usedSignatures.delete(sig);
    }
  }
}, 60 * 1000);

function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    const message = `DegenDome:waitlist:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = bs58.decode(walletAddress);

    // Check timestamp is within 5 minutes
    const now = Date.now();
    const signedAt = parseInt(timestamp);
    if (isNaN(signedAt) || Math.abs(now - signedAt) > SIGNATURE_EXPIRY_MS) {
      return false;
    }

    // SECURITY: Check for signature replay
    const sigKey = `${walletAddress}:${signature}`;
    if (usedSignatures.has(sigKey)) {
      logSecurityEvent('SIGNATURE_REPLAY_BLOCKED', { wallet: walletAddress });
      return false;
    }

    // Verify the signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (isValid) {
      // Mark signature as used with expiry time
      usedSignatures.set(sigKey, now + SIGNATURE_EXPIRY_MS);
    }

    return isValid;
  } catch {
    return false;
  }
}

// Helper to extract client IP from request
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress;
}

// SECURITY: Logging for security events
// Logger automatically masks sensitive fields (signatures, secrets, wallets)
function logSecurityEvent(event: string, details: Record<string, any>) {
  // Additional masking for email and IP if present
  const maskedDetails = { ...details };
  if (maskedDetails.email && typeof maskedDetails.email === 'string') {
    maskedDetails.email = maskedDetails.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
  }
  if (maskedDetails.ip && typeof maskedDetails.ip === 'string') {
    maskedDetails.ip = maskedDetails.ip.replace(/\.\d+$/, '.***');
  }

  authLogger.security(event, maskedDetails);
}

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: socketCorsOptions,
});

// ===================
// SECURITY: Socket Authentication Middleware
// ===================
// Authenticate socket connections using JWT token
// This prevents wallet spoofing - clients can't claim to be a different wallet
// Note: Uses sync version because socket.io middleware is synchronous
// Token version check is skipped here for performance - financial ops will verify properly
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (token) {
    const wallet = verifyTokenSync(token);
    if (wallet) {
      // Store authenticated wallet on socket - this CANNOT be spoofed by client
      socket.data.authenticatedWallet = wallet;
      socketLogger.debug('Authenticated socket connection', { wallet });
    }
  }

  // Allow connection even without auth - some events don't require it (subscriptions, viewing)
  // But financial operations will check socket.data.authenticatedWallet
  next();
});

// Helper to get authenticated wallet or throw error
function getAuthenticatedWallet(socket: any, clientWallet?: string): string {
  // If socket has authenticated wallet, use it (secure)
  if (socket.data.authenticatedWallet) {
    // If client also provided wallet, verify it matches
    if (clientWallet && clientWallet !== socket.data.authenticatedWallet) {
      throw new Error('Wallet mismatch - authenticated wallet does not match provided wallet');
    }
    return socket.data.authenticatedWallet;
  }

  // Fallback: If no JWT auth, require wallet parameter
  // This maintains backwards compatibility but logs a warning
  if (clientWallet) {
    socketLogger.warn('Unauthenticated socket using wallet - consider requiring JWT', { wallet: clientWallet });
    return clientWallet;
  }

  throw new Error('Not authenticated - please sign in first');
}

// SECURITY: Freeze Object prototype to prevent prototype pollution attacks
Object.freeze(Object.prototype);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' })); // Limit request body size

// Apply global rate limiting to all API routes
app.use('/api', globalLimiter);

// Helper function to get wallet address from draft entry
const getEntryWallet = (entryId: string): string | null => {
  const entry = draftTournamentManager.getEntry(entryId);
  return entry?.walletAddress || null;
};

// Create reusable entry ownership middleware
const requireDraftEntryOwnership = [requireAuth(), requireEntryOwnership(getEntryWallet)];

// ===================
// Health Check Endpoints (Kubernetes-compatible)
// ===================

// Liveness probe - is the app running?
app.get('/livez', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now()
  });
});

// Readiness probe - is the app ready to serve traffic?
app.get('/readyz', async (req, res) => {
  try {
    const health = await adminService.getHealthStatus();

    if (health.database.status === 'down') {
      return res.status(503).json({
        status: 'not ready',
        reason: 'database unavailable',
        timestamp: Date.now()
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// REST API Routes

// Get all tradable assets
app.get('/api/tokens', (req, res) => {
  res.json(TRADABLE_ASSETS);
});

// Get current prices
app.get('/api/prices', (req, res) => {
  res.json({
    prices: priceService.getAllPrices(),
    lastUpdate: priceService.getLastUpdate(),
  });
});

// Get price history for a symbol
app.get('/api/prices/history/:symbol', burstLimiter, (req, res) => {
  const duration = parseInt(req.query.duration as string) || 60000;
  const history = priceService.getPriceHistory(req.params.symbol.toUpperCase(), duration);
  res.json(history);
});

// ==================== PRICE VERIFICATION API ====================
// Rate limited to 10 req/min to prevent abuse and protect Pyth API

// Get current Pyth price for a symbol (makes external API call)
app.get('/api/prices/pyth/:symbol', pythLimiter, async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!pythVerificationService.isSupported(symbol)) {
    return res.status(400).json({ error: `Symbol ${symbol} not supported by Pyth` });
  }
  const pythPrice = await pythVerificationService.getPythPrice(symbol);
  const backendPrice = priceService.getPrice(symbol);
  res.json({
    symbol,
    backendPrice,
    pythPrice: pythPrice?.price || null,
    pythConfidence: pythPrice?.confidence || null,
    pythPublishTime: pythPrice?.publishTime || null,
    supported: true,
  });
});

// Get supported Pyth symbols
app.get('/api/prices/pyth/symbols', (req, res) => {
  res.json({ symbols: pythVerificationService.getSupportedSymbols() });
});

// Get price verification audit records (reads from memory, less strict)
app.get('/api/verification/audit', standardLimiter, (req, res) => {
  const gameType = req.query.gameType as string | undefined;
  const gameId = req.query.gameId as string | undefined;
  const limit = parseInt(req.query.limit as string) || 100;
  const records = pythVerificationService.getAuditRecords(gameType, gameId, limit);
  res.json({ records, count: records.length });
});

// Get flagged discrepancies (reads from memory)
app.get('/api/verification/flagged', standardLimiter, (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const records = pythVerificationService.getFlaggedRecords(limit);
  res.json({ records, count: records.length });
});

// Get verification summary for a specific game (reads from memory)
app.get('/api/verification/game/:gameType/:gameId', standardLimiter, (req, res) => {
  const summary = pythVerificationService.getGameVerificationSummary(
    req.params.gameType,
    req.params.gameId
  );
  res.json(summary);
});

// ==================== END PRICE VERIFICATION API ====================

// Get active battles
app.get('/api/battles', (req, res) => {
  res.json(battleManager.getActiveBattles());
});

// Get live battles for spectators (must be before :id route)
app.get('/api/battles/live', (req, res) => {
  res.json(spectatorService.getLiveBattles());
});

// Get recent completed battles
app.get('/api/battles/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(battleManager.getRecentBattles(limit));
});

// Get specific battle
app.get('/api/battles/:id', (req, res) => {
  const battle = battleManager.getBattle(req.params.id);
  if (!battle) {
    return res.status(404).json({ error: 'Battle not found' });
  }
  res.json(battle);
});

// Get player's current battle
app.get('/api/player/:wallet/battle', (req, res) => {
  const battle = battleManager.getPlayerBattle(req.params.wallet);
  res.json(battle || null);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    priceServiceLastUpdate: priceService.getLastUpdate(),
  });
});

// Profile endpoints

// Check if username is available
app.get('/api/username/check/:username', async (req, res) => {
  const username = req.params.username;
  const excludeWallet = req.query.wallet as string | undefined;

  if (!username || username.length > 20) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  const taken = await isUsernameTaken(username, excludeWallet);
  res.json({ available: !taken, username });
});

app.get('/api/profile/:wallet', async (req, res) => {
  const profile = await getProfile(req.params.wallet);
  if (!profile) {
    return res.json({
      walletAddress: req.params.wallet,
      pfpType: 'default',
      updatedAt: 0,
    });
  }
  res.json(profile);
});

app.put('/api/profile/:wallet', requireOwnWallet, standardLimiter, async (req: Request, res: Response) => {
  try {
    const { pfpType, presetId, nftMint, nftImageUrl, username } = req.body;

    if (!pfpType || !['preset', 'nft', 'default'].includes(pfpType)) {
      return res.status(400).json({ error: 'Invalid pfpType' });
    }

    if (pfpType === 'preset' && !presetId) {
      return res.status(400).json({ error: 'presetId required for preset type' });
    }

    if (pfpType === 'nft' && (!nftMint || !nftImageUrl)) {
      return res.status(400).json({ error: 'nftMint and nftImageUrl required for nft type' });
    }

    // SECURITY: Validate NFT image URL
    if (pfpType === 'nft' && nftImageUrl) {
      try {
        const url = new URL(nftImageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return res.status(400).json({ error: 'Invalid image URL protocol' });
        }
        // Block localhost and internal IPs
        const hostname = url.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
          return res.status(400).json({ error: 'Invalid image URL' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid image URL format' });
      }
    }

    // Determine username value:
    // - undefined in request body = preserve existing (don't include in update)
    // - null or '' = explicitly clear username
    // - valid string = set new username
    let usernameValue: string | undefined = undefined;
    const usernameInRequest = 'username' in req.body;

    if (usernameInRequest) {
      if (username === null || username === '') {
        // Explicitly clearing username - pass empty string to trigger clear
        usernameValue = '';
      } else if (typeof username === 'string') {
        // Validate the new username
        if (username.length > 20) {
          return res.status(400).json({ error: 'Username must be 20 characters or less' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }
        // Check if username is already taken by another user
        if (await isUsernameTaken(username, req.params.wallet)) {
          return res.status(409).json({ error: 'Username is already taken' });
        }
        usernameValue = username;
      }
    }
    // If usernameValue stays undefined, upsertProfile will preserve existing username

    const profile = await upsertProfile({
      walletAddress: req.params.wallet,
      username: usernameValue,
      pfpType: pfpType as ProfilePictureType,
      presetId: pfpType === 'preset' ? presetId : undefined,
      nftMint: pfpType === 'nft' ? nftMint : undefined,
      nftImageUrl: pfpType === 'nft' ? nftImageUrl : undefined,
    });

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profiles', async (req, res) => {
  const walletsParam = req.query.wallets as string;
  if (!walletsParam) {
    return res.status(400).json({ error: 'wallets query parameter required' });
  }

  const wallets = walletsParam.split(',').filter(w => w.length > 0);
  if (wallets.length === 0) {
    return res.json([]);
  }

  const profiles = await getProfiles(wallets);
  res.json(profiles);
});

app.delete('/api/profile/:wallet', requireOwnWallet, strictLimiter, async (req: Request, res: Response) => {
  const deleted = await deleteProfile(req.params.wallet);
  res.json({ deleted });
});

// ===================
// Authentication Endpoints
// ===================

/**
 * POST /api/auth/login
 * Sign in with wallet signature to get a JWT token
 *
 * Headers:
 *   x-wallet-address: Wallet public key (base58)
 *   x-signature: Signature of "DegenDome:login:{timestamp}"
 *   x-timestamp: Unix timestamp (ms)
 *
 * Returns: { token: string, expiresIn: string }
 * Also sets httpOnly cookie for enhanced security
 */
app.post('/api/auth/login', strictLimiter, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    // Validate required headers
    if (!walletAddress || !signature || !timestamp) {
      return res.status(400).json({
        error: 'Missing required headers: x-wallet-address, x-signature, x-timestamp',
      });
    }

    // Validate wallet address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify signature (using login-specific message)
    const message = `DegenDome:login:${timestamp}`;
    const messageBytes = new TextEncoder().encode(message);

    try {
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);

      // Check timestamp is within 5 minutes
      const now = Date.now();
      const signedAt = parseInt(timestamp);
      if (isNaN(signedAt) || Math.abs(now - signedAt) > 5 * 60 * 1000) {
        return res.status(401).json({ error: 'Signature expired' });
      }

      // Check for replay attack using Redis/memory cache
      const sigKey = `login:${walletAddress}:${signature}`;
      const wasUsed = await checkAndMarkSignature(sigKey, 300);
      if (wasUsed) {
        logSecurityEvent('LOGIN_REPLAY_BLOCKED', { wallet: walletAddress });
        return res.status(401).json({ error: 'Signature already used' });
      }

      // Verify the signature
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

      if (!isValid) {
        logSecurityEvent('LOGIN_INVALID_SIGNATURE', { wallet: walletAddress });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Get/create token version for this wallet
      const tokenVersion = await ensureTokenVersion(walletAddress);

      // Create JWT token with version
      const token = createToken(walletAddress, tokenVersion);

      authLogger.info('Login successful', { wallet: walletAddress });

      // Set httpOnly cookie for enhanced security
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 4 * 60 * 60 * 1000, // 4 hours (matches JWT expiry)
        path: '/',
      });

      // Also return token in body for clients that need it
      res.json({
        token,
        expiresIn: '4h',
        wallet: walletAddress,
      });
    } catch {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    authLogger.error('Login error', { error: String(error) });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/verify
 * Verify a JWT token is still valid (checks version for revocation)
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   OR auth_token cookie
 *
 * Returns: { valid: boolean, wallet?: string }
 */
app.get('/api/auth/verify', async (req: Request, res: Response) => {
  // Check header first, then cookie
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.json({ valid: false });
  }

  try {
    const wallet = await verifyToken(token);

    if (wallet) {
      res.json({ valid: true, wallet, walletAddress: wallet });
    } else {
      res.json({ valid: false });
    }
  } catch {
    res.json({ valid: false });
  }
});

/**
 * POST /api/auth/logout
 * Clear the auth cookie
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  });

  res.json({ success: true, message: 'Logged out' });
});

// ===================
// NFT API Proxy (hides Helius API key)
// ===================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  : null;

// Get wallet NFTs (proxied through backend to hide API key)
app.get('/api/nfts/:wallet', standardLimiter, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.params.wallet;

    // SECURITY: Validate wallet address format (base58, 32-44 chars)
    if (!walletAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    if (!HELIUS_RPC_URL) {
      return res.status(503).json({ error: 'NFT service unavailable', nfts: [] });
    }

    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'nft-fetch',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 100,
          displayOptions: { showCollectionMetadata: true },
        },
      }),
    });

    if (!response.ok) {
      apiLogger.error('Helius NFT API error', { status: response.status });
      return res.status(502).json({ error: 'NFT service error', nfts: [] });
    }

    const data: any = await response.json();

    if (!data.result?.items) {
      return res.json({ nfts: [] });
    }

    // Filter and map NFTs
    const nfts = data.result.items
      .filter((asset: any) => {
        const hasImage =
          asset.content?.links?.image ||
          asset.content?.files?.some((f: any) => f.mime?.startsWith('image/'));
        return hasImage;
      })
      .map((asset: any) => {
        let image = asset.content?.links?.image || '';
        const imageFile = asset.content?.files?.find((f: any) =>
          f.mime?.startsWith('image/')
        );
        if (imageFile?.cdn_uri) {
          image = imageFile.cdn_uri;
        } else if (imageFile?.uri) {
          image = imageFile.uri;
        }

        const collectionGroup = asset.grouping?.find(
          (g: any) => g.group_key === 'collection'
        );

        return {
          mint: asset.id,
          name: asset.content?.metadata?.name || 'Unknown NFT',
          image,
          collection: collectionGroup?.group_value,
        };
      });

    res.json({ nfts });
  } catch (error) {
    apiLogger.error('NFT API error', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch NFTs', nfts: [] });
  }
});

// ===================
// Waitlist Endpoints
// ===================

// Join the waitlist (very strict rate limit: 5 attempts per 10 minutes)
app.post('/api/waitlist/join', waitlistLimiter, async (req: Request, res: Response) => {
  try {
    const { email, walletAddress, referralCode, utmSource, utmCampaign } = req.body;

    // Get signature verification headers
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    // SECURITY: Improved email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // SECURITY: Block email aliases (john+tag@gmail.com) to prevent self-referral abuse
    if (email.includes('+')) {
      logSecurityEvent('EMAIL_ALIAS_BLOCKED', { email, ip: getClientIp(req) });
      return res.status(400).json({ error: 'Email aliases with + are not allowed' });
    }

    // Require wallet address
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'Wallet connection required to join waitlist' });
    }

    // Verify wallet signature
    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Wallet verification required. Please sign with your wallet.' });
    }

    if (!verifyWalletSignature(walletAddress, signature, timestamp)) {
      logSecurityEvent('SIGNATURE_VERIFICATION_FAILED', { wallet: walletAddress, ip: getClientIp(req) });
      return res.status(400).json({ error: 'Wallet verification failed. Please try again.' });
    }

    // Extract client IP for abuse prevention
    const clientIp = getClientIp(req);

    // Validate referral code if provided
    let validReferralCode: string | undefined;
    if (referralCode) {
      const isValid = await waitlistDb.validateReferralCode(referralCode);
      if (isValid) {
        validReferralCode = referralCode;
      } else {
        apiLogger.warn('Invalid referral code attempted', { referralCode });
      }
    }

    // SECURITY: Sanitize UTM parameters (alphanumeric, dash, underscore only)
    const sanitizeUtm = (value: any): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const sanitized = value.slice(0, 100).replace(/[^a-zA-Z0-9\-_]/g, '');
      return sanitized || undefined;
    };

    const entry = await waitlistDb.joinWaitlist({
      email,
      walletAddress,
      referralCode: validReferralCode,
      utmSource: sanitizeUtm(utmSource),
      utmCampaign: sanitizeUtm(utmCampaign),
      ipAddress: clientIp,
    });

    res.json({
      success: true,
      referralCode: entry.referralCode,
      position: entry.position,
      tier: entry.tier,
      referralCount: entry.referralCount,
      referralLink: `https://www.degendome.xyz/ref/${entry.referralCode}`,
    });
  } catch (error: any) {
    if (error.message === 'Email already registered') {
      // Return existing entry info
      const existing = await waitlistDb.findByEmail(req.body.email);
      if (existing) {
        return res.json({
          success: true,
          message: 'Already on the waitlist!',
          referralCode: existing.referralCode,
          position: existing.position,
          tier: existing.tier,
          referralCount: existing.referralCount,
          referralLink: `https://www.degendome.xyz/ref/${existing.referralCode}`,
        });
      }
    }
    res.status(400).json({ error: error.message || 'Failed to join waitlist' });
  }
});

// Get waitlist status by email (rate limited to prevent enumeration)
app.get('/api/waitlist/status/:email', standardLimiter, async (req: Request, res: Response) => {
  const email = decodeURIComponent(req.params.email);
  const status = await waitlistDb.getWaitlistStatus(email);

  if (!status) {
    return res.status(404).json({ error: 'Email not found on waitlist' });
  }

  res.json(status);
});

// Get waitlist leaderboard
app.get('/api/waitlist/leaderboard', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const leaderboard = await waitlistDb.getLeaderboard(limit);
  res.json(leaderboard);
});

// Validate a referral code (rate limited to prevent enumeration)
app.get('/api/waitlist/validate/:code', standardLimiter, async (req: Request, res: Response) => {
  const isValid = await waitlistDb.validateReferralCode(req.params.code);
  res.json({ valid: isValid, code: req.params.code });
});

// Get total waitlist count (public)
app.get('/api/waitlist/count', async (req: Request, res: Response) => {
  const count = await waitlistDb.getTotalCount();
  res.json({ count });
});

// Update wallet address for existing waitlist entry
app.put('/api/waitlist/wallet', strictLimiter, async (req: Request, res: Response) => {
  try {
    const { email, walletAddress } = req.body;

    // Get signature verification headers
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!email || !walletAddress) {
      return res.status(400).json({ error: 'Email and wallet address required' });
    }

    // SECURITY: Require wallet signature to prove ownership
    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Wallet verification required' });
    }

    if (!verifyWalletSignature(walletAddress, signature, timestamp)) {
      logSecurityEvent('WALLET_UPDATE_SIGNATURE_FAILED', { wallet: walletAddress, email, ip: getClientIp(req) });
      return res.status(400).json({ error: 'Wallet verification failed' });
    }

    const updated = await waitlistDb.updateWalletAddress(email, walletAddress);
    if (!updated) {
      return res.status(404).json({ error: 'Email not found on waitlist' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update wallet' });
  }
});

// Admin dashboard routes
app.use('/api/admin', adminRoutes);

// Admin: Get all waitlist entries (rate limited even for admins)
app.get('/api/waitlist/admin/entries', requireAdmin(), standardLimiter, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const data = await waitlistDb.getAllEntries({
      limit,
      offset,
      sortBy: sortBy as 'position' | 'referral_count' | 'created_at',
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch entries' });
  }
});

// ===================
// Win Sharing Endpoints
// ===================

import { verifyShareSignature } from './utils/signatureVerification';

const SHARE_XP_REWARD = 25;
const BIG_WIN_THRESHOLD_LAMPORTS = 3_000_000_000; // 3 SOL - bypasses cooldown

// Track a share event and award XP
app.post('/api/shares/track', standardLimiter, async (req: Request, res: Response) => {
  try {
    const { walletAddress, gameMode, roundId, platform, signature, timestamp } = req.body;

    // Validate required fields
    if (!walletAddress || !gameMode || !roundId || !platform) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // SECURITY: Require signature verification to prove wallet ownership
    if (!signature || !timestamp) {
      return res.status(400).json({ error: 'Signature required for share verification' });
    }

    const signatureResult = verifyShareSignature(walletAddress, roundId, timestamp, signature);
    if (!signatureResult.valid) {
      apiLogger.warn('Invalid share signature', { wallet: walletAddress, error: signatureResult.error });
      return res.status(401).json({ error: signatureResult.error || 'Invalid signature' });
    }

    // Validate platform
    if (!['twitter', 'copy', 'download'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Validate game mode
    if (!['oracle', 'battle', 'draft', 'spectator'].includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }

    // SECURITY: Verify this is a real win from the database
    // Don't trust client-provided win amounts - look up the actual win
    const verifiedWinLamports = sharesDb.verifyWinFromWagers(walletAddress, roundId, gameMode);

    if (verifiedWinLamports === null) {
      // No verified win found - could be fake roundId or user didn't actually win
      apiLogger.warn('Unverified share attempt', { wallet: walletAddress, roundId, gameMode });
      return res.status(400).json({
        success: false,
        xpEarned: 0,
        error: 'No verified win found for this round',
      });
    }

    // Check if already shared on this platform for this round
    if (sharesDb.hasShared(walletAddress, roundId, platform)) {
      return res.json({ success: true, xpEarned: 0, message: 'Already shared' });
    }

    // Only award XP for Twitter shares (can't verify other platforms)
    let xpEarned = 0;
    let cooldownMessage: string | undefined;

    if (platform === 'twitter') {
      // Use verified win amount, not client-provided
      const isBigWin = verifiedWinLamports >= BIG_WIN_THRESHOLD_LAMPORTS;
      const isOnCooldown = sharesDb.isOnShareXpCooldown(walletAddress);

      // Big wins (>= 3 SOL) bypass cooldown, smaller wins have 24h cooldown
      if (isBigWin || !isOnCooldown) {
        const xpEvent = await progressionService.awardXp(
          walletAddress,
          SHARE_XP_REWARD,
          'share',
          `${roundId}-${platform}`,
          `Shared ${gameMode} win on ${platform}`
        );
        xpEarned = xpEvent.amount;
      } else {
        // On cooldown for smaller wins
        const cooldownRemaining = sharesDb.getShareXpCooldownRemaining(walletAddress);
        const hoursRemaining = Math.ceil(cooldownRemaining / (60 * 60 * 1000));
        cooldownMessage = `Share XP on cooldown (~${hoursRemaining}h remaining). Win 3+ SOL to bypass!`;
      }
    }

    // Record the share with verified amount (for analytics, even if no XP)
    sharesDb.recordShare({
      walletAddress,
      gameMode,
      winAmountLamports: verifiedWinLamports,
      roundId,
      platform,
      xpAwarded: xpEarned,
    });

    res.json({
      success: true,
      xpEarned,
      message: xpEarned > 0
        ? `+${xpEarned} XP for sharing!`
        : cooldownMessage || 'Share recorded',
    });
  } catch (error: any) {
    apiLogger.error('Share tracking error', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to track share' });
  }
});

// Get share stats for a wallet
app.get('/api/shares/stats/:wallet', standardLimiter, async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const stats = sharesDb.getShareStats(wallet);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get share stats' });
  }
});

// Get share XP cooldown status for a wallet
app.get('/api/shares/cooldown/:wallet', standardLimiter, async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const isOnCooldown = sharesDb.isOnShareXpCooldown(wallet);
    const cooldownRemainingMs = sharesDb.getShareXpCooldownRemaining(wallet);

    res.json({
      isOnCooldown,
      cooldownRemainingMs,
      cooldownRemainingHours: Math.ceil(cooldownRemainingMs / (60 * 60 * 1000)),
      bigWinBypassThreshold: BIG_WIN_THRESHOLD_LAMPORTS / 1_000_000_000, // In SOL
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get cooldown status' });
  }
});

// Simulator endpoints (admin only)
app.post('/api/simulator/start', requireAdmin(), (req: Request, res: Response) => {
  const numBattles = parseInt(req.query.battles as string) || 3;
  battleSimulator.start(numBattles);
  res.json({ status: 'started', battles: numBattles });
});

app.post('/api/simulator/stop', requireAdmin(), (req: Request, res: Response) => {
  battleSimulator.stop();
  res.json({ status: 'stopped' });
});

app.get('/api/simulator/status', requireAdmin(), (req: Request, res: Response) => {
  res.json(battleSimulator.getStatus());
});

// Prediction endpoints
app.get('/api/prediction/:asset/current', (req, res) => {
  const round = predictionService.getCurrentRound(req.params.asset);
  res.json(round || null);
});

app.get('/api/prediction/:asset/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json(predictionService.getRecentRounds(req.params.asset, limit));
});

app.get('/api/prediction/:asset/stats', (req, res) => {
  res.json(predictionService.getStats(req.params.asset) || null);
});

app.get('/api/prediction/assets', (req, res) => {
  res.json(predictionService.getActiveAssets());
});

app.post('/api/prediction/:asset/start', requireAdmin(), (req: Request, res: Response) => {
  predictionService.start(req.params.asset);
  res.json({ status: 'started', asset: req.params.asset });
});

app.post('/api/prediction/:asset/stop', requireAdmin(), (req: Request, res: Response) => {
  predictionService.stop(req.params.asset);
  res.json({ status: 'stopped', asset: req.params.asset });
});

// Prediction history endpoints
app.get('/api/predictions/history/:wallet', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const result = userStatsDb.getWagerHistory(req.params.wallet, {
    limit,
    offset,
    wagerType: 'prediction',
  });

  res.json({
    bets: result.wagers,
    total: result.total,
    limit,
    offset,
  });
});

app.get('/api/predictions/round/:roundId', (req, res) => {
  const roundId = req.params.roundId;

  // Get all bets for this round from the database
  const bets = userStatsDb.getWagersByRoundId(roundId);

  if (bets.length === 0) {
    return res.status(404).json({ error: 'Round not found or has no bets' });
  }

  // Calculate round summary from bets
  const summary = {
    roundId,
    totalBets: bets.length,
    totalWagered: bets.reduce((sum, b) => sum + b.amount, 0),
    totalPayout: bets.reduce((sum, b) => sum + b.profitLoss + b.amount, 0),
    bets: bets.map(b => ({
      id: b.id,
      wallet: b.walletAddress,
      amount: b.amount,
      outcome: b.outcome,
      profitLoss: b.profitLoss,
      createdAt: b.createdAt,
    })),
  };

  res.json(summary);
});

// ===================
// Free Bet Position Endpoints (Escrow-based)
// ===================

// Place a free bet using escrow service (requires auth, rate limited)
app.post('/api/prediction/free-bet', requireAuth(), strictLimiter, async (req: Request, res: Response) => {
  try {
    const { walletAddress, roundId, side } = req.body;
    const authenticatedWallet = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress required' });
    }

    // Verify wallet ownership
    if (walletAddress !== authenticatedWallet) {
      return res.status(403).json({ error: 'Wallet mismatch - can only place free bets for your own wallet' });
    }

    if (!roundId || typeof roundId !== 'number') {
      return res.status(400).json({ error: 'Valid roundId required' });
    }

    if (!side || !['long', 'short'].includes(side)) {
      return res.status(400).json({ error: 'side must be "long" or "short"' });
    }

    // Check if user has available free bet credits
    const balance = await progressionService.getFreeBetBalance(walletAddress);
    if (balance.balance < 1) {
      return res.status(400).json({ error: 'No free bets available', balance });
    }

    // Check if user already has a pending/placed bet for this round
    const existingPosition = await progressionDb.getFreeBetPositionForWalletAndRound(walletAddress, roundId);
    if (existingPosition && ['pending', 'placed', 'active'].includes(existingPosition.status)) {
      return res.status(400).json({ error: 'Already have a free bet for this round', position: existingPosition });
    }

    // Place bet on-chain via escrow service
    const result = await freeBetEscrowService.placeFreeBet(walletAddress, roundId, side as 'long' | 'short');
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to place free bet on-chain' });
    }

    // Deduct free bet credit only after successful on-chain bet
    const useResult = await progressionService.useFreeBetCredit(walletAddress, 'oracle', `Free bet on round ${roundId}`);
    if (!useResult.success) {
      apiLogger.warn('Failed to deduct free bet credit after successful bet', { wallet: walletAddress });
    }

    res.json({
      success: true,
      position: result.position,
      txSignature: result.txSignature,
      remainingFreeBets: useResult.success ? useResult.balance.balance : balance.balance - 1,
    });
  } catch (error: any) {
    apiLogger.error('Free bet placement error', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to place free bet' });
  }
});

// Get user's free bet positions
app.get('/api/prediction/:wallet/free-bet-positions', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  // For pagination we need to implement it - for now just get with limit
  const positions = await progressionDb.getFreeBetPositionsForWallet(req.params.wallet, limit);

  res.json({
    positions,
    total: positions.length,
    limit,
    offset,
  });
});

// ===================
// Draft Tournament Endpoints
// ===================

// Get all active tournaments
app.get('/api/draft/tournaments', (req, res) => {
  res.json(draftTournamentManager.getAllActiveTournaments());
});

// Get tournament by tier (for current week)
app.get('/api/draft/tournaments/tier/:tier', (req, res) => {
  const tier = ('$' + req.params.tier) as DraftTournamentTier;
  if (!['$5', '$25', '$100'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid tier. Use 5, 25, or 100' });
  }
  const tournament = draftTournamentManager.getTournamentForTier(tier);
  res.json(tournament);
});

// Get specific tournament
app.get('/api/draft/tournaments/:id', (req, res) => {
  const tournament = draftTournamentManager.getTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  res.json(tournament);
});

// Get tournament leaderboard
app.get('/api/draft/tournaments/:id/leaderboard', (req, res) => {
  const tournament = draftTournamentManager.getTournament(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  res.json(draftTournamentManager.getLeaderboard(req.params.id));
});

// Enter tournament (requires auth, wallet in body must match authenticated wallet)
app.post('/api/draft/tournaments/:id/enter', requireAuth(), strictLimiter, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress required' });
    }
    // Ensure wallet in body matches authenticated wallet
    if (walletAddress !== req.authenticatedWallet) {
      return res.status(403).json({ error: 'Wallet address does not match authenticated wallet', code: 'FORBIDDEN' });
    }
    const entry = await draftTournamentManager.enterTournament(req.params.id, walletAddress);
    res.json(entry);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get entry by ID
app.get('/api/draft/entries/:entryId', (req, res) => {
  const entry = draftTournamentManager.getEntry(req.params.entryId);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
});

// Get entries for wallet
app.get('/api/draft/entries/wallet/:wallet', (req, res) => {
  res.json(draftTournamentManager.getEntriesForWallet(req.params.wallet));
});

// Start draft session (requires entry ownership)
app.post('/api/draft/entries/:entryId/start', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const session = draftTournamentManager.startDraft(req.params.entryId);
    res.json(session);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Make a draft pick (requires entry ownership)
app.post('/api/draft/entries/:entryId/pick', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const { roundNumber, coinId } = req.body;
    if (!roundNumber || !coinId) {
      return res.status(400).json({ error: 'roundNumber and coinId required' });
    }
    const pick = draftTournamentManager.makePick(req.params.entryId, roundNumber, coinId);
    res.json(pick);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Initiate swap power-up (requires entry ownership)
app.post('/api/draft/entries/:entryId/powerup/swap', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const result = draftTournamentManager.useSwap(req.params.entryId, pickId);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Select coin for swap (requires entry ownership)
app.post('/api/draft/entries/:entryId/powerup/swap/select', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const { pickId, newCoinId } = req.body;
    if (!pickId || !newCoinId) {
      return res.status(400).json({ error: 'pickId and newCoinId required' });
    }
    const pick = draftTournamentManager.selectSwapCoin(req.params.entryId, pickId, newCoinId);
    res.json(pick);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Use boost power-up (requires entry ownership)
app.post('/api/draft/entries/:entryId/powerup/boost', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const pick = draftTournamentManager.useBoost(req.params.entryId, pickId);
    res.json(pick);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Use freeze power-up (requires entry ownership)
app.post('/api/draft/entries/:entryId/powerup/freeze', requireDraftEntryOwnership, (req: Request, res: Response) => {
  try {
    const { pickId } = req.body;
    if (!pickId) {
      return res.status(400).json({ error: 'pickId required' });
    }
    const pick = draftTournamentManager.useFreeze(req.params.entryId, pickId);
    res.json(pick);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get all memecoins
app.get('/api/draft/memecoins', (req, res) => {
  res.json(coinMarketCapService.getAllMemecoins());
});

// Get memecoin prices
app.get('/api/draft/memecoins/prices', (req, res) => {
  res.json(coinMarketCapService.getAllPrices());
});

// ===================
// Progression Endpoints
// ===================

// Get user progression (level, XP, title)
app.get('/api/progression/:wallet', async (req, res) => {
  const progression = await progressionService.getProgression(req.params.wallet);
  res.json(progression);
});

// Get XP history
app.get('/api/progression/:wallet/history', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = await progressionService.getXpHistory(req.params.wallet, limit);
  res.json(history);
});

// Get available & active perks
app.get('/api/progression/:wallet/perks', async (req, res) => {
  const perks = await progressionService.getAvailablePerks(req.params.wallet);
  res.json(perks);
});

// Activate a perk (requires wallet ownership)
app.post('/api/progression/:wallet/perks/:id/activate', requireOwnWallet, strictLimiter, async (req: Request, res: Response) => {
  try {
    const perkId = parseInt(req.params.id);
    if (isNaN(perkId)) {
      return res.status(400).json({ error: 'Invalid perk ID' });
    }
    const perk = await progressionService.activatePerk(req.params.wallet, perkId);
    if (!perk) {
      return res.status(404).json({ error: 'Perk not found or already used' });
    }
    res.json(perk);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Get unlocked cosmetics
app.get('/api/progression/:wallet/cosmetics', async (req, res) => {
  const cosmetics = await progressionService.getUnlockedCosmetics(req.params.wallet);
  res.json(cosmetics);
});

// Get current rake % for user (returns both Draft and Oracle rates)
app.get('/api/progression/:wallet/rake', async (req, res) => {
  const draftRake = await progressionService.getActiveRakeReduction(req.params.wallet);
  const oracleRake = await progressionService.getActiveOracleRakeReduction(req.params.wallet);
  res.json({
    rakePercent: draftRake,  // Legacy: Draft rake
    draftRakePercent: draftRake,
    oracleRakePercent: oracleRake
  });
});

// ============= Free Bet Endpoints =============

// Get free bet balance (public read-only - just shows count)
app.get('/api/progression/:wallet/free-bets', standardLimiter, async (req: Request, res: Response) => {
  const balance = await progressionService.getFreeBetBalance(req.params.wallet);
  res.json(balance);
});

// Get free bet transaction history (requires wallet ownership - sensitive data)
app.get('/api/progression/:wallet/free-bets/history', requireOwnWallet, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = await progressionService.getFreeBetTransactionHistory(req.params.wallet, limit);
  res.json(history);
});

// Use free bet credit (requires wallet ownership)
app.post('/api/progression/:wallet/free-bets/use', requireOwnWallet, strictLimiter, async (req: Request, res: Response) => {
  const { gameMode, description } = req.body;

  if (!gameMode || !['oracle', 'battle', 'draft', 'spectator'].includes(gameMode)) {
    return res.status(400).json({ error: 'Invalid game mode' });
  }

  const result = await progressionService.useFreeBetCredit(
    req.params.wallet,
    gameMode,
    description
  );

  if (!result.success) {
    return res.status(400).json({ error: 'No free bets available', balance: result.balance });
  }

  res.json({ success: true, balance: result.balance });
});

// ===================
// Rake Rebate Endpoints
// ===================

// Get rebate history (requires wallet ownership - sensitive data)
app.get('/api/progression/:wallet/rebates', requireOwnWallet, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const rebates = await progressionDb.getRakeRebatesForWallet(req.params.wallet, limit);

  res.json({
    rebates,
    total: rebates.length,
    limit,
    offset,
  });
});

// Get rebate summary (total earned, pending, etc.)
app.get('/api/progression/:wallet/rebates/summary', requireOwnWallet, async (req: Request, res: Response) => {
  const summary = await progressionDb.getRakeRebateSummary(req.params.wallet);

  // Convert lamports to SOL for display
  const LAMPORTS_PER_SOL = 1_000_000_000;

  res.json({
    walletAddress: req.params.wallet,
    totalRebates: summary.totalRebates,
    totalRebateLamports: summary.totalRebateLamports,
    totalRebateSol: summary.totalRebateLamports / LAMPORTS_PER_SOL,
    sentRebateLamports: summary.sentRebateLamports,
    sentRebateSol: summary.sentRebateLamports / LAMPORTS_PER_SOL,
    pendingRebateLamports: summary.pendingRebateLamports,
    pendingRebateSol: summary.pendingRebateLamports / LAMPORTS_PER_SOL,
  });
});

// ===================
// Streak Endpoints
// ===================

// Get user streak info
app.get('/api/progression/:wallet/streak', async (req, res) => {
  const streak = await progressionService.getStreak(req.params.wallet);
  const bonusPercent = Math.round(progressionService.getStreakBonus(streak.currentStreak) * 100);
  const atRisk = await progressionService.isStreakAtRisk(req.params.wallet);

  res.json({
    ...streak,
    bonusPercent,
    atRisk,
  });
});

// ===================
// User Stats Endpoints
// ===================

// Get user stats (total wagers, win rate, profit/loss, best streak)
app.get('/api/stats/:wallet', (req, res) => {
  const stats = userStatsDb.getUserStats(req.params.wallet);
  res.json(stats);
});

// Get user wager history with pagination and filtering (requires wallet ownership - sensitive data)
app.get('/api/stats/:wallet/history', requireOwnWallet, (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const wagerType = req.query.type as WagerType | undefined;
  const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : undefined;

  // Validate wagerType if provided
  if (wagerType && !['spectator', 'prediction', 'battle', 'draft'].includes(wagerType)) {
    return res.status(400).json({ error: 'Invalid wager type. Use: spectator, prediction, battle, or draft' });
  }

  const result = userStatsDb.getWagerHistory(req.params.wallet, {
    limit,
    offset,
    wagerType,
    startDate,
    endDate,
  });

  res.json({
    wagers: result.wagers,
    total: result.total,
    limit,
    offset,
  });
});

// Get stats leaderboard
app.get('/api/stats/leaderboard/:metric', (req, res) => {
  const metric = req.params.metric as 'profit' | 'winRate' | 'volume';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  if (!['profit', 'winRate', 'volume'].includes(metric)) {
    return res.status(400).json({ error: 'Invalid metric. Use: profit, winRate, or volume' });
  }

  const leaderboard = userStatsDb.getStatsLeaderboard(metric, limit);

  // Add rank to each entry
  const rankedLeaderboard = leaderboard.map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  res.json(rankedLeaderboard);
});

// Get user's rank in leaderboard
app.get('/api/stats/:wallet/rank', (req, res) => {
  const rank = userStatsDb.getUserRankByProfit(req.params.wallet);
  const stats = userStatsDb.getUserStats(req.params.wallet);

  res.json({
    walletAddress: req.params.wallet,
    rank: rank || null,
    totalProfitLoss: stats.totalProfitLoss,
    totalWagers: stats.totalWagers,
  });
});

// ===================
// Notification Endpoints (all require wallet ownership)
// ===================

// Get notifications for a user
app.get('/api/notifications/:wallet', requireOwnWallet, (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = notificationDb.getNotifications(req.params.wallet, {
    limit,
    offset,
    unreadOnly,
  });

  res.json(result);
});

// Get unread notification count
app.get('/api/notifications/:wallet/count', requireOwnWallet, (req: Request, res: Response) => {
  const count = notificationDb.getUnreadCount(req.params.wallet);
  res.json({ count });
});

// Mark a notification as read
app.post('/api/notifications/:wallet/:id/read', requireOwnWallet, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const success = notificationDb.markNotificationRead(id, req.params.wallet);
  if (!success) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ success: true });
});

// Mark all notifications as read
app.post('/api/notifications/:wallet/read-all', requireOwnWallet, (req: Request, res: Response) => {
  const count = notificationDb.markAllNotificationsRead(req.params.wallet);
  res.json({ success: true, count });
});

// Delete a notification
app.delete('/api/notifications/:wallet/:id', requireOwnWallet, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid notification ID' });
  }

  const success = notificationDb.deleteNotificationById(id, req.params.wallet);
  if (!success) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({ success: true });
});

// ===================
// Achievement Endpoints
// ===================

// Get all achievements with user progress
app.get('/api/achievements/:wallet', (req, res) => {
  const progress = achievementDb.getAchievementProgress(req.params.wallet);
  const totalUnlocked = progress.filter(p => p.isUnlocked).length;

  res.json({
    achievements: progress,
    totalUnlocked,
    totalAchievements: progress.length,
  });
});

// Get only unlocked achievements for a user
app.get('/api/achievements/:wallet/unlocked', (req, res) => {
  const unlocked = achievementDb.getUserUnlockedAchievements(req.params.wallet);
  res.json({
    achievements: unlocked,
    count: unlocked.length,
  });
});

// Get unnotified achievements (for toast notifications - requires wallet ownership)
app.get('/api/achievements/:wallet/unnotified', requireOwnWallet, (req: Request, res: Response) => {
  const unnotified = achievementDb.getUnnotified(req.params.wallet);
  res.json({
    achievements: unnotified,
    count: unnotified.length,
  });
});

// Mark achievement as notified (requires wallet ownership)
app.post('/api/achievements/:wallet/:id/notified', requireOwnWallet, (req: Request, res: Response) => {
  const success = achievementDb.markAsNotified(req.params.wallet, req.params.id);
  res.json({ success });
});

// Check and update achievements based on stats (requires wallet ownership)
app.post('/api/achievements/:wallet/check', requireOwnWallet, (req: Request, res: Response) => {
  const { totalWagers, totalWins, currentStreak, level, totalProfit } = req.body;

  const unlocked = achievementDb.checkAndUpdateAchievements(req.params.wallet, {
    totalWagers,
    totalWins,
    currentStreak,
    level,
    totalProfit,
  });

  // Create notifications for newly unlocked achievements
  for (const achievement of unlocked) {
    notificationDb.createNotification({
      walletAddress: req.params.wallet,
      type: 'achievement_unlocked',
      title: 'Achievement Unlocked!',
      message: `You earned "${achievement.name}" - ${achievement.description}`,
      data: {
        achievementId: achievement.id,
        xpReward: achievement.xpReward,
        rarity: achievement.rarity,
      },
    });
  }

  res.json({
    newlyUnlocked: unlocked,
    count: unlocked.length,
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  socketLogger.debug('Client connected', { socketId: socket.id });
  setActiveConnections(io.engine.clientsCount);

  let currentBattleId: string | null = null;
  let walletAddress: string | null = null;

  // Create a new battle
  socket.on('create_battle', async (config: BattleConfig, wallet: string) => {
    try {
      // SECURITY: Validate battle config at runtime before processing
      const validatedConfig = validateBattleConfig(config);

      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      const battle = await battleManager.createBattle(validatedConfig, authenticatedWallet);
      currentBattleId = battle.id;
      socket.join(battle.id);
      socket.emit('battle_update', battle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', `Invalid battle config: ${error.issues[0]?.message}`);
        return;
      }
      socket.emit('error', 'Authentication required to create battle');
    }
  });

  // Join existing battle
  socket.on('join_battle', async (battleId: string, wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      const battle = await battleManager.joinBattle(battleId, authenticatedWallet);
      if (battle) {
        currentBattleId = battleId;
        socket.join(battleId);
        io.to(battleId).emit('battle_update', battle);

        if (battle.status === 'active') {
          io.to(battleId).emit('battle_started', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', 'Authentication required to join battle');
    }
  });

  // Queue for matchmaking
  socket.on('queue_matchmaking', (config: BattleConfig, wallet: string) => {
    try {
      // SECURITY: Validate battle config at runtime before processing
      const validatedConfig = validateBattleConfig(config);

      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      battleManager.queueForMatchmaking(validatedConfig, authenticatedWallet);

      const status = battleManager.getQueueStatus(validatedConfig);
      socket.emit('matchmaking_status', {
        position: status.position,
        estimated: status.playersInQueue > 1 ? 5 : 30, // seconds
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        socket.emit('error', `Invalid battle config: ${error.issues[0]?.message}`);
        return;
      }
      socket.emit('error', 'Authentication required for matchmaking');
    }
  });

  // Open a perp position
  socket.on('open_position', (battleId: string, asset: string, side: any, leverage: any, size: number) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }

      const position = battleManager.openPosition(battleId, walletAddress, asset, side, leverage, size);
      if (position) {
        socket.emit('position_opened', position);

        const battle = battleManager.getBattle(battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Close a perp position
  socket.on('close_position', (battleId: string, positionId: string) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }

      const trade = battleManager.closePosition(battleId, walletAddress, positionId);
      if (trade) {
        socket.emit('position_closed', trade);

        const battle = battleManager.getBattle(battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Open a signed position (for trustless settlement)
  socket.on('open_position_signed', (payload: { message: any; signature: string; walletAddress: string }) => {
    try {
      // Validate wallet address matches authenticated wallet
      if (!walletAddress || payload.walletAddress !== walletAddress) {
        throw new Error('Not authenticated or wallet mismatch');
      }

      const position = battleManager.openPositionSigned(payload);
      if (position) {
        socket.emit('position_opened', position);

        const battle = battleManager.getBattle(payload.message.battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
      battleLogger.info('Signed position opened', { wallet: walletAddress });
    } catch (error: any) {
      battleLogger.error('Signed open position error', { error: error.message });
      socket.emit('error', error.message);
    }
  });

  // Close a signed position (for trustless settlement)
  socket.on('close_position_signed', (payload: { message: any; signature: string; walletAddress: string }) => {
    try {
      // Validate wallet address matches authenticated wallet
      if (!walletAddress || payload.walletAddress !== walletAddress) {
        throw new Error('Not authenticated or wallet mismatch');
      }

      const trade = battleManager.closePositionSigned(payload);
      if (trade) {
        socket.emit('position_closed', trade);

        const battle = battleManager.getBattle(payload.message.battleId);
        if (battle) {
          socket.emit('battle_update', battle);
        }
      }
      battleLogger.info('Signed position closed', { wallet: walletAddress });
    } catch (error: any) {
      battleLogger.error('Signed close position error', { error: error.message });
      socket.emit('error', error.message);
    }
  });

  // Start solo practice
  socket.on('start_solo_practice', (data: { config: BattleConfig; wallet: string; onChainBattleId?: string }) => {
    try {
      const { config, wallet, onChainBattleId } = data;
      walletAddress = wallet;
      const battle = battleManager.createSoloPractice(config, wallet, onChainBattleId);
      currentBattleId = battle.id;
      socket.join(battle.id);
      socket.emit('battle_update', battle);
      socket.emit('battle_started', battle);
      battleLogger.info('Solo practice started', { battleId: battle.id, onChainBattleId: onChainBattleId || 'none' });
    } catch (error: any) {
      battleLogger.error('Solo practice error', { error: String(error) });
      socket.emit('error', error.message);
    }
  });

  // Leave battle/matchmaking
  socket.on('leave_battle', (battleId: string) => {
    if (walletAddress) {
      battleManager.leaveMatchmaking(walletAddress);
    }
    if (currentBattleId) {
      socket.leave(currentBattleId);
      currentBattleId = null;
    }
  });

  // Subscribe to price updates
  socket.on('subscribe_prices', (tokens: string[]) => {
    socket.join('price_updates');
  });

  // Spectator events
  socket.on('subscribe_live_battles', () => {
    socket.join('live_battles');
    socket.emit('live_battles', spectatorService.getLiveBattles());
  });

  socket.on('unsubscribe_live_battles', () => {
    socket.leave('live_battles');
  });

  socket.on('spectate_battle', (battleId: string) => {
    socket.join(`spectate_${battleId}`);
    spectatorService.joinSpectate(battleId, socket.id);
  });

  socket.on('leave_spectate', (battleId: string) => {
    socket.leave(`spectate_${battleId}`);
    spectatorService.leaveSpectate(battleId, socket.id);
  });

  socket.on('place_bet', async (battleId: string, backedPlayer: string, amount: number, wallet: string) => {
    try {
      // SECURITY: Rate limit betting
      const rateCheck = checkSocketRateLimit(socket.id, wallet, 'place_bet', BET_ACTION_LIMIT);
      if (!rateCheck.allowed) {
        socket.emit('error', rateCheck.error || 'Rate limit exceeded');
        return;
      }
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const bet = await spectatorService.placeBet(battleId, backedPlayer, amount, authenticatedWallet);
      socket.emit('bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', 'Authentication required to place bet');
    }
  });

  socket.on('get_my_bets', (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet for sensitive data
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const bets = spectatorService.getUserBets(authenticatedWallet);
      socket.emit('user_bets', bets);
    } catch (error: any) {
      socket.emit('error', 'Authentication required to view bets');
    }
  });

  // On-chain betting flow with odds locking
  socket.on('request_odds_lock', (data: {
    battleId: string;
    backedPlayer: string;
    amount: number;
    walletAddress: string;
  }) => {
    try {
      // SECURITY: Rate limit odds lock requests
      const rateCheck = checkSocketRateLimit(socket.id, data.walletAddress, 'request_odds_lock', BET_ACTION_LIMIT);
      if (!rateCheck.allowed) {
        socket.emit('error', rateCheck.error || 'Rate limit exceeded');
        return;
      }
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, data.walletAddress);
      const lock = spectatorService.requestOddsLock(
        data.battleId,
        data.backedPlayer,
        data.amount,
        authenticatedWallet
      );
      socket.emit('odds_lock', lock);
    } catch (error: any) {
      socket.emit('error', 'Authentication required for odds lock');
    }
  });

  socket.on('verify_bet', (data: {
    lockId: string;
    txSignature: string;
    walletAddress: string;
  }) => {
    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, data.walletAddress);
      const bet = spectatorService.verifyAndRecordBet(
        data.lockId,
        data.txSignature,
        authenticatedWallet
      );
      if (bet) {
        socket.emit('bet_verified', bet);
        // Broadcast to spectators
        io.to(`spectate_${bet.battleId}`).emit('bet_placed', bet);
      } else {
        socket.emit('error', 'Failed to verify bet - lock may be expired or already used');
      }
    } catch (error: any) {
      socket.emit('error', 'Authentication required to verify bet');
    }
  });

  socket.on('get_unclaimed_bets', (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet for sensitive data
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const bets = spectatorService.getUnclaimedWins(authenticatedWallet);
      socket.emit('unclaimed_bets', bets);
    } catch (error: any) {
      socket.emit('error', 'Authentication required to view unclaimed bets');
    }
  });

  socket.on('verify_claim', (data: {
    betId: string;
    txSignature: string;
    walletAddress: string;
  }) => {
    try {
      // SECURITY: Verify authenticated wallet owns this bet
      const authenticatedWallet = getAuthenticatedWallet(socket, data.walletAddress);

      // Verify the bet belongs to this wallet before allowing claim
      const bet = spectatorService.getBet(data.betId);
      if (!bet) {
        socket.emit('error', 'Bet not found');
        return;
      }
      if (bet.bettor !== authenticatedWallet) {
        socketLogger.security('SPECTATOR_BET_CLAIM_MISMATCH', { authenticatedWallet, betOwner: bet.bettor });
        socket.emit('error', 'Not authorized to claim this bet');
        return;
      }

      spectatorService.markBetClaimed(data.betId, data.txSignature);
      socket.emit('claim_verified', { betId: data.betId, txSignature: data.txSignature });
    } catch (error: any) {
      socket.emit('error', error.message || 'Authentication required to claim bet');
    }
  });

  // Prediction events
  socket.on('subscribe_prediction', (asset: string) => {
    socket.join(`prediction_${asset}`);
    const currentRound = predictionService.getCurrentRound(asset);
    if (currentRound) {
      socket.emit('prediction_round', currentRound);
    }
    const recentRounds = predictionService.getRecentRounds(asset, 10);
    socket.emit('prediction_history', recentRounds);
  });

  socket.on('unsubscribe_prediction', (asset: string) => {
    socket.leave(`prediction_${asset}`);
  });

  // Legacy handler - kept for compatibility
  socket.on('place_prediction', async (asset: string, side: PredictionSide, amount: number, wallet: string) => {
    try {
      // SECURITY: Validate side parameter
      if (side !== 'long' && side !== 'short') {
        socket.emit('error', 'Invalid side - must be "long" or "short"');
        return;
      }
      // SECURITY: Rate limit predictions
      const rateCheck = checkSocketRateLimit(socket.id, wallet, 'place_prediction', BET_ACTION_LIMIT);
      if (!rateCheck.allowed) {
        socket.emit('error', rateCheck.error || 'Rate limit exceeded');
        return;
      }
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const bet = await predictionService.placeBet(asset, side, amount, authenticatedWallet);
      socket.emit('prediction_bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', 'Authentication required to place prediction');
    }
  });

  // New handler using PDA balance or free bet
  socket.on('place_prediction_bet', async (data: { asset: string; side: PredictionSide; amount: number; bettor: string; useFreeBet?: boolean }) => {
    try {
      // SECURITY: Validate side parameter
      if (data.side !== 'long' && data.side !== 'short') {
        socket.emit('prediction_bet_result', { success: false, error: 'Invalid side - must be "long" or "short"' });
        return;
      }
      // SECURITY: Rate limit predictions
      const rateCheck = checkSocketRateLimit(socket.id, data.bettor, 'place_prediction_bet', BET_ACTION_LIMIT);
      if (!rateCheck.allowed) {
        socket.emit('prediction_bet_result', { success: false, error: rateCheck.error });
        return;
      }
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, data.bettor);
      const isFreeBet = data.useFreeBet === true;
      const bet = await predictionService.placeBet(data.asset, data.side, data.amount, authenticatedWallet, isFreeBet);
      socket.emit('prediction_bet_result', { success: true, bet });
      socket.emit('prediction_bet_placed', bet);
    } catch (error: any) {
      socket.emit('prediction_bet_result', { success: false, error: error.message || 'Failed to place prediction' });
    }
  });

  // ===================
  // Draft Tournament Events
  // ===================

  socket.on('join_draft_lobby', (tier: DraftTournamentTier) => {
    socket.join(`draft_lobby_${tier}`);
    const tournament = draftTournamentManager.getTournamentForTier(tier);
    if (tournament) {
      socket.emit('draft_tournament_update' as any, tournament);
    }
  });

  socket.on('leave_draft_lobby', () => {
    socket.leave('draft_lobby_$5');
    socket.leave('draft_lobby_$25');
    socket.leave('draft_lobby_$100');
  });

  socket.on('subscribe_draft_tournament', (tournamentId: string) => {
    socket.join(`draft_tournament_${tournamentId}`);
    const leaderboard = draftTournamentManager.getLeaderboard(tournamentId);
    socket.emit('draft_leaderboard_update' as any, { tournamentId, leaderboard });
  });

  socket.on('unsubscribe_draft_tournament', (tournamentId: string) => {
    socket.leave(`draft_tournament_${tournamentId}`);
  });

  socket.on('start_draft', (entryId: string) => {
    try {
      const session = draftTournamentManager.startDraft(entryId);
      socket.emit('draft_session_update' as any, session);
      // Send the current round options (not always round 0)
      const currentRoundIndex = session.currentRound - 1;
      if (session.rounds.length > currentRoundIndex && currentRoundIndex >= 0) {
        socket.emit('draft_round_options' as any, session.rounds[currentRoundIndex]);
      }
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('make_draft_pick', (entryId: string, roundNumber: number, coinId: string) => {
    try {
      const pick = draftTournamentManager.makePick(entryId, roundNumber, coinId);
      socket.emit('draft_pick_confirmed' as any, pick);

      const session = draftTournamentManager.getDraftSession(entryId);
      if (session) {
        socket.emit('draft_session_update' as any, session);
        if (session.status === 'in_progress' && session.rounds.length > roundNumber) {
          socket.emit('draft_round_options' as any, session.rounds[roundNumber]);
        }
      }

      if (roundNumber >= 6) {
        const entry = draftTournamentManager.getEntry(entryId);
        if (entry) {
          socket.emit('draft_completed' as any, entry);
        }
      }
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_swap', (entryId: string, pickId: string) => {
    try {
      const result = draftTournamentManager.useSwap(entryId, pickId);
      socket.emit('draft_swap_options' as any, { pickId, options: result.options });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('select_swap_coin', (entryId: string, pickId: string, newCoinId: string) => {
    try {
      const pick = draftTournamentManager.selectSwapCoin(entryId, pickId, newCoinId);
      socket.emit('powerup_used' as any, { entryId, type: 'swap', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_boost', (entryId: string, pickId: string) => {
    try {
      const pick = draftTournamentManager.useBoost(entryId, pickId);
      socket.emit('powerup_used' as any, { entryId, type: 'boost', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  socket.on('use_powerup_freeze', (entryId: string, pickId: string) => {
    try {
      const pick = draftTournamentManager.useFreeze(entryId, pickId);
      socket.emit('powerup_used' as any, { entryId, type: 'freeze', pick });
    } catch (error: any) {
      socket.emit('draft_error' as any, error.message);
    }
  });

  // ===================
  // Progression Events
  // ===================

  socket.on('subscribe_progression', async (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet to prevent data exposure
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      socket.join(`progression_${authenticatedWallet}`);
      // Send current progression state
      const progression = await progressionService.getProgression(authenticatedWallet);
      socket.emit('progression_update' as any, progression);
    } catch (error: any) {
      socket.emit('error', 'Authentication required to view progression');
    }
  });

  socket.on('unsubscribe_progression', (wallet: string) => {
    // Only leave room for authenticated wallet
    if (socket.data.authenticatedWallet) {
      socket.leave(`progression_${socket.data.authenticatedWallet}`);
    }
  });

  // ===================
  // Notification Events
  // ===================

  socket.on('subscribe_notifications', (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet to prevent data exposure
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      socket.join(`notifications_${authenticatedWallet}`);
      // Send current unread count
      const count = notificationDb.getUnreadCount(authenticatedWallet);
      socket.emit('notification_count' as any, { count });
    } catch (error: any) {
      socket.emit('error', 'Authentication required to view notifications');
    }
  });

  socket.on('unsubscribe_notifications', (wallet: string) => {
    // Only leave room for authenticated wallet
    if (socket.data.authenticatedWallet) {
      socket.leave(`notifications_${socket.data.authenticatedWallet}`);
    }
  });

  // ===================
  // Rebate Events
  // ===================

  socket.on('subscribe_rebates', async (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet to prevent financial data exposure
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      socket.join(`rebates_${authenticatedWallet}`);
      // Send current rebate summary
      const summary = await progressionDb.getRakeRebateSummary(authenticatedWallet);
      const LAMPORTS_PER_SOL = 1_000_000_000;
      socket.emit('rebate_summary' as any, {
        totalRebates: summary.totalRebates,
        totalRebateLamports: summary.totalRebateLamports,
        totalRebateSol: summary.totalRebateLamports / LAMPORTS_PER_SOL,
        pendingRebateLamports: summary.pendingRebateLamports,
        pendingRebateSol: summary.pendingRebateLamports / LAMPORTS_PER_SOL,
      });
    } catch (error: any) {
      socket.emit('error', 'Authentication required to view rebates');
    }
  });

  socket.on('unsubscribe_rebates', (wallet: string) => {
    // Only leave room for authenticated wallet
    if (socket.data.authenticatedWallet) {
      socket.leave(`rebates_${socket.data.authenticatedWallet}`);
    }
  });

  // ===================
  // Ready Check Events
  // ===================

  // Register wallet for targeted notifications
  socket.on('register_wallet', (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      battleManager.registerWalletSocket(authenticatedWallet, socket.id);
    } catch (error: any) {
      // SECURITY: No fallback - require authentication for wallet registration
      socket.emit('error', 'Authentication required to register wallet');
    }
  });

  // Accept a match from ready check
  socket.on('accept_match', (battleId: string) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }
      const accepted = battleManager.acceptReadyCheck(battleId, walletAddress);
      if (!accepted) {
        socket.emit('error', 'Failed to accept match - may be expired');
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Decline a match from ready check
  socket.on('decline_match', (battleId: string) => {
    try {
      if (!walletAddress) {
        throw new Error('Not authenticated');
      }
      battleManager.declineReadyCheck(battleId, walletAddress);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // ===================
  // Challenge Notification Events
  // ===================

  // Subscribe to friend challenge notifications
  socket.on('subscribe_challenge_notifications', (wallet: string) => {
    try {
      // SECURITY: Use authenticated wallet to prevent unauthorized subscriptions
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      walletAddress = authenticatedWallet;
      challengeNotificationService.subscribe(authenticatedWallet, socket.id);
      battleManager.registerWalletSocket(authenticatedWallet, socket.id);
      challengeLogger.debug('User subscribed to challenge notifications', { wallet: authenticatedWallet });
    } catch (error: any) {
      socket.emit('error', 'Authentication required to subscribe to challenges');
    }
  });

  // Unsubscribe from challenge notifications
  socket.on('unsubscribe_challenge_notifications', (wallet: string) => {
    // Only unsubscribe authenticated wallet
    if (socket.data.authenticatedWallet) {
      challengeNotificationService.unsubscribe(socket.data.authenticatedWallet);
      challengeLogger.debug('User unsubscribed from challenge notifications', { wallet: socket.data.authenticatedWallet });
    }
  });

  // Subscribe to open challenges updates (challenge board)
  socket.on('subscribe_challenges', () => {
    // Rate limit subscriptions - use socket.id as identifier since no wallet needed
    const rateCheck = checkSocketRateLimit(socket.id, socket.id, 'subscribe_challenges', SUBSCRIPTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('error', rateCheck.error || 'Rate limit exceeded');
      return;
    }

    socket.join('challenges');
    challengeLogger.debug('User subscribed to open challenges', { socketId: socket.id });

    // Send current open challenges
    try {
      const openChallenges = challengesDb.getOpenChallenges();
      socket.emit('challenges_list' as any, { challenges: openChallenges });
    } catch (error) {
      challengeLogger.error('Error sending open challenges on subscribe', { error: String(error) });
    }
  });

  // Unsubscribe from open challenges updates
  socket.on('unsubscribe_challenges', () => {
    socket.leave('challenges');
    challengeLogger.debug('User unsubscribed from open challenges', { socketId: socket.id });
  });

  // ===================
  // LDS (Last Degen Standing) Socket Handlers
  // ===================

  socket.on('subscribe_lds', () => {
    // Rate limit subscriptions
    const rateCheck = checkSocketRateLimit(socket.id, undefined, 'subscribe_lds', SUBSCRIPTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('lds_join_error' as any, { error: rateCheck.error });
      return;
    }

    socket.join('lds');
    // Send current game state
    const currentGame = ldsManager.getCurrentGame();
    const activeGame = ldsManager.getActiveGame();
    const game = activeGame || currentGame;
    if (game) {
      const state = ldsManager.getGameState(game.id);
      socket.emit('lds_game_state' as any, state);
    }
    socketLogger.debug('LDS subscription', { socketId: socket.id });
  });

  socket.on('unsubscribe_lds', () => {
    socket.leave('lds');
    socketLogger.debug('LDS unsubscription', { socketId: socket.id });
  });

  socket.on('lds_join_game', async (wallet: string) => {
    // Rate limit game joins (prevents spam joining/leaving)
    const rateCheck = checkSocketRateLimit(socket.id, wallet, 'lds_join_game', GAME_JOIN_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('lds_join_error' as any, { error: rateCheck.error });
      return;
    }

    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const result = await ldsManager.joinGame(authenticatedWallet);
      if (result.success) {
        socket.emit('lds_join_success' as any, { game: result.game });
      } else {
        socket.emit('lds_join_error' as any, { error: result.error });
      }
    } catch (error: any) {
      socket.emit('lds_join_error' as any, { error: 'Authentication required to join game' });
    }
  });

  socket.on('lds_leave_game', async (wallet: string) => {
    // Rate limit game leaves (same limit as joins)
    const rateCheck = checkSocketRateLimit(socket.id, wallet, 'lds_leave_game', GAME_JOIN_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('lds_leave_error' as any, { error: rateCheck.error });
      return;
    }

    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
      const result = await ldsManager.leaveGame(authenticatedWallet);
      if (result.success) {
        socket.emit('lds_leave_success' as any, {});
      } else {
        socket.emit('lds_leave_error' as any, { error: result.error });
      }
    } catch (error: any) {
      socket.emit('lds_leave_error' as any, { error: 'Authentication required to leave game' });
    }
  });

  socket.on('lds_submit_prediction', async (data: { gameId: string; wallet: string; prediction: 'up' | 'down' }) => {
    // SECURITY: Validate prediction parameter
    if (data.prediction !== 'up' && data.prediction !== 'down') {
      socket.emit('lds_prediction_error' as any, { error: 'Invalid prediction - must be "up" or "down"' });
      return;
    }
    // Rate limit predictions (more generous - players need to predict each round)
    const rateCheck = checkSocketRateLimit(socket.id, data.wallet, 'lds_submit_prediction', BET_ACTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('lds_prediction_error' as any, { error: rateCheck.error });
      return;
    }

    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, data.wallet);
      const result = await ldsManager.submitPrediction(data.gameId, authenticatedWallet, data.prediction);
      if (result.success) {
        socket.emit('lds_prediction_success' as any, {});
      } else {
        socket.emit('lds_prediction_error' as any, { error: result.error });
      }
    } catch (error: any) {
      socket.emit('lds_prediction_error' as any, { error: 'Authentication required to submit prediction' });
    }
  });

  // ===================
  // Token Wars Socket Handlers
  // ===================

  socket.on('subscribe_token_wars', () => {
    // Rate limit subscriptions
    const rateCheck = checkSocketRateLimit(socket.id, undefined, 'subscribe_token_wars', SUBSCRIPTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('token_wars_bet_error' as any, { error: rateCheck.error });
      return;
    }

    socket.join('token_wars');
    // Send current battle state
    const state = tokenWarsManager.getBattleState();
    if (state) {
      socket.emit('token_wars_battle_state' as any, state);
    }
    socketLogger.debug('TokenWars subscription', { socketId: socket.id });
  });

  socket.on('unsubscribe_token_wars', () => {
    socket.leave('token_wars');
    socketLogger.debug('TokenWars unsubscription', { socketId: socket.id });
  });

  socket.on('token_wars_place_bet', async (data: { wallet: string; side: 'token_a' | 'token_b'; amountLamports: number; useFreeBet?: boolean }) => {
    // SECURITY: Validate side parameter
    if (data.side !== 'token_a' && data.side !== 'token_b') {
      socket.emit('token_wars_bet_error' as any, { error: 'Invalid side - must be "token_a" or "token_b"' });
      return;
    }
    // Rate limit bet placement
    const rateCheck = checkSocketRateLimit(socket.id, data.wallet, 'token_wars_place_bet', BET_ACTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('token_wars_bet_error' as any, { error: rateCheck.error });
      return;
    }

    try {
      // SECURITY: Use authenticated wallet, not client-provided
      const authenticatedWallet = getAuthenticatedWallet(socket, data.wallet);
      let isFreeBet = false;

      // If user wants to use a free bet, check and deduct from their balance
      if (data.useFreeBet) {
        const useResult = await progressionService.useFreeBetCredit(authenticatedWallet, 'token_wars', `Token Wars free bet`);
        if (!useResult.success) {
          socket.emit('token_wars_bet_error' as any, { error: 'No free bets available' });
          return;
        }
        isFreeBet = true;
        socketLogger.info('TokenWars free bet used', { wallet: authenticatedWallet });
      }

      const result = await tokenWarsManager.placeBet(authenticatedWallet, data.side, data.amountLamports, isFreeBet);
      if (result.success) {
        socket.emit('token_wars_bet_success' as any, { bet: result.bet });
      } else {
        // Refund free bet credit if bet placement failed
        if (isFreeBet) {
          await progressionService.addFreeBetCredit(authenticatedWallet, 1, 'Token Wars bet failed refund');
        }
        socket.emit('token_wars_bet_error' as any, { error: result.error });
      }
    } catch (error: any) {
      socket.emit('token_wars_bet_error' as any, { error: 'Authentication required to place bet' });
    }
  });

  // ===================
  // Scheduled Matches Socket Handlers
  // ===================

  // Subscribe to upcoming scheduled matches
  socket.on('subscribe_scheduled_matches', (gameMode: string) => {
    const rateCheck = checkSocketRateLimit(socket.id, '', 'subscribe_scheduled', SUBSCRIPTION_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('error', rateCheck.error || 'Rate limit exceeded');
      return;
    }
    socket.join(`scheduled:${gameMode}`);
    const upcoming = scheduledMatchManager.getUpcomingMatches(gameMode as 'battle');
    socket.emit('scheduled_matches_list' as any, upcoming);
  });

  // Unsubscribe from scheduled matches
  socket.on('unsubscribe_scheduled_matches', (gameMode: string) => {
    socket.leave(`scheduled:${gameMode}`);
  });

  // Register for a scheduled match
  socket.on('register_for_match', async (data: { matchId: string; wallet: string }) => {
    const rateCheck = checkSocketRateLimit(socket.id, data.wallet, 'register_match', GAME_JOIN_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('error', rateCheck.error || 'Rate limit exceeded');
      return;
    }
    try {
      const authenticatedWallet = getAuthenticatedWallet(socket, data.wallet);
      await scheduledMatchManager.registerPlayer(data.matchId, authenticatedWallet);
      socket.emit('match_registration_success' as any, { matchId: data.matchId });

      // Notify all subscribers of updated match
      const match = scheduledMatchManager.getMatch(data.matchId);
      if (match) {
        io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated' as any, match);
      }
    } catch (error: any) {
      socket.emit('error', error.message || 'Failed to register for match');
    }
  });

  // Unregister from a scheduled match
  socket.on('unregister_from_match', async (data: { matchId: string; wallet: string }) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(socket, data.wallet);
      await scheduledMatchManager.unregisterPlayer(data.matchId, authenticatedWallet);
      socket.emit('match_unregistration_success' as any, { matchId: data.matchId });

      const match = scheduledMatchManager.getMatch(data.matchId);
      if (match) {
        io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated' as any, match);
      }
    } catch (error: any) {
      socket.emit('error', error.message || 'Failed to unregister from match');
    }
  });

  // Ready check response for scheduled matches
  socket.on('scheduled_ready_check_response', (data: { matchId: string; wallet: string; ready: boolean }) => {
    try {
      const authenticatedWallet = getAuthenticatedWallet(socket, data.wallet);
      scheduledMatchManager.handleReadyCheckResponse(data.matchId, authenticatedWallet, data.ready);
    } catch (error: any) {
      socket.emit('error', error.message || 'Authentication required');
    }
  });

  // ===================
  // Battle Chat Socket Handlers
  // ===================

  socket.on('send_chat_message', async (data: { battleId: string; content: string }) => {
    try {
      // SECURITY: Validate content
      if (!data.content || typeof data.content !== 'string') {
        socket.emit('chat_error', { code: 'invalid_content', message: 'Message content required' });
        return;
      }
      if (data.content.length > 500) {
        socket.emit('chat_error', { code: 'content_too_long', message: 'Message cannot exceed 500 characters' });
        return;
      }
      if (data.content.trim().length === 0) {
        socket.emit('chat_error', { code: 'empty_content', message: 'Message cannot be empty' });
        return;
      }

      // SECURITY: Use authenticated wallet
      const authenticatedWallet = getAuthenticatedWallet(socket, undefined);

      // Rate limit chat messages
      const rateCheck = checkSocketRateLimit(socket.id, authenticatedWallet, 'chat', CHAT_MESSAGE_LIMIT);
      if (!rateCheck.allowed) {
        socket.emit('chat_error', { code: 'rate_limited', message: rateCheck.error || 'Too many messages' });
        return;
      }

      // Check if user is in the battle room (spectating or participating)
      const rooms = Array.from(socket.rooms);
      if (!rooms.includes(data.battleId)) {
        socket.emit('chat_error', { code: 'not_in_battle', message: 'Join the battle to chat' });
        return;
      }

      // Get user profile for display name and progression for level
      const profile = await getProfile(authenticatedWallet);
      const progression = await progressionService.getProgression(authenticatedWallet);
      const displayName = profile?.username || undefined;
      const level = progression?.currentLevel || 1;

      const result = await chatService.sendMessage(
        data.battleId,
        authenticatedWallet,
        data.content,
        displayName,
        level
      );

      if (!result.success) {
        socket.emit('chat_error', { code: result.code || 'error', message: result.error || 'Failed to send message' });
      }
      // Message is broadcast via chatService listener
    } catch (error: any) {
      socket.emit('chat_error', { code: 'auth_required', message: 'Authentication required to chat' });
    }
  });

  socket.on('load_chat_history', (battleId: string) => {
    // No auth required to load history (spectators can view)
    const messages = chatService.getHistory(battleId, 50);
    socket.emit('chat_history', messages);
  });

  socket.on('disconnect', () => {
    socketLogger.debug('Client disconnected', { socketId: socket.id });
    setActiveConnections(io.engine.clientsCount);
    if (walletAddress) {
      battleManager.leaveMatchmaking(walletAddress);
      battleManager.unregisterWalletSocket(walletAddress);
      // Keep challenge notification subscription active for grace period (don't unsubscribe on disconnect)
    }
  });
});

// Subscribe to price updates and broadcast
priceService.subscribe((prices) => {
  io.to('price_updates').emit('price_update', prices);
  battleManager.updateAllAccounts();
});

// Subscribe to battle updates and broadcast
battleManager.subscribe(async (battle) => {
  io.to(battle.id).emit('battle_update', battle);

  if (battle.status === 'active' && battle.startedAt && Date.now() - battle.startedAt < 1000) {
    io.to(battle.id).emit('battle_started', battle);
  }

  if (battle.status === 'completed') {
    io.to(battle.id).emit('battle_ended', battle);

    // Trigger on-chain settlement if this battle has an on-chain ID and hasn't been settled yet
    if (battle.onChainBattleId && !battle.onChainSettled && battle.winnerId) {
      battleLogger.info('Triggering on-chain settlement', { battleId: battle.id });

      // Determine if winner is creator (for solo practice, always true)
      const isCreator = battle.players.length === 1 ||
        battle.players[0]?.walletAddress === battle.winnerId;

      const txSig = await battleSettlementService.settleBattle(
        battle.onChainBattleId,
        battle.winnerId,
        isCreator
      );

      if (txSig) {
        // Mark as settled and notify clients
        battle.onChainSettled = true;
        io.to(battle.id).emit('battle_settled' as any, {
          battleId: battle.id,
          txSignature: txSig,
          winnerId: battle.winnerId,
        });
      }
    }
  }
});

// Subscribe to spectator service events and broadcast
spectatorService.subscribe((event, data) => {
  switch (event) {
    case 'live_battles':
      io.to('live_battles').emit('live_battles', data);
      break;
    case 'spectator_battle_update':
      io.to('live_battles').emit('spectator_battle_update', data);
      io.to(`spectate_${data.id}`).emit('spectator_battle_update', data);
      break;
    case 'odds_update':
      io.to(`spectate_${data.battleId}`).emit('odds_update', data);
      io.to('live_battles').emit('odds_update', data);
      break;
    case 'bet_placed':
      io.to(`spectate_${data.battleId}`).emit('bet_placed', data);
      break;
    case 'bet_settled':
      io.to(`spectate_${data.battleId}`).emit('bet_settled', data);
      break;
    case 'spectator_count':
      io.to(`spectate_${data.battleId}`).emit('spectator_count', data);
      io.to('live_battles').emit('spectator_count', data);
      break;
  }
});

// Subscribe to ready check events and broadcast to players
battleManager.subscribeToReadyCheckEvents((event, data) => {
  switch (event) {
    case 'match_found': {
      // Send match_found to both players individually
      const { battleId, player1Wallet, player2Wallet, config, expiresAt } = data;

      const player1Socket = battleManager.getSocketIdForWallet(player1Wallet);
      const player2Socket = battleManager.getSocketIdForWallet(player2Wallet);

      if (player1Socket) {
        io.to(player1Socket).emit('match_found', {
          battleId,
          opponentWallet: player2Wallet,
          config,
          expiresAt,
        });
      }

      if (player2Socket) {
        io.to(player2Socket).emit('match_found', {
          battleId,
          opponentWallet: player1Wallet,
          config,
          expiresAt,
        });
      }

      battleLogger.info('Ready check match found', { battleId });
      break;
    }

    case 'ready_check_update': {
      // Broadcast update to both players in the battle
      const readyCheck = battleManager.getReadyCheck(data.battleId);
      if (readyCheck) {
        const player1Socket = battleManager.getSocketIdForWallet(readyCheck.player1Wallet);
        const player2Socket = battleManager.getSocketIdForWallet(readyCheck.player2Wallet);

        if (player1Socket) {
          io.to(player1Socket).emit('ready_check_update', data);
        }
        if (player2Socket) {
          io.to(player2Socket).emit('ready_check_update', data);
        }
      }
      break;
    }

    case 'ready_check_cancelled': {
      // Send cancelled event to both players - need to get wallet info from the event data
      // The readyCheck is already deleted at this point, so we broadcast to the battle room
      // Players should have joined the battle room when match_found was emitted
      io.to(data.battleId).emit('ready_check_cancelled', data);
      battleLogger.info('Ready check cancelled', { battleId: data.battleId, reason: data.reason });
      break;
    }
  }
});

// Subscribe to prediction service events and broadcast
predictionService.subscribe((event, data) => {
  switch (event) {
    case 'round_started':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      break;
    case 'round_locked':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      break;
    case 'round_settled':
      io.to(`prediction_${data.asset}`).emit('prediction_round', data);
      io.to(`prediction_${data.asset}`).emit('prediction_settled', data);
      break;
    case 'bet_placed':
      io.to(`prediction_${data.round.asset}`).emit('prediction_round', data.round);
      // Broadcast the bet to all users watching this prediction
      io.to(`prediction_${data.round.asset}`).emit('prediction_bet_placed', data.bet);
      break;
  }
});

// Subscribe to draft tournament events and broadcast
draftTournamentManager.subscribe((event, data) => {
  switch (event) {
    case 'tournament_status_changed':
      // Broadcast to all tier lobbies
      io.to(`draft_lobby_${data.tier}`).emit('draft_tournament_update' as any, data);
      io.to(`draft_tournament_${data.id}`).emit('draft_tournament_update' as any, data);
      break;
    case 'entry_created':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_tournament_update' as any,
        draftTournamentManager.getTournament(data.tournamentId));
      break;
    case 'draft_completed':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_completed' as any, data);
      break;
    case 'score_update':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_score_update' as any, data);
      break;
    case 'leaderboard_update':
      io.to(`draft_tournament_${data.tournamentId}`).emit('draft_leaderboard_update' as any, data);
      break;
    case 'powerup_used':
      io.to(`draft_tournament_${data.entry?.tournamentId || ''}`).emit('powerup_used' as any, data);
      break;
    case 'tournament_settled':
      io.to(`draft_tournament_${data.tournament.id}`).emit('draft_tournament_update' as any, data.tournament);
      io.to(`draft_tournament_${data.tournament.id}`).emit('draft_leaderboard_update' as any, {
        tournamentId: data.tournament.id,
        leaderboard: data.leaderboard
      });
      break;
  }
});

// Subscribe to memecoin price updates
coinMarketCapService.subscribe((prices) => {
  io.to('draft_prices').emit('memecoin_prices_update' as any, prices);
});

// Subscribe to progression events and broadcast to user
progressionService.subscribe((event, data) => {
  switch (event) {
    case 'xp_gained':
      // Broadcast to the specific user's progression room
      io.to(`progression_${data.walletAddress}`).emit('xp_gained' as any, {
        amount: data.amount,
        newTotal: data.newTotal,
        source: data.source,
        description: data.description
      });
      break;
    case 'level_up':
      // Broadcast level up celebration to the specific user
      io.to(`progression_${data.walletAddress}`).emit('level_up' as any, {
        previousLevel: data.previousLevel,
        newLevel: data.newLevel,
        newTitle: data.newTitle,
        unlockedPerks: data.unlockedPerks,
        unlockedCosmetics: data.unlockedCosmetics
      });
      // Create and broadcast notification for level up
      const levelUpNotification = notificationDb.notifyLevelUp(
        data.walletAddress,
        data.previousLevel,
        data.newLevel,
        data.newTitle
      );
      io.to(`notifications_${data.walletAddress}`).emit('notification' as any, levelUpNotification);
      io.to(`notifications_${data.walletAddress}`).emit('notification_count' as any, {
        count: notificationDb.getUnreadCount(data.walletAddress)
      });
      break;
    case 'perk_activated':
      io.to(`progression_${data.walletAddress}`).emit('perk_activated' as any, data.perk);
      break;
    case 'perk_expired':
      io.to(`progression_${data.walletAddress}`).emit('perk_expired' as any, { perkId: data.perkId });
      break;
  }
});

// ==================== BATTLE CHALLENGES ====================

// Get user's challenges (must be before /:code route)
app.get('/api/challenges/mine', requireAuth(), standardLimiter, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.authenticatedWallet;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const sent = challengesDb.getChallengesBySender(walletAddress);

    res.json({
      sent,
      received: [], // For now, we don't track received challenges separately
    });
  } catch (error: any) {
    challengeLogger.error('Error getting challenges', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to get challenges' });
  }
});

// Get challenge stats (must be before /:code route)
app.get('/api/challenges/stats', standardLimiter, async (req: Request, res: Response) => {
  try {
    const stats = challengesDb.getChallengeStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get challenge stats' });
  }
});

// GET /api/challenges - List open challenges (public, with optional filtering)
app.get('/api/challenges', standardLimiter, (req: Request, res: Response) => {
  try {
    const { minFee, maxFee, wallet } = req.query;
    const challenges = challengesDb.getOpenChallenges({
      minFee: minFee ? parseFloat(minFee as string) : undefined,
      maxFee: maxFee ? parseFloat(maxFee as string) : undefined,
      excludeWallet: wallet as string | undefined,
    });
    res.json({ challenges });
  } catch (error: any) {
    challengeLogger.error('Error fetching open challenges', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// GET /api/challenges/direct/:wallet - Get challenges targeting a specific wallet
app.get('/api/challenges/direct/:wallet', standardLimiter, (req: Request, res: Response) => {
  try {
    const challenges = challengesDb.getDirectChallengesFor(req.params.wallet);
    res.json({ challenges });
  } catch (error: any) {
    challengeLogger.error('Error fetching direct challenges', { error: String(error) });
    res.status(500).json({ error: 'Failed to fetch direct challenges' });
  }
});

// Create a new battle challenge
app.post('/api/challenges/create', requireAuth(), standardLimiter, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.authenticatedWallet;
    if (!walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { entryFee, leverage, duration, targetWallet } = req.body;

    // Validate targetWallet if provided (optional - for direct challenges)
    if (targetWallet !== undefined && targetWallet !== null) {
      if (typeof targetWallet !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(targetWallet)) {
        return res.status(400).json({ error: 'Invalid target wallet address format' });
      }
      if (targetWallet === walletAddress) {
        return res.status(400).json({ error: 'Cannot create a challenge targeting yourself' });
      }
    }

    // Validate entry fee
    if (typeof entryFee !== 'number' ||
        entryFee < challengesDb.CHALLENGE_CONFIG.minEntryFee ||
        entryFee > challengesDb.CHALLENGE_CONFIG.maxEntryFee) {
      return res.status(400).json({
        error: `Entry fee must be between ${challengesDb.CHALLENGE_CONFIG.minEntryFee} and ${challengesDb.CHALLENGE_CONFIG.maxEntryFee} SOL`
      });
    }

    // Validate leverage
    if (!challengesDb.CHALLENGE_CONFIG.leverageOptions.includes(leverage)) {
      return res.status(400).json({
        error: `Leverage must be one of: ${challengesDb.CHALLENGE_CONFIG.leverageOptions.join(', ')}`
      });
    }

    // Validate duration
    if (!challengesDb.CHALLENGE_CONFIG.durationOptions.includes(duration)) {
      return res.status(400).json({
        error: `Duration must be one of: ${challengesDb.CHALLENGE_CONFIG.durationOptions.join(', ')} seconds`
      });
    }

    // Check pending challenge limit
    const pendingCount = challengesDb.getPendingChallengeCount(walletAddress);
    if (pendingCount >= challengesDb.CHALLENGE_CONFIG.maxPendingPerUser) {
      return res.status(400).json({
        error: `Maximum ${challengesDb.CHALLENGE_CONFIG.maxPendingPerUser} pending challenges allowed`
      });
    }

    // Get username from profile if available
    const profile = await getProfile(walletAddress);
    const username = profile?.username;

    // Create the challenge
    const challenge = challengesDb.createChallenge({
      challengerWallet: walletAddress,
      challengerUsername: username,
      entryFee,
      leverage,
      duration,
      targetWallet: targetWallet || undefined,
    });

    // Register challenge for notification when accepted
    challengeNotificationService.registerChallenge(
      challenge.id,
      walletAddress,
      challenge.challengeCode,
      entryFee,
      duration
    );

    // Notify target player of direct challenge via WebSocket
    if (targetWallet) {
      const targetSocketId = battleManager.getSocketIdForWallet(targetWallet);
      if (targetSocketId) {
        io.to(targetSocketId).emit('direct_challenge_received' as any, {
          challenge: {
            id: challenge.id,
            code: challenge.challengeCode,
            challengerWallet: challenge.challengerWallet,
            challengerUsername: challenge.challengerUsername,
            entryFee: challenge.entryFee,
            leverage: challenge.leverage,
            duration: challenge.duration,
            expiresAt: challenge.expiresAt,
          }
        });
        challengeLogger.info('Direct challenge notification sent', { targetWallet, challengeCode: challenge.challengeCode });
      }
    } else {
      // Broadcast open challenge to subscribed users
      io.to('challenges').emit('challenge_created' as any, {
        challenge: {
          id: challenge.id,
          code: challenge.challengeCode,
          challengerWallet: challenge.challengerWallet,
          challengerUsername: challenge.challengerUsername,
          entryFee: challenge.entryFee,
          leverage: challenge.leverage,
          duration: challenge.duration,
          expiresAt: challenge.expiresAt,
        }
      });
    }

    // Generate share URLs
    const shareUrl = `https://degendome.xyz/fight/${challenge.challengeCode}`;
    const shareText = `${username || 'A degen'} challenges you to a ${leverage}x Battle Arena fight!\n\nEntry: ${entryFee} SOL\nDuration: ${duration / 60} min\n\nAccept if you dare:\n${shareUrl}`;

    res.json({
      challengeId: challenge.id,
      challengeCode: challenge.challengeCode,
      shareUrl,
      shareLinks: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      },
      expiresAt: challenge.expiresAt,
    });
  } catch (error: any) {
    challengeLogger.error('Error creating challenge', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to create challenge' });
  }
});

// Get challenge details by code (public)
app.get('/api/challenges/:code', standardLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const walletAddress = req.headers['x-wallet-address'] as string;

    // Validate code format
    const codePattern = new RegExp(`^${challengesDb.CHALLENGE_CONFIG.codePrefix}[A-HJ-NP-Z2-9]{${challengesDb.CHALLENGE_CONFIG.codeLength}}$`, 'i');
    if (!codePattern.test(code)) {
      return res.status(400).json({ error: 'Invalid challenge code format' });
    }

    const challenge = challengesDb.getChallengeByCode(code);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Increment view count
    challengesDb.incrementViewCount(code);

    // Determine if user can accept
    let canAccept = true;
    let reason: string | null = null;

    if (challenge.status !== 'pending') {
      canAccept = false;
      reason = challenge.status === 'accepted' ? 'Challenge already accepted' :
               challenge.status === 'expired' ? 'Challenge expired' :
               challenge.status === 'completed' ? 'Challenge completed' :
               'Challenge not available';
    } else if (Date.now() > challenge.expiresAt) {
      canAccept = false;
      reason = 'Challenge expired';
    } else if (walletAddress && walletAddress === challenge.challengerWallet) {
      canAccept = false;
      reason = 'Cannot accept your own challenge';
    }

    res.json({
      challenge: {
        challengeCode: challenge.challengeCode,
        challengerWallet: challenge.challengerWallet,
        challengerUsername: challenge.challengerUsername,
        entryFee: challenge.entryFee,
        leverage: challenge.leverage,
        duration: challenge.duration,
        status: challenge.status,
        expiresAt: challenge.expiresAt,
        createdAt: challenge.createdAt,
      },
      canAccept,
      reason,
    });
  } catch (error: any) {
    challengeLogger.error('Error getting challenge', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to get challenge' });
  }
});

// Accept a challenge
app.post('/api/challenges/:code/accept', requireAuth(), standardLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const walletAddress = req.authenticatedWallet;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const challenge = challengesDb.getChallengeByCode(code);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Challenge no longer available' });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ error: 'Challenge expired' });
    }

    if (walletAddress === challenge.challengerWallet) {
      return res.status(400).json({ error: 'Cannot accept your own challenge' });
    }

    // Create a battle via WebSocket
    // For now, we'll create a simple battle ID and let the frontend handle the actual battle creation
    const battleId = `challenge-${challenge.id}-${Date.now()}`;

    // Update challenge to accepted
    const updatedChallenge = challengesDb.acceptChallenge(code, walletAddress, battleId);

    if (!updatedChallenge) {
      return res.status(400).json({ error: 'Failed to accept challenge' });
    }

    // Notify the challenger that their challenge was accepted
    const notificationTarget = challengeNotificationService.getNotificationTarget(challenge.id);
    if (notificationTarget) {
      notificationTarget.notification.acceptedBy = walletAddress;
      notificationTarget.notification.battleId = battleId;

      io.to(notificationTarget.socketId).emit('challenge_accepted', notificationTarget.notification);
      challengeNotificationService.markChallengeAccepted(challenge.id);
      challengeLogger.info('Challenge accepted notification sent', { challengerWallet: challenge.challengerWallet, code });
    }

    res.json({
      success: true,
      battleId,
      challenge: {
        challengeCode: updatedChallenge.challengeCode,
        entryFee: updatedChallenge.entryFee,
        leverage: updatedChallenge.leverage,
        duration: updatedChallenge.duration,
        challengerWallet: updatedChallenge.challengerWallet,
        challengerUsername: updatedChallenge.challengerUsername,
      },
    });
  } catch (error: any) {
    challengeLogger.error('Error accepting challenge', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to accept challenge' });
  }
});

// Cancel a pending challenge
app.delete('/api/challenges/:id', requireAuth(), standardLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const walletAddress = req.authenticatedWallet;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const success = challengesDb.cancelChallenge(id, walletAddress);

    if (!success) {
      return res.status(400).json({ error: 'Failed to cancel challenge. It may not exist or is not pending.' });
    }

    res.json({ success: true });
  } catch (error: any) {
    challengeLogger.error('Error cancelling challenge', { error: String(error) });
    res.status(500).json({ error: error.message || 'Failed to cancel challenge' });
  }
});

// ===================
// LDS (Last Degen Standing) Routes
// ===================

// Get current game state
app.get('/api/lds/game', (req: Request, res: Response) => {
  const currentGame = ldsManager.getCurrentGame();
  const activeGame = ldsManager.getActiveGame();

  if (activeGame) {
    const state = ldsManager.getGameState(activeGame.id);
    res.json({ game: state, status: 'active' });
  } else if (currentGame) {
    const state = ldsManager.getGameState(currentGame.id);
    res.json({ game: state, status: 'registering' });
  } else {
    res.json({ game: null, status: 'none' });
  }
});

// Get specific game state
app.get('/api/lds/game/:gameId', (req: Request, res: Response) => {
  const { gameId } = req.params;
  const state = ldsManager.getGameState(gameId);
  if (!state) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(state);
});

// Get player status
app.get('/api/lds/player/:wallet/status', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const status = ldsManager.getPlayerStatus(wallet);
  res.json(status);
});

// Get player stats
app.get('/api/lds/player/:wallet/stats', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const stats = ldsManager.getPlayerStats(wallet);
  res.json(stats);
});

// Get player history
app.get('/api/lds/player/:wallet/history', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const history = ldsManager.getPlayerHistory(wallet, limit);
  res.json(history);
});

// Get leaderboard
app.get('/api/lds/leaderboard', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const leaderboard = ldsManager.getLeaderboard(limit);
  res.json(leaderboard);
});

// Get recent games
app.get('/api/lds/games/recent', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const games = ldsManager.getRecentGames(limit);
  res.json(games);
});

// Get LDS config
app.get('/api/lds/config', (req: Request, res: Response) => {
  res.json(ldsManager.getConfig());
});

// Get recent winners for lobby display
app.get('/api/lds/recent-winners', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const winners = ldsManager.getRecentWinners(limit);
  res.json({ winners });
});

// Get platform stats for lobby display
app.get('/api/lds/stats', (req: Request, res: Response) => {
  const stats = ldsManager.getPlatformStats();
  res.json(stats);
});

// ===================
// Token Wars Routes
// ===================

// Get current battle state
app.get('/api/token-wars/battle', (req: Request, res: Response) => {
  const state = tokenWarsManager.getBattleState();
  res.json(state || { battle: null, status: 'none' });
});

// Get user's bet for current battle
app.get('/api/token-wars/bet/:wallet', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const bet = tokenWarsManager.getUserBet(wallet);
  res.json(bet);
});

// Get player stats
app.get('/api/token-wars/player/:wallet/stats', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const stats = tokenWarsManager.getPlayerStats(wallet);
  res.json(stats);
});

// Get player history
app.get('/api/token-wars/player/:wallet/history', (req: Request, res: Response) => {
  const { wallet } = req.params;
  const limit = parseInt(req.query.limit as string) || 20;
  const history = tokenWarsManager.getPlayerHistory(wallet, limit);
  res.json(history);
});

// Get leaderboard
app.get('/api/token-wars/leaderboard', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const leaderboard = tokenWarsManager.getLeaderboard(limit);
  res.json(leaderboard);
});

// Get recent battles
app.get('/api/token-wars/battles/recent', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const battles = tokenWarsManager.getRecentBattles(limit);
  res.json(battles);
});

// Get available tokens
app.get('/api/token-wars/tokens', (req: Request, res: Response) => {
  const tokens = tokenWarsManager.getAvailableTokens();
  res.json(tokens);
});

// Get Token Wars config
app.get('/api/token-wars/config', (req: Request, res: Response) => {
  res.json(tokenWarsManager.getConfig());
});

// Get upcoming matchups
app.get('/api/token-wars/upcoming', (req: Request, res: Response) => {
  const count = Math.min(parseInt(req.query.count as string) || 3, 5);
  const upcoming = tokenWarsManager.getUpcomingMatchups(count);
  res.json(upcoming);
});

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  // Start price service
  // 5s API fetches from Pyth Hermes (free, no rate limits) for near real-time prices
  await priceService.start(5000);

  // Start CoinMarketCap service for memecoins
  await coinMarketCapService.start();

  // Start draft tournament manager
  draftTournamentManager.start();

  // Initialize and start free bet escrow service
  const escrowInitialized = await freeBetEscrowService.init();
  if (escrowInitialized) {
    freeBetEscrowService.startProcessing();
    logger.info('Free bet escrow service started');
  } else {
    logger.warn('Free bet escrow service not initialized (missing ESCROW_WALLET_PRIVATE_KEY)');
  }

  // Initialize and start rake rebate service
  const rebateInitialized = await rakeRebateService.initialize();
  if (rebateInitialized) {
    rakeRebateService.startPolling();
    logger.info('Rake rebate service started');

    // Subscribe to rebate events for WebSocket notifications
    rakeRebateService.subscribe((event, data: any) => {
      if (event === 'rebate_sent' && data.walletAddress) {
        // Emit to the user's room
        io.to(data.walletAddress).emit('rebate_received' as any, {
          rebate: data.rebate,
          txSignature: data.txSignature,
        });
      }
    });
  } else {
    logger.warn('Rake rebate service not initialized (missing REBATE_WALLET_PRIVATE_KEY)');
  }

  // Initialize battle settlement service for on-chain settlements
  const settlementInitialized = battleSettlementService.initialize();
  if (settlementInitialized) {
    logger.info('Battle settlement service started');
  } else {
    logger.warn('Battle settlement service not initialized (missing BATTLE_AUTHORITY_PRIVATE_KEY)');
  }

  // Initialize LDS (Last Degen Standing) manager
  ldsManager.initialize();
  logger.info('LDS manager started');

  // Subscribe to LDS events for WebSocket notifications
  ldsManager.subscribe((event: LDSEvent) => {
    // Broadcast to all connected clients in the LDS room
    io.to('lds').emit('lds_event' as any, event);
  });

  // Initialize Token Wars manager
  tokenWarsManager.initialize();
  logger.info('Token Wars manager started');

  // Subscribe to Token Wars events for WebSocket notifications
  tokenWarsManager.subscribe((event: TWEvent) => {
    // Broadcast to all connected clients in the Token Wars room
    io.to('token_wars').emit('token_wars_event' as any, event);
  });

  // Subscribe to Chat events for WebSocket notifications
  chatService.subscribe((eventType, data) => {
    if (eventType === 'message' && data.message) {
      // Broadcast message to all clients in the battle room
      io.to(data.battleId).emit('chat_message', data.message);
    } else if (eventType === 'system' && data.content) {
      // Broadcast system message
      io.to(data.battleId).emit('chat_system', { battleId: data.battleId, content: data.content });
    }
  });

  // Initialize scheduled match system
  scheduledMatchManager.initialize();
  logger.info('Scheduled match system started');

  // Subscribe to scheduled match events for WebSocket notifications
  scheduledMatchManager.subscribe((event) => {
    const match = scheduledMatchManager.getMatch(event.matchId);

    if (event.type === 'player_registered' || event.type === 'player_unregistered') {
      if (match) {
        io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated' as any, match);
      }
    }

    if (event.type === 'ready_check_started') {
      // Notify registered players individually
      const registeredPlayers = event.data?.playersRequired || [];
      registeredPlayers.forEach((wallet: string) => {
        const socketId = battleManager.getSocketIdForWallet(wallet);
        if (socketId) {
          io.to(socketId).emit('scheduled_ready_check' as any, {
            matchId: event.matchId,
            expiresAt: event.data?.expiresAt
          });
        }
      });
    }

    if (event.type === 'match_started' || event.type === 'match_cancelled') {
      if (match) {
        io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated' as any, match);
      }
    }

    if (event.type === 'match_scheduled') {
      io.to('scheduled:battle').emit('scheduled_match_created' as any, match);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      SOL BATTLES                          ║
║                   Backend Server                          ║
╠═══════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api                   ║
║  WebSocket:   ws://localhost:${PORT}                         ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                               ║
║    GET  /api/tokens         - Whitelisted tokens          ║
║    GET  /api/prices         - Current prices              ║
║    GET  /api/battles        - Active battles              ║
║    GET  /api/battles/live   - Live battles (spectator)    ║
║    GET  /api/stats/:wallet  - User wager stats            ║
║    GET  /api/health         - Health check                ║
║    POST /api/simulator/start - Start battle simulator     ║
║    POST /api/simulator/stop  - Stop battle simulator      ║
╚═══════════════════════════════════════════════════════════╝
    `);

    // Auto-start simulator in development mode
    if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_SIMULATOR !== 'true') {
      logger.info('Auto-starting battle simulator for development');
      setTimeout(() => {
        battleSimulator.start(3);
      }, 2000);
    }

    // Auto-start prediction game for SOL
    logger.info('Starting prediction game for SOL');
    setTimeout(() => {
      predictionService.start('SOL');
    }, 3000);

    // Start backup scheduler
    startBackupScheduler();
  });

  // ===================
  // Global Error Handlers
  // ===================

  // Send alert for uncaught exceptions (add after server starts)
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    await alertService.sendCriticalAlert(
      'Uncaught Exception',
      error.message || 'Unknown error',
      'UNCAUGHT_EXCEPTION',
      { stack: error.stack?.substring(0, 500) }
    );
    // Give time for alert to send before exiting
    setTimeout(() => process.exit(1), 1000);
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled rejection', { reason });
    await alertService.sendCriticalAlert(
      'Unhandled Promise Rejection',
      String(reason),
      'UNHANDLED_REJECTION'
    );
  });
}

start().catch((error) => logger.error('Server startup failed', { error: String(error) }));
