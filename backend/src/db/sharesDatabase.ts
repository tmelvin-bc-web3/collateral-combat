import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'shares.db'));

// Initialize database schema
export function initializeSharesDatabase(): void {
  db.exec(`
    -- Share events for analytics and XP tracking
    CREATE TABLE IF NOT EXISTS share_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      game_mode TEXT NOT NULL,
      win_amount_lamports INTEGER NOT NULL,
      round_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      xp_awarded INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_share_events_wallet ON share_events(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_share_events_round ON share_events(round_id, wallet_address, platform);
  `);

  console.log('[SharesDB] Database initialized');
}

// Check if user already shared this round on this platform
export function hasShared(
  walletAddress: string,
  roundId: string,
  platform: string
): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM share_events
    WHERE wallet_address = ? AND round_id = ? AND platform = ?
    LIMIT 1
  `);
  const result = stmt.get(walletAddress, roundId, platform);
  return !!result;
}

// Record a share event
export function recordShare(params: {
  walletAddress: string;
  gameMode: string;
  winAmountLamports: number;
  roundId: string;
  platform: string;
  xpAwarded: number;
}): void {
  const stmt = db.prepare(`
    INSERT INTO share_events (wallet_address, game_mode, win_amount_lamports, round_id, platform, timestamp, xp_awarded)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    params.walletAddress,
    params.gameMode,
    params.winAmountLamports,
    params.roundId,
    params.platform,
    Date.now(),
    params.xpAwarded
  );
}

// Get share stats for a wallet
export function getShareStats(walletAddress: string): {
  totalShares: number;
  totalXpFromShares: number;
  sharesByPlatform: Record<string, number>;
} {
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count, SUM(xp_awarded) as xp
    FROM share_events
    WHERE wallet_address = ?
  `);
  const total = totalStmt.get(walletAddress) as { count: number; xp: number } | undefined;

  const platformStmt = db.prepare(`
    SELECT platform, COUNT(*) as count
    FROM share_events
    WHERE wallet_address = ?
    GROUP BY platform
  `);
  const platforms = platformStmt.all(walletAddress) as { platform: string; count: number }[];

  const sharesByPlatform: Record<string, number> = {};
  for (const p of platforms) {
    sharesByPlatform[p.platform] = p.count;
  }

  return {
    totalShares: total?.count || 0,
    totalXpFromShares: total?.xp || 0,
    sharesByPlatform,
  };
}

// Get the timestamp of user's last share that awarded XP
export function getLastXpShareTimestamp(walletAddress: string): number | null {
  const stmt = db.prepare(`
    SELECT timestamp FROM share_events
    WHERE wallet_address = ? AND xp_awarded > 0
    ORDER BY timestamp DESC
    LIMIT 1
  `);
  const result = stmt.get(walletAddress) as { timestamp: number } | undefined;
  return result?.timestamp || null;
}

// Check if user is on XP cooldown (last XP share was within last 24 hours)
export function isOnShareXpCooldown(walletAddress: string): boolean {
  const lastTimestamp = getLastXpShareTimestamp(walletAddress);
  if (!lastTimestamp) return false;

  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  return Date.now() - lastTimestamp < twentyFourHoursMs;
}

// Get time remaining on cooldown in milliseconds (0 if not on cooldown)
export function getShareXpCooldownRemaining(walletAddress: string): number {
  const lastTimestamp = getLastXpShareTimestamp(walletAddress);
  if (!lastTimestamp) return 0;

  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - lastTimestamp;
  return Math.max(0, twentyFourHoursMs - elapsed);
}

// Get recent shares (for analytics)
export function getRecentShares(limit: number = 100): Array<{
  walletAddress: string;
  gameMode: string;
  winAmountLamports: number;
  roundId: string;
  platform: string;
  timestamp: number;
  xpAwarded: number;
}> {
  const stmt = db.prepare(`
    SELECT wallet_address, game_mode, win_amount_lamports, round_id, platform, timestamp, xp_awarded
    FROM share_events
    ORDER BY timestamp DESC
    LIMIT ?
  `);
  return stmt.all(limit) as Array<{
    walletAddress: string;
    gameMode: string;
    winAmountLamports: number;
    roundId: string;
    platform: string;
    timestamp: number;
    xpAwarded: number;
  }>;
}

// Initialize on import
initializeSharesDatabase();
