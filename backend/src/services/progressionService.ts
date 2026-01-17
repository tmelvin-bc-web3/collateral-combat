import {
  getOrCreateProgression,
  updateUserProgression,
  addXpHistoryEntry,
  getXpHistory as getXpHistoryDb,
  getXpHistoryPaginated,
  createPerk,
  getAvailablePerks as getAvailablePerksDb,
  getActivePerk,
  activatePerk as activatePerkDb,
  getPerk,
  createCosmetic,
  getCosmeticsForWallet,
  getOrCreateFreeBetBalance,
  addFreeBetCredit,
  useFreeBetCredit,
  getFreeBetHistory,
  getOrCreateStreak,
  recordActivity,
  getStreakBonusMultiplier,
  isStreakAtRisk,
  XpSource,
  PerkType,
  CosmeticType,
  GameMode,
  UserPerk,
  UserCosmetic,
  FreeBetBalance,
  FreeBetTransaction,
  UserStreak,
} from '../db/progressionDatabase';
import * as userStatsDb from '../db/userStatsDatabase';
import {
  UserProgression,
  XpHistoryEntry,
  LevelUpResult,
  XpGainEvent,
  ProgressionPerkType,
} from '../types';

// ===================
// Leaderboard Types
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
// Level Configuration
// ===================

// XP thresholds for each level (index = level - 1)
// Balanced to ensure profitability before perks unlock
// ~25 XP per bet average, 0.005 SOL rake per 0.1 SOL bet
// Level 5: First free bet unlocks AFTER we've collected enough rake to cover it
// Level 15 perks: ~200 bets = ~1 SOL rake paid
// Level 40 perks: ~4,000 bets = ~20 SOL rake paid
// Level 75 perks: ~24,000 bets = ~120 SOL rake paid
// Level 100 perks: ~60,000 bets = ~300 SOL rake paid
const LEVEL_THRESHOLDS: number[] = [
  0,       // Level 1
  75,      // Level 2 (~3 bets)
  175,     // Level 3 (~7 bets)
  350,     // Level 4 (~14 bets)
  625,     // Level 5 - 1 free bet (~25 bets = 0.125 SOL rake, 25% profit margin)
  900,     // Level 6
  1150,    // Level 7
  1400,    // Level 8
  1600,    // Level 9
  1850,    // Level 10 - Contender + border (~74 bets, ~0.37 SOL rake)
  2000,    // Level 11
  2500,    // Level 12
  3100,    // Level 13
  3800,    // Level 14
  4600,    // Level 15 - First perks: 4.5%/9% (~184 bets, ~0.92 SOL rake)
  5500,    // Level 16
  6500,    // Level 17
  7600,    // Level 18
  8800,    // Level 19
  10000,   // Level 20 - Warrior + free bets (~400 bets, ~2 SOL rake)
  11500,   // Level 21
  13200,   // Level 22
  15100,   // Level 23
  17200,   // Level 24
  19500,   // Level 25 - Silver + perks (~780 bets, ~3.9 SOL rake)
  22000,   // Level 26
  24800,   // Level 27
  27900,   // Level 28
  31300,   // Level 29
  35000,   // Level 30
  39000,   // Level 31
  43500,   // Level 32
  48500,   // Level 33
  54000,   // Level 34
  60000,   // Level 35 - Veteran + free bets (~2,400 bets, ~12 SOL rake)
  67000,   // Level 36
  75000,   // Level 37
  84000,   // Level 38
  94000,   // Level 39
  105000,  // Level 40 - 8%/4% perks (~4,200 bets, ~21 SOL rake)
  117000,  // Level 41
  130000,  // Level 42
  145000,  // Level 43
  162000,  // Level 44
  180000,  // Level 45
  200000,  // Level 46
  222000,  // Level 47
  246000,  // Level 48
  272000,  // Level 49
  300000,  // Level 50 - Champion + gold + perks (~12,000 bets, ~60 SOL rake)
  330000,  // Level 51 - Legend
  363000,  // Level 52
  399000,  // Level 53
  438000,  // Level 54
  480000,  // Level 55
  525000,  // Level 56
  573000,  // Level 57
  624000,  // Level 58
  678000,  // Level 59
  735000,  // Level 60
  795000,  // Level 61
  858000,  // Level 62
  924000,  // Level 63
  993000,  // Level 64
  1065000, // Level 65
  1140000, // Level 66
  1218000, // Level 67
  1299000, // Level 68
  1383000, // Level 69
  1470000, // Level 70
  1560000, // Level 71
  1653000, // Level 72
  1749000, // Level 73
  1848000, // Level 74
  1950000, // Level 75 - 7%/3.5% perks + platinum (~78,000 bets, ~390 SOL rake)
  2055000, // Level 76 - Mythic
  2163000, // Level 77
  2274000, // Level 78
  2388000, // Level 79
  2505000, // Level 80
  2625000, // Level 81
  2748000, // Level 82
  2874000, // Level 83
  3003000, // Level 84
  3135000, // Level 85
  3270000, // Level 86
  3408000, // Level 87
  3549000, // Level 88
  3693000, // Level 89
  3840000, // Level 90
  3990000, // Level 91
  4143000, // Level 92
  4299000, // Level 93
  4458000, // Level 94
  4620000, // Level 95
  4785000, // Level 96
  4953000, // Level 97
  5124000, // Level 98
  5298000, // Level 99
  5475000, // Level 100 - PERMANENT 7%/3.5% perks + mythic (~219,000 bets, ~1,095 SOL rake)
];

