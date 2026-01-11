import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'achievements.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ===================
// Type Definitions
// ===================

export type AchievementCategory =
  | 'wager'       // Wager-related achievements
  | 'win'         // Winning achievements
  | 'streak'      // Streak achievements
  | 'level'       // Level progression achievements
  | 'social'      // Social/referral achievements
  | 'special';    // Special/seasonal achievements

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  iconUrl: string;
  xpReward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: number;  // e.g., "10 wins" -> requirement = 10
  requirementType: string;  // e.g., "wins", "wagers", "streak_days"
  isHidden: boolean;  // Hidden achievements not shown until unlocked
  createdAt: number;
}

export interface UserAchievement {
  id: number;
  walletAddress: string;
  achievementId: string;
  unlockedAt: number;
  progress: number;  // Current progress towards achievement
  notified: boolean;  // Whether user has been notified of unlock
}

export interface AchievementProgress {
  achievement: Achievement;
  progress: number;
  isUnlocked: boolean;
  unlockedAt: number | null;
}

// Create tables
db.exec(`
  -- Achievement definitions
  CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    icon_url TEXT DEFAULT '',
    xp_reward INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common',
    requirement INTEGER DEFAULT 1,
    requirement_type TEXT NOT NULL,
    is_hidden INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- User achievement unlocks
  CREATE TABLE IF NOT EXISTS user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    notified INTEGER DEFAULT 0,
    UNIQUE(wallet_address, achievement_id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
  );

  -- User progress tracking (for achievements not yet unlocked)
  CREATE TABLE IF NOT EXISTS achievement_progress (
    wallet_address TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (wallet_address, achievement_id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_user_achievements_wallet ON user_achievements(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_achievement_progress_wallet ON achievement_progress(wallet_address);
`);

// ===================
// Prepared Statements
// ===================

