import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'notifications.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  -- User notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(wallet_address, is_read);
`);

// ===================
// Type Definitions
// ===================

// Progression system removed - will be replaced with ELO
// Removed notification types: 'level_up', 'perk_unlocked', 'perk_expiring', 'streak_bonus', 'streak_lost', 'achievement_unlocked'
export type NotificationType =
  | 'wager_won'
  | 'wager_lost'
  | 'wager_push'
  | 'leaderboard_rank_change'
  | 'tournament_match_ready'
  | 'event_starting'
  | 'system';

export interface Notification {
  id: number;
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: number;
}

export interface NotificationCreateInput {
  walletAddress: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationListOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

// ===================
// Prepared Statements
// ===================

const insertNotification = db.prepare(`
  INSERT INTO notifications (wallet_address, type, title, message, data, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getNotificationsByWallet = db.prepare(`
  SELECT * FROM notifications
  WHERE wallet_address = ?
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`);

const getUnreadNotificationsByWallet = db.prepare(`
  SELECT * FROM notifications
  WHERE wallet_address = ? AND is_read = 0
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`);

const countUnreadNotifications = db.prepare(`
  SELECT COUNT(*) as count FROM notifications
  WHERE wallet_address = ? AND is_read = 0
`);

const markAsRead = db.prepare(`
  UPDATE notifications SET is_read = 1 WHERE id = ? AND wallet_address = ?
`);

const markAllAsRead = db.prepare(`
  UPDATE notifications SET is_read = 1 WHERE wallet_address = ?
`);

const deleteNotification = db.prepare(`
  DELETE FROM notifications WHERE id = ? AND wallet_address = ?
`);

const deleteOldNotifications = db.prepare(`
  DELETE FROM notifications WHERE created_at < ?
`);

// ===================
// Functions
// ===================

export function createNotification(input: NotificationCreateInput): Notification {
  const now = Date.now();
  const dataJson = input.data ? JSON.stringify(input.data) : null;

  const result = insertNotification.run(
    input.walletAddress,
    input.type,
    input.title,
    input.message,
    dataJson,
    now
  );

  return {
    id: Number(result.lastInsertRowid),
    walletAddress: input.walletAddress,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data,
    isRead: false,
    createdAt: now,
  };
}

export function getNotifications(
  walletAddress: string,
  options: NotificationListOptions = {}
): { notifications: Notification[]; unreadCount: number } {
  const limit = Math.min(options.limit || 50, 100);
  const offset = options.offset || 0;

  const rows = options.unreadOnly
    ? getUnreadNotificationsByWallet.all(walletAddress, limit, offset) as any[]
    : getNotificationsByWallet.all(walletAddress, limit, offset) as any[];

  const countResult = countUnreadNotifications.get(walletAddress) as any;

  return {
    notifications: rows.map(mapNotificationRow),
    unreadCount: countResult.count,
  };
}

export function getUnreadCount(walletAddress: string): number {
  const result = countUnreadNotifications.get(walletAddress) as any;
  return result.count;
}

export function markNotificationRead(id: number, walletAddress: string): boolean {
  const result = markAsRead.run(id, walletAddress);
  return result.changes > 0;
}

export function markAllNotificationsRead(walletAddress: string): number {
  const result = markAllAsRead.run(walletAddress);
  return result.changes;
}

export function deleteNotificationById(id: number, walletAddress: string): boolean {
  const result = deleteNotification.run(id, walletAddress);
  return result.changes > 0;
}

export function cleanupOldNotifications(olderThanDays: number = 30): number {
  const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const result = deleteOldNotifications.run(cutoffTime);
  return result.changes;
}

function mapNotificationRow(row: any): Notification {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    data: row.data ? JSON.parse(row.data) : undefined,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

// ===================
// Notification Helpers
// ===================

export function notifyWagerWon(
  walletAddress: string,
  amount: number,
  profit: number,
  gameType: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'wager_won',
    title: 'Wager Won!',
    message: `You won $${profit.toFixed(2)} on your ${gameType} wager!`,
    data: { amount, profit, gameType },
  });
}

export function notifyWagerLost(
  walletAddress: string,
  amount: number,
  gameType: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'wager_lost',
    title: 'Wager Lost',
    message: `Your $${amount.toFixed(2)} ${gameType} wager did not win.`,
    data: { amount, gameType },
  });
}

// Progression system removed - will be replaced with ELO
// Removed: notifyLevelUp, notifyPerkUnlocked, notifyStreakBonus, notifyStreakLost

export function notifyRankChange(
  walletAddress: string,
  previousRank: number,
  newRank: number,
  leaderboardType: string
): Notification {
  const improved = newRank < previousRank;
  return createNotification({
    walletAddress,
    type: 'leaderboard_rank_change',
    title: improved ? 'Rank Improved!' : 'Rank Changed',
    message: improved
      ? `You moved up to #${newRank} on the ${leaderboardType} leaderboard!`
      : `Your ${leaderboardType} rank changed from #${previousRank} to #${newRank}`,
    data: { previousRank, newRank, leaderboardType, improved },
  });
}

export function notifyTournamentMatchReady(
  walletAddress: string,
  tournamentName: string,
  opponentWallet: string,
  round: number,
  roundName: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'tournament_match_ready',
    title: 'Tournament Match Ready!',
    message: `Your ${roundName} match in ${tournamentName} is ready. Time to battle!`,
    data: { tournamentName, opponentWallet, round, roundName },
  });
}

export function notifyEventStarting(
  walletAddress: string,
  eventName: string,
  eventId: string,
  startsInMinutes: number
): Notification {
  return createNotification({
    walletAddress,
    type: 'event_starting',
    title: 'Event Starting Soon!',
    message: `${eventName} begins in ${startsInMinutes} minute${startsInMinutes !== 1 ? 's' : ''}!`,
    data: { eventId, eventName, startsInMinutes },
  });
}
