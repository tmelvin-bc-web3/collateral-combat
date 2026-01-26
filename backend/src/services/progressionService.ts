// Progression system removed - will be replaced with ELO
//
// This file previously contained: XP awarding, level calculations, title/rank assignments,
// perk management, cosmetic unlocking, streak management, and event subscriptions.
// All progression logic has been removed as part of the transition to an ELO-based system.

import * as userStatsDb from '../db/userStatsDatabase';

// ===================
// Leaderboard Types (retained - not progression-specific)
// ===================

export interface LeaderboardEntry {
  rank: number;
  address: string;
  fullAddress: string;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  streak: number;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all';

// ===================
// Minimal Service (no-op stubs)
// ===================

class ProgressionService {
  // Leaderboard is retained - it's based on userStats, not progression/XP
  getLeaderboard(
    period: 'weekly' | 'monthly' | 'all' = 'all',
    metric: 'profit' | 'winRate' | 'volume' = 'profit',
    limit: number = 50
  ): LeaderboardEntry[] {
    const stats = userStatsDb.getStatsLeaderboard(metric, limit);

    return stats.map((entry, index) => ({
      rank: index + 1,
      address: this.shortenAddress(entry.walletAddress),
      fullAddress: entry.walletAddress,
      wins: entry.totalWins,
      losses: entry.totalLosses,
      winRate: entry.winRate,
      totalPnl: entry.totalProfitLoss,
      avgPnl: entry.totalWagers > 0 ? (entry.totalProfitLoss / entry.totalWagers) * 100 : 0,
      streak: entry.currentStreak,
    }));
  }

  private shortenAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }
}

// Export singleton instance
export const progressionService = new ProgressionService();