const insertAchievement = db.prepare(`
  INSERT OR REPLACE INTO achievements (id, name, description, category, icon_url, xp_reward, rarity, requirement, requirement_type, is_hidden, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getAllAchievements = db.prepare(`SELECT * FROM achievements ORDER BY category, requirement`);

const getAchievementById = db.prepare(`SELECT * FROM achievements WHERE id = ?`);

const getUserAchievements = db.prepare(`
  SELECT ua.*, a.*
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.wallet_address = ?
  ORDER BY ua.unlocked_at DESC
`);

const getUnlockedAchievementIds = db.prepare(`
  SELECT achievement_id FROM user_achievements WHERE wallet_address = ?
`);

const unlockAchievement = db.prepare(`
  INSERT OR IGNORE INTO user_achievements (wallet_address, achievement_id, unlocked_at, progress, notified)
  VALUES (?, ?, ?, ?, 0)
`);

const getProgress = db.prepare(`
  SELECT progress FROM achievement_progress WHERE wallet_address = ? AND achievement_id = ?
`);

const upsertProgress = db.prepare(`
  INSERT INTO achievement_progress (wallet_address, achievement_id, progress, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(wallet_address, achievement_id) DO UPDATE SET
    progress = excluded.progress,
    updated_at = excluded.updated_at
`);

const markNotified = db.prepare(`
  UPDATE user_achievements SET notified = 1 WHERE wallet_address = ? AND achievement_id = ?
`);

const getUnnotifiedAchievements = db.prepare(`
  SELECT ua.*, a.*
  FROM user_achievements ua
  JOIN achievements a ON ua.achievement_id = a.id
  WHERE ua.wallet_address = ? AND ua.notified = 0
`);

// ===================
// Core Functions
// ===================

function mapAchievementRow(row: Record<string, unknown>): Achievement {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as AchievementCategory,
    iconUrl: row.icon_url as string,
    xpReward: row.xp_reward as number,
    rarity: row.rarity as Achievement['rarity'],
    requirement: row.requirement as number,
    requirementType: row.requirement_type as string,
    isHidden: (row.is_hidden as number) === 1,
    createdAt: row.created_at as number,
  };
}

export function defineAchievement(achievement: Omit<Achievement, 'createdAt'>): Achievement {
  const now = Date.now();
  insertAchievement.run(
    achievement.id,
    achievement.name,
    achievement.description,
    achievement.category,
    achievement.iconUrl,
    achievement.xpReward,
    achievement.rarity,
    achievement.requirement,
    achievement.requirementType,
    achievement.isHidden ? 1 : 0,
    now
  );
  return { ...achievement, createdAt: now };
}

export function getAchievements(): Achievement[] {
  const rows = getAllAchievements.all() as Record<string, unknown>[];
  return rows.map(mapAchievementRow);
}

export function getAchievement(id: string): Achievement | null {
  const row = getAchievementById.get(id) as Record<string, unknown> | undefined;
  return row ? mapAchievementRow(row) : null;
}

export function getUserUnlockedAchievements(walletAddress: string): AchievementProgress[] {
  const rows = getUserAchievements.all(walletAddress) as Record<string, unknown>[];
  return rows.map(row => ({
    achievement: mapAchievementRow(row),
    progress: row.progress as number,
    isUnlocked: true,
    unlockedAt: row.unlocked_at as number,
  }));
}

export function getAchievementProgress(walletAddress: string): AchievementProgress[] {
  const achievements = getAchievements();
  const unlockedIds = new Set(
    (getUnlockedAchievementIds.all(walletAddress) as { achievement_id: string }[])
      .map(r => r.achievement_id)
  );

  return achievements
    .filter(a => !a.isHidden || unlockedIds.has(a.id))
    .map(achievement => {
      const isUnlocked = unlockedIds.has(achievement.id);
      const progressRow = getProgress.get(walletAddress, achievement.id) as { progress: number } | undefined;

      return {
        achievement,
        progress: isUnlocked ? achievement.requirement : (progressRow?.progress || 0),
        isUnlocked,
        unlockedAt: null, // Could fetch from user_achievements if needed
      };
    });
}

export function updateProgress(
  walletAddress: string,
  achievementId: string,
  newProgress: number
): { unlocked: boolean; achievement: Achievement | null } {
  const achievement = getAchievement(achievementId);
  if (!achievement) {
    return { unlocked: false, achievement: null };
  }

  // Check if already unlocked
  const existingUnlock = getUnlockedAchievementIds.all(walletAddress) as { achievement_id: string }[];
  if (existingUnlock.some(r => r.achievement_id === achievementId)) {
    return { unlocked: false, achievement };
  }

  // Update progress
  upsertProgress.run(walletAddress, achievementId, newProgress, Date.now());

  // Check if achievement should be unlocked
  if (newProgress >= achievement.requirement) {
    unlockAchievement.run(walletAddress, achievementId, Date.now(), achievement.requirement);
    return { unlocked: true, achievement };
  }

  return { unlocked: false, achievement };
}

export function incrementProgress(
  walletAddress: string,
  achievementId: string,
  increment: number = 1
): { unlocked: boolean; achievement: Achievement | null; newProgress: number } {
  const progressRow = getProgress.get(walletAddress, achievementId) as { progress: number } | undefined;
  const currentProgress = progressRow?.progress || 0;
  const newProgress = currentProgress + increment;

  const result = updateProgress(walletAddress, achievementId, newProgress);
  return { ...result, newProgress };
}

export function unlockAchievementDirectly(
  walletAddress: string,
  achievementId: string
): boolean {
  const achievement = getAchievement(achievementId);
  if (!achievement) return false;

  const result = unlockAchievement.run(walletAddress, achievementId, Date.now(), achievement.requirement);
  return result.changes > 0;
}

export function getUnnotified(walletAddress: string): AchievementProgress[] {
  const rows = getUnnotifiedAchievements.all(walletAddress) as Record<string, unknown>[];
  return rows.map(row => ({
    achievement: mapAchievementRow(row),
    progress: row.requirement as number,
    isUnlocked: true,
    unlockedAt: row.unlocked_at as number,
  }));
}

export function markAsNotified(walletAddress: string, achievementId: string): boolean {
  const result = markNotified.run(walletAddress, achievementId);
  return result.changes > 0;
}

// ===================
// Bulk Progress Updates (for game events)
// ===================

export function checkAndUpdateAchievements(
  walletAddress: string,
  stats: {
    totalWagers?: number;
    totalWins?: number;
    currentStreak?: number;
    level?: number;
    totalProfit?: number;
  }
): Achievement[] {
  const unlockedAchievements: Achievement[] = [];
  const achievements = getAchievements();

  for (const achievement of achievements) {
    let currentValue = 0;

    switch (achievement.requirementType) {
      case 'total_wagers':
        currentValue = stats.totalWagers || 0;
        break;
      case 'total_wins':
        currentValue = stats.totalWins || 0;
        break;
      case 'win_streak':
        currentValue = stats.currentStreak || 0;
        break;
      case 'level':
        currentValue = stats.level || 0;
        break;
      case 'total_profit':
        currentValue = stats.totalProfit || 0;
        break;
      default:
        continue;
    }

    const result = updateProgress(walletAddress, achievement.id, currentValue);
    if (result.unlocked && result.achievement) {
      unlockedAchievements.push(result.achievement);
    }
  }

  return unlockedAchievements;
}

// ===================
// Seed Default Achievements
// ===================

export function seedDefaultAchievements(): void {
  const defaultAchievements: Omit<Achievement, 'createdAt'>[] = [
    // Wager achievements
    { id: 'first_wager', name: 'First Steps', description: 'Place your first wager', category: 'wager', iconUrl: '', xpReward: 50, rarity: 'common', requirement: 1, requirementType: 'total_wagers', isHidden: false },
    { id: 'wager_10', name: 'Getting Started', description: 'Place 10 wagers', category: 'wager', iconUrl: '', xpReward: 100, rarity: 'common', requirement: 10, requirementType: 'total_wagers', isHidden: false },
    { id: 'wager_50', name: 'Regular', description: 'Place 50 wagers', category: 'wager', iconUrl: '', xpReward: 250, rarity: 'uncommon', requirement: 50, requirementType: 'total_wagers', isHidden: false },
    { id: 'wager_100', name: 'Dedicated', description: 'Place 100 wagers', category: 'wager', iconUrl: '', xpReward: 500, rarity: 'rare', requirement: 100, requirementType: 'total_wagers', isHidden: false },
    { id: 'wager_500', name: 'High Roller', description: 'Place 500 wagers', category: 'wager', iconUrl: '', xpReward: 1000, rarity: 'epic', requirement: 500, requirementType: 'total_wagers', isHidden: false },
    { id: 'wager_1000', name: 'Whale', description: 'Place 1000 wagers', category: 'wager', iconUrl: '', xpReward: 2500, rarity: 'legendary', requirement: 1000, requirementType: 'total_wagers', isHidden: false },

    // Win achievements
    { id: 'first_win', name: 'Winner', description: 'Win your first wager', category: 'win', iconUrl: '', xpReward: 50, rarity: 'common', requirement: 1, requirementType: 'total_wins', isHidden: false },
    { id: 'win_10', name: 'On a Roll', description: 'Win 10 wagers', category: 'win', iconUrl: '', xpReward: 150, rarity: 'common', requirement: 10, requirementType: 'total_wins', isHidden: false },
    { id: 'win_50', name: 'Lucky', description: 'Win 50 wagers', category: 'win', iconUrl: '', xpReward: 300, rarity: 'uncommon', requirement: 50, requirementType: 'total_wins', isHidden: false },
    { id: 'win_100', name: 'Skilled', description: 'Win 100 wagers', category: 'win', iconUrl: '', xpReward: 750, rarity: 'rare', requirement: 100, requirementType: 'total_wins', isHidden: false },
    { id: 'win_500', name: 'Master', description: 'Win 500 wagers', category: 'win', iconUrl: '', xpReward: 1500, rarity: 'epic', requirement: 500, requirementType: 'total_wins', isHidden: false },

    // Streak achievements
    { id: 'streak_3', name: 'Hat Trick', description: 'Win 3 wagers in a row', category: 'streak', iconUrl: '', xpReward: 100, rarity: 'common', requirement: 3, requirementType: 'win_streak', isHidden: false },
    { id: 'streak_5', name: 'Hot Hand', description: 'Win 5 wagers in a row', category: 'streak', iconUrl: '', xpReward: 250, rarity: 'uncommon', requirement: 5, requirementType: 'win_streak', isHidden: false },
    { id: 'streak_10', name: 'Unstoppable', description: 'Win 10 wagers in a row', category: 'streak', iconUrl: '', xpReward: 500, rarity: 'rare', requirement: 10, requirementType: 'win_streak', isHidden: false },
    { id: 'streak_20', name: 'Legendary Streak', description: 'Win 20 wagers in a row', category: 'streak', iconUrl: '', xpReward: 2000, rarity: 'legendary', requirement: 20, requirementType: 'win_streak', isHidden: true },

    // Level achievements
    { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', category: 'level', iconUrl: '', xpReward: 100, rarity: 'common', requirement: 5, requirementType: 'level', isHidden: false },
    { id: 'level_10', name: 'Established', description: 'Reach level 10', category: 'level', iconUrl: '', xpReward: 200, rarity: 'uncommon', requirement: 10, requirementType: 'level', isHidden: false },
    { id: 'level_25', name: 'Veteran', description: 'Reach level 25', category: 'level', iconUrl: '', xpReward: 500, rarity: 'rare', requirement: 25, requirementType: 'level', isHidden: false },
    { id: 'level_50', name: 'Elite', description: 'Reach level 50', category: 'level', iconUrl: '', xpReward: 1000, rarity: 'epic', requirement: 50, requirementType: 'level', isHidden: false },
    { id: 'level_100', name: 'Legend', description: 'Reach level 100', category: 'level', iconUrl: '', xpReward: 5000, rarity: 'legendary', requirement: 100, requirementType: 'level', isHidden: false },
  ];

  for (const achievement of defaultAchievements) {
    defineAchievement(achievement);
  }
}

// Seed achievements on module load
seedDefaultAchievements();
