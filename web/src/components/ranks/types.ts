// Ranks Page Types

import type { DrTier } from '@/components/profile';

export type TimeFilter = 'weekly' | 'monthly' | 'all';
export type GameMode = 'all' | 'arena' | 'token-wars' | 'lds' | 'war-party' | 'spectate';
export type RankCategory = 'profit' | 'winrate' | 'volume' | 'streak' | 'battles' | 'roi' | 'dr';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  rankChange: number;
  walletAddress: string;
  username: string;
  avatar?: string;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  avgPnl: number;
  streak: number;
  isUser: boolean;
  // DR fields
  dr?: number;
  tier?: DrTier;
  division?: number;
  isApex?: boolean;
  isPlacement?: boolean;
}

export interface GlobalStats {
  totalBattles: number;
  totalVolume: number;
  activeWarriors: number;
  longestStreak: number;
  biggestWin: number;
}

// Filter options
export const GAME_MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: 'all', label: 'All Games' },
  { value: 'arena', label: 'Arena (1v1)' },
  { value: 'token-wars', label: 'Token Wars' },
  { value: 'lds', label: 'Last Degen Standing' },
  { value: 'war-party', label: 'War Party' },
  { value: 'spectate', label: 'Spectator Betting' },
];

export const CATEGORY_OPTIONS: { value: RankCategory; label: string }[] = [
  { value: 'dr', label: 'DegenDome Rating' },
  { value: 'profit', label: 'Total Profit' },
  { value: 'winrate', label: 'Win Rate' },
  { value: 'volume', label: 'Volume Traded' },
  { value: 'streak', label: 'Current Streak' },
  { value: 'battles', label: 'Battles Won' },
  { value: 'roi', label: 'ROI %' },
];

export const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all', label: 'All Time' },
];

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
