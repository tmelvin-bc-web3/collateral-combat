/**
 * Fighter Stats Service
 *
 * Provides trading style analysis, favorite assets, recent form,
 * and fighter comparison data for the Fighter Identity feature.
 */

import * as battleHistoryDb from '../db/battleHistoryDatabase';
import * as eloDb from '../db/eloDatabase';
import { getDisplayTier } from './eloService';

// ===================
// Type Definitions
// ===================

export interface TradingStyle {
  totalPositions: number;
  avgLeverage: number;
  aggressionScore: number;  // 0-100, higher = more aggressive
  longShortRatio: number;   // > 1 means prefers long, < 1 prefers short
}

export interface FavoriteAsset {
  asset: string;
  count: number;
  winRate: number;
}

export interface RecentFormResult {
  battleId: string;
  result: 'win' | 'loss' | 'tie';
  pnlPercent: number;
  opponentWallet: string;
  endedAt: number;
}

export interface FighterComparison {
  fighter1: FighterProfile;
  fighter2: FighterProfile;
  headToHead: {
    fighter1Wins: number;
    fighter2Wins: number;
    ties: number;
  };
}

export interface FighterProfile {
  wallet: string;
  elo: number;
  tier: string;
  battleCount: number;
  wins: number;
  losses: number;
  winRate: number;
  tradingStyle: TradingStyle;
  favoriteAssets: FavoriteAsset[];
  currentStreak: number;
  bestStreak: number;
  roi: number;
}

// ===================
// Default Trading Style
// ===================

// Default values for new fighters with no battle history
const DEFAULT_TRADING_STYLE: TradingStyle = {
  totalPositions: 0,
  avgLeverage: 5,  // Assume moderate leverage
  aggressionScore: 50,  // Neutral aggression
  longShortRatio: 1,  // No preference
};

// Default favorite assets for new fighters
const DEFAULT_FAVORITE_ASSETS: FavoriteAsset[] = [
  { asset: 'SOL', count: 0, winRate: 0 },
  { asset: 'ETH', count: 0, winRate: 0 },
  { asset: 'BTC', count: 0, winRate: 0 },
];

// ===================
// Trading Style Analysis
// ===================

/**
 * Get trading style analysis for a wallet.
 * Currently returns simulated data based on battle history.
 * In the future, this could analyze actual position data.
 */
export async function getTradingStyle(wallet: string): Promise<TradingStyle> {
  const stats = battleHistoryDb.getPlayerStats(wallet);

  if (stats.totalBattles === 0) {
    return DEFAULT_TRADING_STYLE;
  }

  // Calculate aggression score based on win rate and battle frequency
  // Higher win rate + more battles = more aggressive fighter
  const aggressionScore = Math.min(100, Math.round(
    (stats.winRate * 0.6) + // 60% weight on win rate
    (Math.min(stats.totalBattles, 50) * 0.8)  // 40% weight on experience (capped at 50 battles)
  ));

  // Simulate trading style based on battle outcomes
  // In a real implementation, this would analyze position data
  const history = battleHistoryDb.getBattleHistory(wallet, 20);
  const avgPnl = history.reduce((sum, b) => sum + b.myPnlPercent, 0) / (history.length || 1);

  // Higher avg PnL suggests higher leverage usage
  const estimatedLeverage = Math.max(2, Math.min(20, 5 + Math.abs(avgPnl) / 5));

  // Win ratio affects long/short preference estimation
  // Winners tend to be more directionally confident
  const longShortRatio = stats.winRate > 50
    ? 1 + ((stats.winRate - 50) / 100)  // Above 50% win rate = slight long bias
    : 1 - ((50 - stats.winRate) / 200); // Below 50% = slight short bias

  return {
    totalPositions: stats.totalBattles * 3,  // Estimate ~3 positions per battle
    avgLeverage: Math.round(estimatedLeverage * 10) / 10,
    aggressionScore,
    longShortRatio: Math.round(longShortRatio * 100) / 100,
  };
}

