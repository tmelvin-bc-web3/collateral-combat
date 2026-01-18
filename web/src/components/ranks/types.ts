// Ranks Page Types

export type RanksTab = 'leaderboard' | 'progression' | 'achievements' | 'profile';
export type TimeFilter = 'weekly' | 'monthly' | 'all';
export type GameMode = 'all' | 'arena' | 'token-wars' | 'lds' | 'war-party' | 'spectate';
export type RankCategory = 'profit' | 'winrate' | 'volume' | 'streak' | 'battles' | 'roi';
export type RankTier = 'rookie' | 'contender' | 'warrior' | 'veteran' | 'champion' | 'legend' | 'immortan';

export interface RankTierConfig {
  id: RankTier;
  name: string;
  requirement: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  perks: string[];
}

export interface UserRankStats {
  walletAddress: string;
  username?: string;
  avatar?: string;
  level: number;
  xp: number;
  xpToNext: number;
  xpPercent: number;
  rankTier: RankTier;
  rankTitle: string;
  globalRank: number;
  rankChange: number;
  winRate: number;
  totalPnL: number;
  streak: number;
  wins: number;
  losses: number;
  totalBattles: number;
  recentAchievements: Achievement[];
  totalAchievements: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  rankChange: number;
  walletAddress: string;
  username: string;
  avatar?: string;
  level: number;
  rankTier: RankTier;
  rankTitle: string;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  avgPnl: number;
  streak: number;
  isUser: boolean;
}

export interface GlobalStats {
  totalBattles: number;
  totalVolume: number;
  activeWarriors: number;
  longestStreak: number;
  biggestWin: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: AchievementCategory;
  unlocked: boolean;
  unlockedDate?: string;
  progress?: number;
  progressText?: string;
  reward: string;
}

export type AchievementCategory = 'battles' | 'wins' | 'profit' | 'streaks' | 'social' | 'special';

export interface AchievementCategoryInfo {
  id: AchievementCategory;
  name: string;
  icon: string;
  unlocked: number;
  total: number;
}

export interface GameModeStats {
  mode: GameMode;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
}

export interface RecentBattle {
  id: string;
  opponent: string;
  opponentAvatar?: string;
  gameMode: string;
  won: boolean;
  pnl: number;
  timeAgo: string;
}

// Rank tier configuration - matches progression system
export const RANK_TIERS: RankTierConfig[] = [
  {
    id: 'rookie',
    name: 'Rookie',
    requirement: 'Level 1-5',
    minLevel: 1,
    maxLevel: 5,
    color: 'from-gray-500 to-slate-600',
    perks: []
  },
  {
    id: 'contender',
    name: 'Contender',
    requirement: 'Level 6-10',
    minLevel: 6,
    maxLevel: 10,
    color: 'from-green-500 to-emerald-600',
    perks: ['1% rake discount']
  },
  {
    id: 'warrior',
    name: 'Warrior',
    requirement: 'Level 11-20',
    minLevel: 11,
    maxLevel: 20,
    color: 'from-blue-500 to-indigo-600',
    perks: ['2% rake discount', 'Avatar frame']
  },
  {
    id: 'veteran',
    name: 'Veteran',
    requirement: 'Level 21-35',
    minLevel: 21,
    maxLevel: 35,
    color: 'from-red-500 to-rose-700',
    perks: ['3% rake discount', 'Profile badge']
  },
  {
    id: 'champion',
    name: 'Champion',
    requirement: 'Level 36-50',
    minLevel: 36,
    maxLevel: 50,
    color: 'from-cyan-500 to-teal-600',
    perks: ['5% rake discount', 'Custom title']
  },
  {
    id: 'legend',
    name: 'Legend',
    requirement: 'Level 51-75',
    minLevel: 51,
    maxLevel: 75,
    color: 'from-amber-500 to-yellow-600',
    perks: ['7% rake discount', 'Exclusive cosmetics', 'Early access']
  },
  {
    id: 'immortan',
    name: 'Immortan',
    requirement: 'Level 76-100',
    minLevel: 76,
    maxLevel: 100,
    color: 'from-violet-600 to-purple-800',
    perks: ['10% rake discount', 'All cosmetics', 'Hall of Fame', 'Priority support']
  }
];

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

// Helper functions
export function getRankTierColor(tier: RankTier): string {
  switch (tier) {
    case 'immortan': return 'text-purple-400';
    case 'legend': return 'text-amber-400';
    case 'champion': return 'text-cyan-400';
    case 'veteran': return 'text-red-400';
    case 'warrior': return 'text-blue-400';
    case 'contender': return 'text-green-400';
    case 'rookie':
    default: return 'text-gray-400';
  }
}

export function getRankTierBgColor(tier: RankTier): string {
  switch (tier) {
    case 'immortan': return 'bg-purple-500/20 border-purple-500/30';
    case 'legend': return 'bg-amber-500/20 border-amber-500/30';
    case 'champion': return 'bg-cyan-500/20 border-cyan-500/30';
    case 'veteran': return 'bg-red-500/20 border-red-500/30';
    case 'warrior': return 'bg-blue-500/20 border-blue-500/30';
    case 'contender': return 'bg-green-500/20 border-green-500/30';
    case 'rookie':
    default: return 'bg-gray-500/20 border-gray-500/30';
  }
}

// Helper to get rank tier from level
export function getRankTierFromLevel(level: number): RankTier {
  if (level >= 76) return 'immortan';
  if (level >= 51) return 'legend';
  if (level >= 36) return 'champion';
  if (level >= 21) return 'veteran';
  if (level >= 11) return 'warrior';
  if (level >= 6) return 'contender';
  return 'rookie';
}

// Helper to get rank name from level
export function getRankNameFromLevel(level: number): string {
  const tier = RANK_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel);
  return tier?.name || 'Rookie';
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