// Title configuration
const TITLES: { minLevel: number; maxLevel: number; title: string }[] = [
  { minLevel: 1, maxLevel: 5, title: 'Rookie' },
  { minLevel: 6, maxLevel: 10, title: 'Contender' },
  { minLevel: 11, maxLevel: 20, title: 'Warrior' },
  { minLevel: 21, maxLevel: 35, title: 'Veteran' },
  { minLevel: 36, maxLevel: 50, title: 'Champion' },
  { minLevel: 51, maxLevel: 75, title: 'Legend' },
  { minLevel: 76, maxLevel: 100, title: 'Mythic' },
];

// Level rewards configuration
interface LevelReward {
  perks?: { type: PerkType; permanent?: boolean }[];
  cosmetics?: { type: CosmeticType; id: string }[];
  freeBets?: number;
}

const LEVEL_REWARDS: Record<number, LevelReward> = {
  // Level 5: First free bet
  5: { freeBets: 1 },
  // Level 10: Bronze border + free bets
  10: { cosmetics: [{ type: 'border', id: 'bronze' }], freeBets: 2 },
  // Level 15: Draft 9% rake + Oracle 4.5% rake
  15: { perks: [{ type: 'rake_9' }, { type: 'oracle_4_5' }] },
  // Level 20: Free bets
  20: { freeBets: 3 },
  // Level 25: Draft 9% rake + Oracle 4.5% rake + Silver border
  25: { perks: [{ type: 'rake_9' }, { type: 'oracle_4_5' }], cosmetics: [{ type: 'border', id: 'silver' }] },
  // Level 35: Free bets
  35: { freeBets: 3 },
  // Level 40: Draft 8% rake + Oracle 4% rake
  40: { perks: [{ type: 'rake_8' }, { type: 'oracle_4' }] },
  // Level 50: Draft 8% rake + Oracle 4% rake + Gold border + free bets
  50: { perks: [{ type: 'rake_8' }, { type: 'oracle_4' }], cosmetics: [{ type: 'border', id: 'gold' }], freeBets: 5 },
  // Level 75: Draft 7% rake + Oracle 3.5% rake + Platinum border + free bets
  75: { perks: [{ type: 'rake_7' }, { type: 'oracle_3_5' }], cosmetics: [{ type: 'border', id: 'platinum' }], freeBets: 5 },
  // Level 100: Permanent perks + Mythic border + free bets
  100: { perks: [{ type: 'rake_7', permanent: true }, { type: 'oracle_3_5', permanent: true }], cosmetics: [{ type: 'border', id: 'mythic' }], freeBets: 10 },
};