// ===================
// Favorite Assets
// ===================

/**
 * Get favorite assets for a wallet.
 * Returns top 3 assets (defaults to SOL/ETH/BTC for new fighters).
 */
export function getFavoriteAssets(wallet: string): FavoriteAsset[] {
  const stats = battleHistoryDb.getPlayerStats(wallet);

  if (stats.totalBattles === 0) {
    return DEFAULT_FAVORITE_ASSETS;
  }

  // In a real implementation, this would analyze position data per asset
  // For now, return default favorites with simulated stats
  const winRate = stats.winRate;

  return [
    { asset: 'SOL', count: Math.round(stats.totalBattles * 0.5), winRate: Math.round(winRate) },
    { asset: 'ETH', count: Math.round(stats.totalBattles * 0.3), winRate: Math.round(winRate * 0.9) },
    { asset: 'BTC', count: Math.round(stats.totalBattles * 0.2), winRate: Math.round(winRate * 1.1) },
  ];
}

// ===================
// Recent Form
// ===================

/**
 * Get recent battle results for a wallet.
 */
export function getRecentForm(wallet: string, limit: number = 5): RecentFormResult[] {
  const history = battleHistoryDb.getBattleHistory(wallet, limit);

  return history.map(battle => ({
    battleId: battle.battleId,
    result: battle.result,
    pnlPercent: battle.myPnlPercent,
    opponentWallet: battle.opponentWallet,
    endedAt: battle.endedAt,
  }));
}

// ===================
// Fighter Comparison
// ===================

/**
 * Get comparison data for two fighters.
 */
export async function getComparison(wallet1: string, wallet2: string): Promise<FighterComparison> {
  // Get both fighter profiles in parallel
  const [profile1, profile2] = await Promise.all([
    getFighterProfile(wallet1),
    getFighterProfile(wallet2),
  ]);

  // Calculate head-to-head record
  const headToHead = getHeadToHeadRecord(wallet1, wallet2);

  return {
    fighter1: profile1,
    fighter2: profile2,
    headToHead,
  };
}

/**
 * Get complete fighter profile.
 */
async function getFighterProfile(wallet: string): Promise<FighterProfile> {
  const [eloData, stats, streaks, roi, tradingStyle, favoriteAssets] = await Promise.all([
    eloDb.getEloData(wallet),
    Promise.resolve(battleHistoryDb.getPlayerStats(wallet)),
    Promise.resolve(battleHistoryDb.getBattleStreaks(wallet)),
    Promise.resolve(battleHistoryDb.getBattleROI(wallet)),
    getTradingStyle(wallet),
    Promise.resolve(getFavoriteAssets(wallet)),
  ]);

  const elo = eloData?.elo ?? 1200;
  const battleCount = eloData?.battleCount ?? 0;
  const tier = getDisplayTier(elo, battleCount);

  return {
    wallet,
    elo,
    tier,
    battleCount: stats.totalBattles,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.winRate,
    tradingStyle,
    favoriteAssets,
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    roi: roi.roi,
  };
}

/**
 * Calculate head-to-head record between two fighters.
 */
function getHeadToHeadRecord(wallet1: string, wallet2: string): {
  fighter1Wins: number;
  fighter2Wins: number;
  ties: number;
} {
  // Get all battles for wallet1, then filter for matches against wallet2
  const history1 = battleHistoryDb.getBattleHistory(wallet1, 100);

  let fighter1Wins = 0;
  let fighter2Wins = 0;
  let ties = 0;

  for (const battle of history1) {
    if (battle.opponentWallet === wallet2) {
      if (battle.result === 'win') {
        fighter1Wins++;
      } else if (battle.result === 'loss') {
        fighter2Wins++;
      } else {
        ties++;
      }
    }
  }

  return { fighter1Wins, fighter2Wins, ties };
}

console.log('[FighterStatsService] Fighter stats service loaded');
