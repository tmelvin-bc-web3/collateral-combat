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

export type NotificationType =
  | 'wager_won'
  | 'wager_lost'
  | 'wager_push'
  | 'level_up'
  | 'perk_unlocked'
  | 'perk_expiring'
  | 'streak_bonus'
  | 'streak_lost'
  | 'free_wager_earned'
  | 'leaderboard_rank_change'
  | 'achievement_unlocked'
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

export function notifyLevelUp(
  walletAddress: string,
  previousLevel: number,
  newLevel: number,
  newTitle: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'level_up',
    title: 'Level Up!',
    message: `You reached Level ${newLevel}! New title: ${newTitle}`,
    data: { previousLevel, newLevel, newTitle },
  });
}

export function notifyPerkUnlocked(
  walletAddress: string,
  perkName: string,
  perkDescription: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'perk_unlocked',
    title: 'New Perk Unlocked!',
    message: `You unlocked: ${perkName} - ${perkDescription}`,
    data: { perkName, perkDescription },
  });
}

export function notifyStreakBonus(
  walletAddress: string,
  streakDays: number,
  bonusPercent: number
): Notification {
  return createNotification({
    walletAddress,
    type: 'streak_bonus',
    title: `${streakDays}-Day Streak!`,
    message: `Your ${streakDays}-day streak gives you +${bonusPercent}% XP bonus!`,
    data: { streakDays, bonusPercent },
  });
}

export function notifyStreakLost(walletAddress: string, previousStreak: number): Notification {
  return createNotification({
    walletAddress,
    type: 'streak_lost',
    title: 'Streak Lost',
    message: `Your ${previousStreak}-day streak has been reset. Start a new one today!`,
    data: { previousStreak },
  });
}

export function notifyFreeWagerEarned(
  walletAddress: string,
  count: number,
  reason: string
): Notification {
  return createNotification({
    walletAddress,
    type: 'free_wager_earned',
    title: 'Free Wager Earned!',
    message: `You earned ${count} free wager${count > 1 ? 's' : ''}: ${reason}`,
    data: { count, reason },
  });
}

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