// Perk duration: 1 week in milliseconds
const PERK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Rake percentages for each perk type
// Draft perks (10% baseline): rake_9, rake_8, rake_7
// Oracle perks (5% baseline): oracle_4_5, oracle_4, oracle_3_5
const RAKE_PERCENTAGES: Record<PerkType, number> = {
  // Draft perks (for 10% baseline games)
  rake_9: 9,
  rake_8: 8,
  rake_7: 7,
  // Oracle perks (for 5% baseline games)
  oracle_4_5: 4.5,
  oracle_4: 4,
  oracle_3_5: 3.5,
};

// ===================
// Progression Service
// ===================

type ProgressionListener = (event: string, data: any) => void;

class ProgressionService {
  private listeners: Set<ProgressionListener> = new Set();

  // ===================
  // Level Calculations
  // ===================

  calculateLevel(totalXp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  getXpForLevel(level: number): number {
    if (level < 1) return 0;
    if (level > LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    return LEVEL_THRESHOLDS[level - 1];
  }

  getXpToNextLevel(totalXp: number, currentLevel: number): number {
    if (currentLevel >= 100) return 0;
    const nextLevelXp = this.getXpForLevel(currentLevel + 1);
    return Math.max(0, nextLevelXp - totalXp);
  }

  getXpProgress(totalXp: number, currentLevel: number): number {
    if (currentLevel >= 100) return 100;
    const currentLevelXp = this.getXpForLevel(currentLevel);
    const nextLevelXp = this.getXpForLevel(currentLevel + 1);
    const xpInLevel = totalXp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    return Math.min(100, Math.floor((xpInLevel / xpNeeded) * 100));
  }

  getTitleForLevel(level: number): string {
    for (const tier of TITLES) {
      if (level >= tier.minLevel && level <= tier.maxLevel) {
        return tier.title;
      }
    }
    return 'Rookie';
  }

  // ===================
  // XP Awards
  // ===================

  async awardXp(
    walletAddress: string,
    amount: number,
    source: XpSource,
    sourceId: string,
    description: string
  ): Promise<XpGainEvent> {
    // Record activity for streak tracking
    const streak = await recordActivity(walletAddress);
    const streakBonus = getStreakBonusMultiplier(streak.currentStreak);

    // Apply streak bonus to XP
    const bonusXp = Math.floor(amount * streakBonus);
    const totalXpGained = amount + bonusXp;

    // Get or create progression
    const progression = await getOrCreateProgression(walletAddress);
    const previousLevel = progression.currentLevel;
    const previousXp = progression.totalXp;

    // Calculate new XP and level
    const newTotalXp = previousXp + totalXpGained;
    const newLevel = this.calculateLevel(newTotalXp);

    // Create description with streak info
    const finalDescription = streakBonus > 0
      ? `${description} (+${Math.round(streakBonus * 100)}% streak bonus)`
      : description;

    // Update database
    await updateUserProgression(walletAddress, newTotalXp, newLevel);
    await addXpHistoryEntry(walletAddress, totalXpGained, source, sourceId, finalDescription);

    // Check for level up and process rewards
    let levelUpResult: LevelUpResult | undefined;
    if (newLevel > previousLevel) {
      levelUpResult = await this.processLevelUp(walletAddress, previousLevel, newLevel);
    }

    // Create event
    const event: XpGainEvent = {
      walletAddress,
      amount: totalXpGained,
      baseAmount: amount,
      streakBonus: bonusXp,
      streakDays: streak.currentStreak,
      source,
      sourceId,
      description: finalDescription,
      newTotalXp,
      levelUp: levelUpResult,
    };

    // Notify listeners
    this.notifyListeners('xp_gained', event);
    if (levelUpResult) {
      this.notifyListeners('level_up', { ...levelUpResult, walletAddress });
    }

    return event;
  }

  private async processLevelUp(
    walletAddress: string,
    previousLevel: number,
    newLevel: number
  ): Promise<LevelUpResult> {
    const unlockedPerks: UserPerk[] = [];
    const unlockedCosmetics: UserCosmetic[] = [];
    let newTitle: string | null = null;
    let freeBetEarned: number = 0;

    // Check each level for rewards
    for (let level = previousLevel + 1; level <= newLevel; level++) {
      const rewards = LEVEL_REWARDS[level];
      if (rewards) {
        // Grant perks
        if (rewards.perks) {
          for (const perk of rewards.perks) {
            const createdPerk = await createPerk(walletAddress, perk.type, level);
            unlockedPerks.push(createdPerk);
          }
        }

        // Grant cosmetics
        if (rewards.cosmetics) {
          for (const cosmetic of rewards.cosmetics) {
            const createdCosmetic = await createCosmetic(
              walletAddress,
              cosmetic.type,
              cosmetic.id,
              level
            );
            if (createdCosmetic) {
              unlockedCosmetics.push(createdCosmetic);
            }
          }
        }

        // Grant free bets
        if (rewards.freeBets) {
          await addFreeBetCredit(
            walletAddress,
            rewards.freeBets,
            `Level ${level} milestone reward`
          );
          freeBetEarned += rewards.freeBets;
        }
      }

      // Check for title change
      const oldTitle = this.getTitleForLevel(level - 1);
      const currentTitle = this.getTitleForLevel(level);
      if (currentTitle !== oldTitle) {
        newTitle = currentTitle;
      }
    }

    return {
      previousLevel,
      newLevel,
      unlockedPerks,
      unlockedCosmetics,
      newTitle,
      freeBetsEarned: freeBetEarned > 0 ? freeBetEarned : undefined,
    };
  }

  // ===================
  // Progression Data
  // ===================

  async getProgression(walletAddress: string): Promise<UserProgression> {
    const data = await getOrCreateProgression(walletAddress);
    const xpToNextLevel = this.getXpToNextLevel(data.totalXp, data.currentLevel);
    const xpProgress = this.getXpProgress(data.totalXp, data.currentLevel);
    const title = this.getTitleForLevel(data.currentLevel);

    return {
      walletAddress: data.walletAddress,
      totalXp: data.totalXp,
      currentLevel: data.currentLevel,
      xpToNextLevel,
      xpProgress,
      title,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getXpHistory(walletAddress: string, limit: number = 50): Promise<XpHistoryEntry[]> {
    const entries = await getXpHistoryDb(walletAddress, limit);
    return entries.map(entry => ({
      ...entry,
      source: entry.source as XpSource,
    }));
  }

  async getXpHistoryPage(walletAddress: string, limit: number, offset: number): Promise<XpHistoryEntry[]> {
    const entries = await getXpHistoryPaginated(walletAddress, limit, offset);
    return entries.map(entry => ({
      ...entry,
      source: entry.source as XpSource,
    }));
  }

  // ===================
  // Perks
  // ===================

  async getAvailablePerks(walletAddress: string): Promise<UserPerk[]> {
    const perks = await getAvailablePerksDb(walletAddress);
    return perks.map(perk => ({
      ...perk,
      perkType: perk.perkType as ProgressionPerkType,
    }));
  }

  async activatePerk(walletAddress: string, perkId: number): Promise<UserPerk | null> {
    const perk = await getPerk(perkId);
    if (!perk || perk.walletAddress !== walletAddress || perk.isUsed) {
      return null;
    }

    // Check for level 100 permanent perk
    const isPermanent = perk.unlockLevel === 100;
    const duration = isPermanent ? null : PERK_DURATION_MS;

    const activatedPerk = await activatePerkDb(perkId, duration);
    if (activatedPerk) {
      this.notifyListeners('perk_activated', {
        ...activatedPerk,
        perkType: activatedPerk.perkType as ProgressionPerkType,
      });
    }

    return activatedPerk ? {
      ...activatedPerk,
      perkType: activatedPerk.perkType as ProgressionPerkType,
    } : null;
  }

  // Get active rake reduction for Draft (10% baseline)
  async getActiveRakeReduction(walletAddress: string): Promise<number> {
    const activePerk = await getActivePerk(walletAddress);
    if (!activePerk) {
      return 10; // Default 10% rake for Draft
    }
    // Only return Draft perks (rake_9, rake_8, rake_7)
    if (activePerk.perkType.startsWith('rake_')) {
      return RAKE_PERCENTAGES[activePerk.perkType] || 10;
    }
    return 10;
  }

  // Get active rake reduction for Oracle (5% baseline)
  async getActiveOracleRakeReduction(walletAddress: string): Promise<number> {
    const activePerk = await getActivePerk(walletAddress);
    if (!activePerk) {
      return 5; // Default 5% rake for Oracle
    }
    // Only return Oracle perks (oracle_4_5, oracle_4, oracle_3_5)
    if (activePerk.perkType.startsWith('oracle_')) {
      return RAKE_PERCENTAGES[activePerk.perkType] || 5;
    }
    return 5;
  }

  // ===================
  // Cosmetics
  // ===================

  async getUnlockedCosmetics(walletAddress: string): Promise<UserCosmetic[]> {
    const cosmetics = await getCosmeticsForWallet(walletAddress);
    return cosmetics.map(cosmetic => ({
      ...cosmetic,
      cosmeticType: cosmetic.cosmeticType as CosmeticType,
    }));
  }

  // ===================
  // Free Bets
  // ===================

  async getFreeBetBalance(walletAddress: string): Promise<FreeBetBalance> {
    return getOrCreateFreeBetBalance(walletAddress);
  }

  async addFreeBetCredit(walletAddress: string, count: number, description?: string): Promise<FreeBetBalance> {
    const balance = await addFreeBetCredit(walletAddress, count, description);
    this.notifyListeners('free_bet_earned', {
      walletAddress,
      count,
      description,
      newBalance: balance.balance,
    });
    return balance;
  }

  async useFreeBetCredit(
    walletAddress: string,
    gameMode: GameMode,
    description?: string
  ): Promise<{ success: boolean; balance: FreeBetBalance }> {
    const result = await useFreeBetCredit(walletAddress, gameMode, description);
    if (result.success) {
      this.notifyListeners('free_bet_used', {
        walletAddress,
        gameMode,
        description,
        newBalance: result.balance.balance,
      });
    }
    return result;
  }

  async getFreeBetTransactionHistory(walletAddress: string, limit: number = 50): Promise<FreeBetTransaction[]> {
    return getFreeBetHistory(walletAddress, limit);
  }

  // ===================
  // Streaks
  // ===================

  async getStreak(walletAddress: string): Promise<UserStreak> {
    return getOrCreateStreak(walletAddress);
  }

  getStreakBonus(streak: number): number {
    return getStreakBonusMultiplier(streak);
  }

  async isStreakAtRisk(walletAddress: string): Promise<boolean> {
    return isStreakAtRisk(walletAddress);
  }

  // ===================
  // Leaderboard
  // ===================

  getLeaderboard(
    period: 'weekly' | 'monthly' | 'all' = 'all',
    metric: 'profit' | 'winRate' | 'volume' = 'profit',
    limit: number = 50
  ): LeaderboardEntry[] {
    // Get base leaderboard from userStats
    const stats = userStatsDb.getStatsLeaderboard(metric, limit);

    // Map to leaderboard entries with rank
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

  // ===================
  // Event Subscription
  // ===================

  subscribe(listener: ProgressionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('Error in progression listener:', err);
      }
    });
  }
}

// Export singleton instance
export const progressionService = new ProgressionService();
