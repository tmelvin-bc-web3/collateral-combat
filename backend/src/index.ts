import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { corsOptions, socketCorsOptions } from './config';
import { priceService } from './services/priceService';
import { battleManager } from './services/battleManager';
import { spectatorService } from './services/spectatorService';
import { battleSimulator } from './services/battleSimulator';
import { predictionService } from './services/predictionService';
import { coinMarketCapService } from './services/coinMarketCapService';
import { draftTournamentManager } from './services/draftTournamentManager';
import { progressionService } from './services/progressionService';
import { freeBetEscrowService } from './services/freeBetEscrowService';
import { rakeRebateService } from './services/rakeRebateService';
import { battleSettlementService } from './services/battleSettlementService';
import { getProfile, upsertProfile, getProfiles, deleteProfile, isUsernameTaken, ProfilePictureType } from './db/database';
import * as userStatsDb from './db/userStatsDatabase';
import * as notificationDb from './db/notificationDatabase';
import * as achievementDb from './db/achievementDatabase';
import * as progressionDb from './db/progressionDatabase';
import * as waitlistDb from './db/waitlistDatabase';
import { globalLimiter, standardLimiter, strictLimiter, writeLimiter, burstLimiter } from './middleware/rateLimiter';
import { requireAuth, requireOwnWallet, requireAdmin, requireEntryOwnership } from './middleware/auth';
import { createToken } from './utils/jwt';
import { WHITELISTED_TOKENS } from './tokens';
import { BattleConfig, ServerToClientEvents, ClientToServerEvents, PredictionSide, DraftTournamentTier, WagerType } from './types';
import { Request, Response } from 'express';

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
function logSecurityEvent(event: string, details: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} |`, JSON.stringify(details));
}

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: socketCorsOptions,
});

// SECURITY: Freeze Object prototype to prevent prototype pollution attacks
Object.freeze(Object.prototype);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server
  crossOriginEmbedderPolicy: false,
}));
app.use(cors(corsOptions));
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

// REST API Routes

// Get all whitelisted tokens
app.get('/api/tokens', (req, res) => {
  res.json(WHITELISTED_TOKENS);
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
app.get('/api/username/check/:username', (req, res) => {
  const username = req.params.username;
  const excludeWallet = req.query.wallet as string | undefined;

  if (!username || username.length > 20) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }

  const taken = isUsernameTaken(username, excludeWallet);
  res.json({ available: !taken, username });
});

app.get('/api/profile/:wallet', (req, res) => {
  const profile = getProfile(req.params.wallet);
  if (!profile) {
    return res.json({
      walletAddress: req.params.wallet,
      pfpType: 'default',
      updatedAt: 0,
    });
  }
  res.json(profile);
});

app.put('/api/profile/:wallet', requireOwnWallet, standardLimiter, (req: Request, res: Response) => {
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

    // Validate username if provided
    if (username !== undefined && username !== null && username !== '') {
      if (typeof username !== 'string' || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 20 characters or less' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
      }
      // Check if username is already taken by another user
      if (isUsernameTaken(username, req.params.wallet)) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    const profile = upsertProfile({
      walletAddress: req.params.wallet,
      username: username || undefined,
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

app.get('/api/profiles', (req, res) => {
  const walletsParam = req.query.wallets as string;
  if (!walletsParam) {
    return res.status(400).json({ error: 'wallets query parameter required' });
  }

  const wallets = walletsParam.split(',').filter(w => w.length > 0);
  if (wallets.length === 0) {
    return res.json([]);
  }

  const profiles = getProfiles(wallets);
  res.json(profiles);
});

app.delete('/api/profile/:wallet', requireOwnWallet, (req: Request, res: Response) => {
  const deleted = deleteProfile(req.params.wallet);
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
 */
app.post('/api/auth/login', strictLimiter, (req: Request, res: Response) => {
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

      // Check for replay attack
      const sigKey = `login:${walletAddress}:${signature}`;
      if (usedSignatures.has(sigKey)) {
        logSecurityEvent('LOGIN_REPLAY_BLOCKED', { wallet: walletAddress });
        return res.status(401).json({ error: 'Signature already used' });
      }

      // Verify the signature
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

      if (!isValid) {
        logSecurityEvent('LOGIN_INVALID_SIGNATURE', { wallet: walletAddress });
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Mark signature as used
      usedSignatures.set(sigKey, now + 5 * 60 * 1000);

      // Create JWT token
      const token = createToken(walletAddress);

      console.log(`[Auth] Login successful: ${walletAddress.slice(0, 8)}...`);

      res.json({
        token,
        expiresIn: '24h',
        wallet: walletAddress,
      });
    } catch {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/verify
 * Verify a JWT token is still valid
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * Returns: { valid: boolean, wallet?: string }
 */
app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  const token = authHeader.slice(7);

  try {
    const { verifyToken } = require('./utils/jwt');
    const wallet = verifyToken(token);

    if (wallet) {
      res.json({ valid: true, wallet });
    } else {
      res.json({ valid: false });
    }
  } catch {
    res.json({ valid: false });
  }
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
      console.error('[NFT API] Helius error:', response.status);
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
    console.error('[NFT API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch NFTs', nfts: [] });
  }
});

// ===================
// Waitlist Endpoints
// ===================

// Join the waitlist
app.post('/api/waitlist/join', strictLimiter, async (req: Request, res: Response) => {
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
        console.log(`[Waitlist] Invalid referral code attempted: ${referralCode}`);
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

    if (!email || !walletAddress) {
      return res.status(400).json({ error: 'Email and wallet address required' });
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
    const balance = progressionService.getFreeBetBalance(walletAddress);
    if (balance.balance < 1) {
      return res.status(400).json({ error: 'No free bets available', balance });
    }

    // Check if user already has a pending/placed bet for this round
    const existingPosition = progressionDb.getFreeBetPositionForWalletAndRound(walletAddress, roundId);
    if (existingPosition && ['pending', 'placed', 'active'].includes(existingPosition.status)) {
      return res.status(400).json({ error: 'Already have a free bet for this round', position: existingPosition });
    }

    // Place bet on-chain via escrow service
    const result = await freeBetEscrowService.placeFreeBet(walletAddress, roundId, side as 'long' | 'short');
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to place free bet on-chain' });
    }

    // Deduct free bet credit only after successful on-chain bet
    const useResult = progressionService.useFreeBetCredit(walletAddress, 'oracle', `Free bet on round ${roundId}`);
    if (!useResult.success) {
      console.warn('[FreeBet] Failed to deduct credit after successful bet:', walletAddress);
    }

    res.json({
      success: true,
      position: result.position,
      txSignature: result.txSignature,
      remainingFreeBets: useResult.success ? useResult.balance.balance : balance.balance - 1,
    });
  } catch (error: any) {
    console.error('Error placing free bet:', error);
    res.status(500).json({ error: error.message || 'Failed to place free bet' });
  }
});

// Get user's free bet positions
app.get('/api/prediction/:wallet/free-bet-positions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  // For pagination we need to implement it - for now just get with limit
  const positions = progressionDb.getFreeBetPositionsForWallet(req.params.wallet, limit);

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
app.post('/api/draft/tournaments/:id/enter', requireAuth(), strictLimiter, (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress required' });
    }
    // Ensure wallet in body matches authenticated wallet
    if (walletAddress !== req.authenticatedWallet) {
      return res.status(403).json({ error: 'Wallet address does not match authenticated wallet', code: 'FORBIDDEN' });
    }
    const entry = draftTournamentManager.enterTournament(req.params.id, walletAddress);
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
app.get('/api/progression/:wallet', (req, res) => {
  const progression = progressionService.getProgression(req.params.wallet);
  res.json(progression);
});

// Get XP history
app.get('/api/progression/:wallet/history', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const history = progressionService.getXpHistory(req.params.wallet, limit);
  res.json(history);
});

// Get available & active perks
app.get('/api/progression/:wallet/perks', (req, res) => {
  const perks = progressionService.getAvailablePerks(req.params.wallet);
  res.json(perks);
});

// Activate a perk (requires wallet ownership)
app.post('/api/progression/:wallet/perks/:id/activate', requireOwnWallet, strictLimiter, (req: Request, res: Response) => {
  try {
    const perkId = parseInt(req.params.id);
    if (isNaN(perkId)) {
      return res.status(400).json({ error: 'Invalid perk ID' });
    }
    const perk = progressionService.activatePerk(req.params.wallet, perkId);
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
app.get('/api/progression/:wallet/cosmetics', (req, res) => {
  const cosmetics = progressionService.getUnlockedCosmetics(req.params.wallet);
  res.json(cosmetics);
});

// Get current rake % for user (returns both Draft and Oracle rates)
app.get('/api/progression/:wallet/rake', (req, res) => {
  const draftRake = progressionService.getActiveRakeReduction(req.params.wallet);
  const oracleRake = progressionService.getActiveOracleRakeReduction(req.params.wallet);
  res.json({
    rakePercent: draftRake,  // Legacy: Draft rake
    draftRakePercent: draftRake,
    oracleRakePercent: oracleRake
  });
});

// ============= Free Bet Endpoints =============

// Get free bet balance (requires wallet ownership - sensitive data)
app.get('/api/progression/:wallet/free-bets', requireOwnWallet, (req: Request, res: Response) => {
  const balance = progressionService.getFreeBetBalance(req.params.wallet);
  res.json(balance);
});

// Get free bet transaction history (requires wallet ownership - sensitive data)
app.get('/api/progression/:wallet/free-bets/history', requireOwnWallet, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = progressionService.getFreeBetTransactionHistory(req.params.wallet, limit);
  res.json(history);
});

// Use free bet credit (requires wallet ownership)
app.post('/api/progression/:wallet/free-bets/use', requireOwnWallet, strictLimiter, (req: Request, res: Response) => {
  const { gameMode, description } = req.body;

  if (!gameMode || !['oracle', 'battle', 'draft', 'spectator'].includes(gameMode)) {
    return res.status(400).json({ error: 'Invalid game mode' });
  }

  const result = progressionService.useFreeBetCredit(
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
app.get('/api/progression/:wallet/rebates', requireOwnWallet, (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const rebates = progressionDb.getRakeRebatesForWallet(req.params.wallet, limit);

  res.json({
    rebates,
    total: rebates.length,
    limit,
    offset,
  });
});

// Get rebate summary (total earned, pending, etc.)
app.get('/api/progression/:wallet/rebates/summary', requireOwnWallet, (req: Request, res: Response) => {
  const summary = progressionDb.getRakeRebateSummary(req.params.wallet);

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
app.get('/api/progression/:wallet/streak', (req, res) => {
  const streak = progressionService.getStreak(req.params.wallet);
  const bonusPercent = Math.round(progressionService.getStreakBonus(streak.currentStreak) * 100);
  const atRisk = progressionService.isStreakAtRisk(req.params.wallet);

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
  console.log(`Client connected: ${socket.id}`);

  let currentBattleId: string | null = null;
  let walletAddress: string | null = null;

  // Create a new battle
  socket.on('create_battle', (config: BattleConfig, wallet: string) => {
    try {
      walletAddress = wallet;
      const battle = battleManager.createBattle(config, wallet);
      currentBattleId = battle.id;
      socket.join(battle.id);
      socket.emit('battle_update', battle);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Join existing battle
  socket.on('join_battle', (battleId: string, wallet: string) => {
    try {
      walletAddress = wallet;
      const battle = battleManager.joinBattle(battleId, wallet);
      if (battle) {
        currentBattleId = battleId;
        socket.join(battleId);
        io.to(battleId).emit('battle_update', battle);

        if (battle.status === 'active') {
          io.to(battleId).emit('battle_started', battle);
        }
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Queue for matchmaking
  socket.on('queue_matchmaking', (config: BattleConfig, wallet: string) => {
    try {
      walletAddress = wallet;
      battleManager.queueForMatchmaking(config, wallet);

      const status = battleManager.getQueueStatus(config);
      socket.emit('matchmaking_status', {
        position: status.position,
        estimated: status.playersInQueue > 1 ? 5 : 30, // seconds
      });
    } catch (error: any) {
      socket.emit('error', error.message);
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
      console.log(`[Battle] Signed position opened by ${walletAddress}`);
    } catch (error: any) {
      console.error('[Battle] Signed open position error:', error.message);
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
      console.log(`[Battle] Signed position closed by ${walletAddress}`);
    } catch (error: any) {
      console.error('[Battle] Signed close position error:', error.message);
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
      console.log(`[Battle] Solo practice started - ID: ${battle.id}, On-chain: ${onChainBattleId || 'none'}`);
    } catch (error: any) {
      console.error('[Battle] Solo practice error:', error);
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

  socket.on('place_bet', (battleId: string, backedPlayer: string, amount: number, wallet: string) => {
    try {
      const bet = spectatorService.placeBet(battleId, backedPlayer, amount, wallet);
      socket.emit('bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  socket.on('get_my_bets', (wallet: string) => {
    const bets = spectatorService.getUserBets(wallet);
    socket.emit('user_bets', bets);
  });

  // On-chain betting flow with odds locking
  socket.on('request_odds_lock', (data: {
    battleId: string;
    backedPlayer: string;
    amount: number;
    walletAddress: string;
  }) => {
    try {
      const lock = spectatorService.requestOddsLock(
        data.battleId,
        data.backedPlayer,
        data.amount,
        data.walletAddress
      );
      socket.emit('odds_lock', lock);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  socket.on('verify_bet', (data: {
    lockId: string;
    txSignature: string;
    walletAddress: string;
  }) => {
    try {
      const bet = spectatorService.verifyAndRecordBet(
        data.lockId,
        data.txSignature,
        data.walletAddress
      );
      if (bet) {
        socket.emit('bet_verified', bet);
        // Broadcast to spectators
        io.to(`spectate_${bet.battleId}`).emit('bet_placed', bet);
      } else {
        socket.emit('error', 'Failed to verify bet - lock may be expired or already used');
      }
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  socket.on('get_unclaimed_bets', (wallet: string) => {
    const bets = spectatorService.getUnclaimedWins(wallet);
    socket.emit('unclaimed_bets', bets);
  });

  socket.on('verify_claim', (data: {
    betId: string;
    txSignature: string;
  }) => {
    try {
      spectatorService.markBetClaimed(data.betId, data.txSignature);
      socket.emit('claim_verified', { betId: data.betId, txSignature: data.txSignature });
    } catch (error: any) {
      socket.emit('error', error.message);
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

  socket.on('place_prediction', (asset: string, side: PredictionSide, amount: number, wallet: string) => {
    try {
      const bet = predictionService.placeBet(asset, side, amount, wallet);
      socket.emit('prediction_bet_placed', bet);
    } catch (error: any) {
      socket.emit('error', error.message);
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

  socket.on('subscribe_progression', (wallet: string) => {
    walletAddress = wallet;
    socket.join(`progression_${wallet}`);
    // Send current progression state
    const progression = progressionService.getProgression(wallet);
    socket.emit('progression_update' as any, progression);
  });

  socket.on('unsubscribe_progression', (wallet: string) => {
    socket.leave(`progression_${wallet}`);
  });

  // ===================
  // Notification Events
  // ===================

  socket.on('subscribe_notifications', (wallet: string) => {
    socket.join(`notifications_${wallet}`);
    // Send current unread count
    const count = notificationDb.getUnreadCount(wallet);
    socket.emit('notification_count' as any, { count });
  });

  socket.on('unsubscribe_notifications', (wallet: string) => {
    socket.leave(`notifications_${wallet}`);
  });

  // ===================
  // Rebate Events
  // ===================

  socket.on('subscribe_rebates', (wallet: string) => {
    socket.join(`rebates_${wallet}`);
    // Send current rebate summary
    const summary = progressionDb.getRakeRebateSummary(wallet);
    const LAMPORTS_PER_SOL = 1_000_000_000;
    socket.emit('rebate_summary' as any, {
      totalRebates: summary.totalRebates,
      totalRebateLamports: summary.totalRebateLamports,
      totalRebateSol: summary.totalRebateLamports / LAMPORTS_PER_SOL,
      pendingRebateLamports: summary.pendingRebateLamports,
      pendingRebateSol: summary.pendingRebateLamports / LAMPORTS_PER_SOL,
    });
  });

  socket.on('unsubscribe_rebates', (wallet: string) => {
    socket.leave(`rebates_${wallet}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (walletAddress) {
      battleManager.leaveMatchmaking(walletAddress);
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
      console.log(`[Settlement] Triggering on-chain settlement for battle ${battle.id}`);

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

// Start server
const PORT = process.env.PORT || 3001;

async function start() {
  // Start price service
  await priceService.start(5000); // Update prices every 5 seconds

  // Start CoinMarketCap service for memecoins
  await coinMarketCapService.start();

  // Start draft tournament manager
  draftTournamentManager.start();

  // Initialize and start free bet escrow service
  const escrowInitialized = await freeBetEscrowService.init();
  if (escrowInitialized) {
    freeBetEscrowService.startProcessing();
    console.log('[Startup] Free bet escrow service started');
  } else {
    console.warn('[Startup] Free bet escrow service not initialized (missing ESCROW_WALLET_PRIVATE_KEY)');
  }

  // Initialize and start rake rebate service
  const rebateInitialized = await rakeRebateService.initialize();
  if (rebateInitialized) {
    rakeRebateService.startPolling();
    console.log('[Startup] Rake rebate service started');

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
    console.warn('[Startup] Rake rebate service not initialized (missing REBATE_WALLET_PRIVATE_KEY)');
  }

  // Initialize battle settlement service for on-chain settlements
  const settlementInitialized = battleSettlementService.initialize();
  if (settlementInitialized) {
    console.log('[Startup] Battle settlement service started');
  } else {
    console.warn('[Startup] Battle settlement service not initialized (missing BATTLE_AUTHORITY_PRIVATE_KEY)');
  }

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
      console.log('\n🎮 Auto-starting battle simulator for development...\n');
      setTimeout(() => {
        battleSimulator.start(3);
      }, 2000);
    }

    // Auto-start prediction game for SOL
    console.log('\n🎯 Starting prediction game for SOL...\n');
    setTimeout(() => {
      predictionService.start('SOL');
    }, 3000);
  });
}

start().catch(console.error);
