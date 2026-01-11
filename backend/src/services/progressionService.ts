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
import {
  UserProgression,
  XpHistoryEntry,
  LevelUpResult,
  XpGainEvent,
  ProgressionPerkType,
} from '../types';

// ===================
// Level Configuration
// ===================

// XP thresholds for each level (index = level - 1)
const LEVEL_THRESHOLDS: number[] = [
  0,       // Level 1
  100,     // Level 2
  200,     // Level 3
  300,     // Level 4
  400,     // Level 5
  500,     // Level 6
  650,     // Level 7
  850,     // Level 8
  1100,    // Level 9
  2000,    // Level 10 - Contender
  2500,    // Level 11
  3000,    // Level 12
  3500,    // Level 13
  4000,    // Level 14
  5000,    // Level 15 - First perk
  6000,    // Level 16
  7000,    // Level 17
  8000,    // Level 18
  9000,    // Level 19
  10000,   // Level 20 - Warrior
  12000,   // Level 21
  14000,   // Level 22
  16000,   // Level 23
  18000,   // Level 24
  20000,   // Level 25 - Silver border + perk
  23000,   // Level 26
  26000,   // Level 27
  29000,   // Level 28
  32000,   // Level 29
  35000,   // Level 30
  38000,   // Level 31
  42000,   // Level 32
  46000,   // Level 33
  50000,   // Level 34
  55000,   // Level 35 - Veteran
  60000,   // Level 36
  66000,   // Level 37
  72000,   // Level 38
  78000,   // Level 39
  85000,   // Level 40 - 8% rake perk
  92000,   // Level 41
  100000,  // Level 42
  108000,  // Level 43
  117000,  // Level 44
  126000,  // Level 45
  136000,  // Level 46
  146000,  // Level 47
  157000,  // Level 48
  168000,  // Level 49
  150000,  // Level 50 - Champion + gold border + perk
  165000,  // Level 51 - Legend
  180000,  // Level 52
  196000,  // Level 53
  213000,  // Level 54
  231000,  // Level 55
  250000,  // Level 56
  270000,  // Level 57
  291000,  // Level 58
  313000,  // Level 59
  336000,  // Level 60
  360000,  // Level 61
  385000,  // Level 62
  411000,  // Level 63
  438000,  // Level 64
  466000,  // Level 65
  495000,  // Level 66
  525000,  // Level 67
  556000,  // Level 68
  588000,  // Level 69
  621000,  // Level 70
  655000,  // Level 71
  690000,  // Level 72
  726000,  // Level 73
  763000,  // Level 74
  500000,  // Level 75 - 7% rake perk + platinum border
  540000,  // Level 76 - Mythic
  582000,  // Level 77
  626000,  // Level 78
  672000,  // Level 79
  720000,  // Level 80
  770000,  // Level 81
  822000,  // Level 82
  876000,  // Level 83
  932000,  // Level 84
  990000,  // Level 85
  1050000, // Level 86
  1112000, // Level 87
  1176000, // Level 88
  1242000, // Level 89
  1310000, // Level 90
  1380000, // Level 91
  1452000, // Level 92
  1526000, // Level 93
  1602000, // Level 94
  1680000, // Level 95
  1760000, // Level 96
  1842000, // Level 97
  1926000, // Level 98
  2012000, // Level 99
  1500000, // Level 100 - Permanent 7% rake + mythic border
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
    const streak = recordActivity(walletAddress);
    const streakBonus = getStreakBonusMultiplier(streak.currentStreak);

    // Apply streak bonus to XP
    const bonusXp = Math.floor(amount * streakBonus);
    const totalXpGained = amount + bonusXp;

    // Get or create progression
    const progression = getOrCreateProgression(walletAddress);
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
    updateUserProgression(walletAddress, newTotalXp, newLevel);
    addXpHistoryEntry(walletAddress, totalXpGained, source, sourceId, finalDescription);

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
            const createdPerk = createPerk(walletAddress, perk.type, level);
            unlockedPerks.push(createdPerk);
          }
        }

        // Grant cosmetics
        if (rewards.cosmetics) {
          for (const cosmetic of rewards.cosmetics) {
            const createdCosmetic = createCosmetic(
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
          addFreeBetCredit(
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

  getProgression(walletAddress: string): UserProgression {
    const data = getOrCreateProgression(walletAddress);
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

  getXpHistory(walletAddress: string, limit: number = 50): XpHistoryEntry[] {
    return getXpHistoryDb(walletAddress, limit).map(entry => ({
      ...entry,
      source: entry.source as XpSource,
    }));
  }

  getXpHistoryPage(walletAddress: string, limit: number, offset: number): XpHistoryEntry[] {
    return getXpHistoryPaginated(walletAddress, limit, offset).map(entry => ({
      ...entry,
      source: entry.source as XpSource,
    }));
  }

  // ===================
  // Perks
  // ===================

  getAvailablePerks(walletAddress: string): UserPerk[] {
    return getAvailablePerksDb(walletAddress).map(perk => ({
      ...perk,
      perkType: perk.perkType as ProgressionPerkType,
    }));
  }

  activatePerk(walletAddress: string, perkId: number): UserPerk | null {
    const perk = getPerk(perkId);
    if (!perk || perk.walletAddress !== walletAddress || perk.isUsed) {
      return null;
    }

    // Check for level 100 permanent perk
    const isPermanent = perk.unlockLevel === 100;
    const duration = isPermanent ? null : PERK_DURATION_MS;

    const activatedPerk = activatePerkDb(perkId, duration);
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
  getActiveRakeReduction(walletAddress: string): number {
    const activePerk = getActivePerk(walletAddress);
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
  getActiveOracleRakeReduction(walletAddress: string): number {
    const activePerk = getActivePerk(walletAddress);
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

  getUnlockedCosmetics(walletAddress: string): UserCosmetic[] {
    return getCosmeticsForWallet(walletAddress).map(cosmetic => ({
      ...cosmetic,
      cosmeticType: cosmetic.cosmeticType as CosmeticType,
    }));
  }

  // ===================
  // Free Bets
  // ===================

  getFreeBetBalance(walletAddress: string): FreeBetBalance {
    return getOrCreateFreeBetBalance(walletAddress);
  }

  addFreeBetCredit(walletAddress: string, count: number, description?: string): FreeBetBalance {
    const balance = addFreeBetCredit(walletAddress, count, description);
    this.notifyListeners('free_bet_earned', {
      walletAddress,
      count,
      description,
      newBalance: balance.balance,
    });
    return balance;
  }

  useFreeBetCredit(
    walletAddress: string,
    gameMode: GameMode,
    description?: string
  ): { success: boolean; balance: FreeBetBalance } {
    const result = useFreeBetCredit(walletAddress, gameMode, description);
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

  getFreeBetTransactionHistory(walletAddress: string, limit: number = 50): FreeBetTransaction[] {
    return getFreeBetHistory(walletAddress, limit);
  }

  // ===================
  // Streaks
  // ===================

  getStreak(walletAddress: string): UserStreak {
    return getOrCreateStreak(walletAddress);
  }

  getStreakBonus(streak: number): number {
    return getStreakBonusMultiplier(streak);
  }

  isStreakAtRisk(walletAddress: string): boolean {
    return isStreakAtRisk(walletAddress);
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
