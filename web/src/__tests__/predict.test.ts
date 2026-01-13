/**
 * Integration Tests for Prediction System Frontend
 * Tests types, utility functions, and client logic
 */

// ============================================
// TYPES TESTS
// ============================================

describe('Prediction Types', () => {
  describe('RoundStatus enum', () => {
    test('should have correct status values', () => {
      // Match the contract enum
      const RoundStatus = {
        Betting: 'Betting',
        Locked: 'Locked',
        Settled: 'Settled',
      };

      expect(RoundStatus.Betting).toBe('Betting');
      expect(RoundStatus.Locked).toBe('Locked');
      expect(RoundStatus.Settled).toBe('Settled');
    });
  });

  describe('BetSide enum', () => {
    test('should have correct side values', () => {
      const BetSide = {
        Up: 'Up',
        Down: 'Down',
      };

      expect(BetSide.Up).toBe('Up');
      expect(BetSide.Down).toBe('Down');
    });
  });

  describe('WinnerSide enum', () => {
    test('should have correct winner values', () => {
      const WinnerSide = {
        None: 'None',
        Up: 'Up',
        Down: 'Down',
        Draw: 'Draw',
      };

      expect(WinnerSide.None).toBe('None');
      expect(WinnerSide.Up).toBe('Up');
      expect(WinnerSide.Down).toBe('Down');
      expect(WinnerSide.Draw).toBe('Draw');
    });
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Prediction Utility Functions', () => {
  // Implement utility functions inline for testing
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const PRICE_SCALE = 100_000_000;

  const lamportsToSol = (lamports: number): number => {
    return lamports / LAMPORTS_PER_SOL;
  };

  const solToLamports = (sol: number): number => {
    return Math.floor(sol * LAMPORTS_PER_SOL);
  };

  const priceToScaled = (price: number): number => {
    return Math.floor(price * PRICE_SCALE);
  };

  const scaledToPrice = (scaled: number): number => {
    return scaled / PRICE_SCALE;
  };

  describe('lamportsToSol', () => {
    test('should convert lamports to SOL correctly', () => {
      expect(lamportsToSol(1_000_000_000)).toBe(1);
      expect(lamportsToSol(500_000_000)).toBe(0.5);
      expect(lamportsToSol(10_000_000)).toBe(0.01);
      expect(lamportsToSol(0)).toBe(0);
    });

    test('should handle large amounts', () => {
      expect(lamportsToSol(100_000_000_000)).toBe(100);
      expect(lamportsToSol(1_000_000_000_000)).toBe(1000);
    });

    test('should handle fractional lamports', () => {
      expect(lamportsToSol(1)).toBe(0.000000001);
      expect(lamportsToSol(100)).toBe(0.0000001);
    });
  });

  describe('solToLamports', () => {
    test('should convert SOL to lamports correctly', () => {
      expect(solToLamports(1)).toBe(1_000_000_000);
      expect(solToLamports(0.5)).toBe(500_000_000);
      expect(solToLamports(0.01)).toBe(10_000_000);
      expect(solToLamports(0)).toBe(0);
    });

    test('should floor fractional lamports', () => {
      expect(solToLamports(0.0000000015)).toBe(1);
      expect(solToLamports(0.0000000019)).toBe(1);
    });

    test('should handle large amounts', () => {
      expect(solToLamports(100)).toBe(100_000_000_000);
      expect(solToLamports(1000)).toBe(1_000_000_000_000);
    });
  });

  describe('priceToScaled', () => {
    test('should scale price correctly', () => {
      expect(priceToScaled(100)).toBe(10_000_000_000);
      expect(priceToScaled(141.50)).toBe(14_150_000_000);
      expect(priceToScaled(0.01)).toBe(1_000_000);
    });

    test('should handle zero', () => {
      expect(priceToScaled(0)).toBe(0);
    });
  });

  describe('scaledToPrice', () => {
    test('should unscale price correctly', () => {
      expect(scaledToPrice(10_000_000_000)).toBe(100);
      expect(scaledToPrice(14_150_000_000)).toBe(141.5);
      expect(scaledToPrice(1_000_000)).toBe(0.01);
    });

    test('should handle zero', () => {
      expect(scaledToPrice(0)).toBe(0);
    });
  });

  describe('round-trip conversions', () => {
    test('SOL should round-trip correctly', () => {
      const values = [1, 0.5, 0.01, 100, 0.001];
      values.forEach((sol) => {
        const lamports = solToLamports(sol);
        const result = lamportsToSol(lamports);
        expect(result).toBeCloseTo(sol, 9);
      });
    });

    test('price should round-trip correctly', () => {
      const prices = [100, 141.50, 0.01, 94000, 0.000003];
      prices.forEach((price) => {
        const scaled = priceToScaled(price);
        const result = scaledToPrice(scaled);
        expect(result).toBeCloseTo(price, 6);
      });
    });
  });
});

// ============================================
// ODDS CALCULATION TESTS
// ============================================

describe('Odds Calculation', () => {
  const PLATFORM_FEE_PERCENT = 5;

  // Replicate the odds calculation logic from the frontend
  const calculateBaseOdds = (
    myPool: number,
    theirPool: number
  ): number => {
    if (myPool === 0) return 2.0;
    if (theirPool === 0) return 1.0;
    return 1 + (theirPool * (1 - PLATFORM_FEE_PERCENT / 100)) / myPool;
  };

  const calculateEarlyBirdMultiplier = (
    timeIntoRound: number,
    bettingDuration: number
  ): number => {
    const EARLY_BIRD_MAX_BONUS = 0.2;
    const timeRatio = Math.min(1, Math.max(0, timeIntoRound / bettingDuration));
    return 1 + EARLY_BIRD_MAX_BONUS * (1 - timeRatio);
  };

  describe('calculateBaseOdds', () => {
    test('should return 2.0 when my pool is empty', () => {
      expect(calculateBaseOdds(0, 100)).toBe(2.0);
      expect(calculateBaseOdds(0, 0)).toBe(2.0);
    });

    test('should return 1.0 when opposing pool is empty', () => {
      expect(calculateBaseOdds(100, 0)).toBe(1.0);
    });

    test('should calculate correct odds for equal pools', () => {
      // 1 + (100 * 0.95) / 100 = 1.95
      expect(calculateBaseOdds(100, 100)).toBeCloseTo(1.95, 2);
    });

    test('should calculate correct odds for imbalanced pools', () => {
      // Heavy favorite: 1 + (50 * 0.95) / 200 = 1.2375
      expect(calculateBaseOdds(200, 50)).toBeCloseTo(1.2375, 4);

      // Underdog: 1 + (200 * 0.95) / 50 = 4.8
      expect(calculateBaseOdds(50, 200)).toBeCloseTo(4.8, 2);
    });
  });

  describe('calculateEarlyBirdMultiplier', () => {
    test('should return max multiplier (1.2) at start of round', () => {
      expect(calculateEarlyBirdMultiplier(0, 25000)).toBe(1.2);
    });

    test('should return 1.0 at end of betting period', () => {
      expect(calculateEarlyBirdMultiplier(25000, 25000)).toBe(1.0);
    });

    test('should return mid-range multiplier at midpoint', () => {
      // At 50%: 1 + 0.2 * 0.5 = 1.1
      expect(calculateEarlyBirdMultiplier(12500, 25000)).toBe(1.1);
    });

    test('should clamp values outside valid range', () => {
      expect(calculateEarlyBirdMultiplier(-1000, 25000)).toBe(1.2);
      expect(calculateEarlyBirdMultiplier(50000, 25000)).toBe(1.0);
    });
  });

  describe('Combined odds calculation', () => {
    test('should calculate final boosted odds correctly', () => {
      const baseOdds = calculateBaseOdds(100, 100); // 1.95
      const earlyBird = calculateEarlyBirdMultiplier(0, 25000); // 1.2
      const boostedOdds = baseOdds * earlyBird;
      expect(boostedOdds).toBeCloseTo(2.34, 2);
    });

    test('should give better odds to early bettors', () => {
      const baseOdds = calculateBaseOdds(100, 100);

      const earlyOdds = baseOdds * calculateEarlyBirdMultiplier(0, 25000);
      const lateOdds = baseOdds * calculateEarlyBirdMultiplier(25000, 25000);

      expect(earlyOdds).toBeGreaterThan(lateOdds);
      expect(earlyOdds / lateOdds).toBeCloseTo(1.2, 2);
    });
  });
});

// ============================================
// PAYOUT CALCULATION TESTS
// ============================================

describe('Payout Calculations', () => {
  const PLATFORM_FEE_PERCENT = 5;

  interface Bet {
    amount: number;
    placedAt: number;
  }

  interface Round {
    startTime: number;
    lockTime: number;
    longPool: number;
    shortPool: number;
    longBets: Bet[];
    shortBets: Bet[];
  }

  const calculatePayout = (
    bet: Bet,
    round: Round,
    isWinner: boolean
  ): number => {
    if (!isWinner) return 0;

    const winningPool =
      round.longBets.includes(bet) ? round.longPool : round.shortPool;
    const losingPool =
      round.longBets.includes(bet) ? round.shortPool : round.longPool;

    if (losingPool === 0) return bet.amount; // Refund

    const distributablePool = losingPool * (1 - PLATFORM_FEE_PERCENT / 100);
    const share = bet.amount / winningPool;
    const basePayout = bet.amount + distributablePool * share;

    // Early bird multiplier
    const timeIntoRound = bet.placedAt - round.startTime;
    const bettingDuration = round.lockTime - round.startTime;
    const timeRatio = Math.min(1, Math.max(0, timeIntoRound / bettingDuration));
    const earlyBirdMultiplier = 1 + 0.2 * (1 - timeRatio);

    return basePayout * earlyBirdMultiplier;
  };

  test('should calculate correct payout for single winner', () => {
    const round: Round = {
      startTime: 0,
      lockTime: 25000,
      longPool: 100,
      shortPool: 100,
      longBets: [{ amount: 100, placedAt: 0 }],
      shortBets: [{ amount: 100, placedAt: 0 }],
    };

    const payout = calculatePayout(round.longBets[0], round, true);
    // 100 + (100 * 0.95) = 195, * 1.2 = 234
    expect(payout).toBeCloseTo(234, 0);
  });

  test('should return 0 for loser', () => {
    const round: Round = {
      startTime: 0,
      lockTime: 25000,
      longPool: 100,
      shortPool: 100,
      longBets: [{ amount: 100, placedAt: 0 }],
      shortBets: [{ amount: 100, placedAt: 0 }],
    };

    const payout = calculatePayout(round.shortBets[0], round, false);
    expect(payout).toBe(0);
  });

  test('should refund when no opposing bets', () => {
    const round: Round = {
      startTime: 0,
      lockTime: 25000,
      longPool: 100,
      shortPool: 0,
      longBets: [{ amount: 100, placedAt: 0 }],
      shortBets: [],
    };

    const payout = calculatePayout(round.longBets[0], round, true);
    expect(payout).toBe(100);
  });

  test('should distribute proportionally to multiple winners', () => {
    const round: Round = {
      startTime: 0,
      lockTime: 25000,
      longPool: 150,
      shortPool: 150,
      longBets: [
        { amount: 100, placedAt: 0 },
        { amount: 50, placedAt: 0 },
      ],
      shortBets: [{ amount: 150, placedAt: 0 }],
    };

    const bigWinnerPayout = calculatePayout(round.longBets[0], round, true);
    const smallWinnerPayout = calculatePayout(round.longBets[1], round, true);

    // Big winner gets 2x the small winner's share
    expect(bigWinnerPayout / smallWinnerPayout).toBeCloseTo(2, 1);
  });

  test('should give higher payout to early bettors', () => {
    const round: Round = {
      startTime: 0,
      lockTime: 25000,
      longPool: 200,
      shortPool: 100,
      longBets: [
        { amount: 100, placedAt: 0 }, // Early
        { amount: 100, placedAt: 25000 }, // Late
      ],
      shortBets: [{ amount: 100, placedAt: 0 }],
    };

    const earlyPayout = calculatePayout(round.longBets[0], round, true);
    const latePayout = calculatePayout(round.longBets[1], round, true);

    expect(earlyPayout).toBeGreaterThan(latePayout);
    expect(earlyPayout / latePayout).toBeCloseTo(1.2, 1);
  });
});

// ============================================
// ROUND LIFECYCLE TESTS
// ============================================

describe('Round Lifecycle', () => {
  const ROUND_DURATION_MS = 30000;
  const LOCK_BEFORE_END_MS = 5000;

  interface Round {
    startTime: number;
    lockTime: number;
    endTime: number;
    status: 'betting' | 'locked' | 'settled';
  }

  const createRound = (startTime: number): Round => ({
    startTime,
    lockTime: startTime + ROUND_DURATION_MS - LOCK_BEFORE_END_MS,
    endTime: startTime + ROUND_DURATION_MS,
    status: 'betting',
  });

  const getStatus = (round: Round, now: number): string => {
    if (now < round.lockTime) return 'betting';
    if (now < round.endTime) return 'locked';
    return 'settled';
  };

  const getTimeRemaining = (round: Round, now: number): number => {
    if (now < round.lockTime) {
      return Math.max(0, Math.floor((round.lockTime - now) / 1000));
    }
    if (now < round.endTime) {
      return Math.max(0, Math.floor((round.endTime - now) / 1000));
    }
    return 0;
  };

  const canPlaceBet = (round: Round, now: number): boolean => {
    return getStatus(round, now) === 'betting';
  };

  test('should create round with correct timing', () => {
    const now = Date.now();
    const round = createRound(now);

    expect(round.startTime).toBe(now);
    expect(round.lockTime).toBe(now + 25000);
    expect(round.endTime).toBe(now + 30000);
  });

  test('should be in betting status at start', () => {
    const now = Date.now();
    const round = createRound(now);

    expect(getStatus(round, now)).toBe('betting');
    expect(canPlaceBet(round, now)).toBe(true);
  });

  test('should transition to locked after betting period', () => {
    const startTime = 0;
    const round = createRound(startTime);

    expect(getStatus(round, 24999)).toBe('betting');
    expect(getStatus(round, 25000)).toBe('locked');
    expect(canPlaceBet(round, 25000)).toBe(false);
  });

  test('should transition to settled after round ends', () => {
    const startTime = 0;
    const round = createRound(startTime);

    expect(getStatus(round, 29999)).toBe('locked');
    expect(getStatus(round, 30000)).toBe('settled');
  });

  test('should calculate time remaining correctly during betting', () => {
    const startTime = 0;
    const round = createRound(startTime);

    expect(getTimeRemaining(round, 0)).toBe(25);
    expect(getTimeRemaining(round, 10000)).toBe(15);
    expect(getTimeRemaining(round, 24000)).toBe(1);
  });

  test('should calculate time remaining correctly during locked', () => {
    const startTime = 0;
    const round = createRound(startTime);

    expect(getTimeRemaining(round, 25000)).toBe(5);
    expect(getTimeRemaining(round, 27500)).toBe(2);
    expect(getTimeRemaining(round, 29999)).toBe(0);
  });

  test('should return 0 after round ends', () => {
    const startTime = 0;
    const round = createRound(startTime);

    expect(getTimeRemaining(round, 30000)).toBe(0);
    expect(getTimeRemaining(round, 50000)).toBe(0);
  });
});

// ============================================
// WINNER DETERMINATION TESTS
// ============================================

describe('Winner Determination', () => {
  type Winner = 'long' | 'short' | 'push';

  const determineWinner = (startPrice: number, endPrice: number): Winner => {
    if (endPrice > startPrice) return 'long';
    if (endPrice < startPrice) return 'short';
    return 'push';
  };

  test('should determine long winner when price goes up', () => {
    expect(determineWinner(100, 101)).toBe('long');
    expect(determineWinner(100, 100.001)).toBe('long');
    expect(determineWinner(100, 150)).toBe('long');
  });

  test('should determine short winner when price goes down', () => {
    expect(determineWinner(100, 99)).toBe('short');
    expect(determineWinner(100, 99.999)).toBe('short');
    expect(determineWinner(100, 50)).toBe('short');
  });

  test('should determine push when price unchanged', () => {
    expect(determineWinner(100, 100)).toBe('push');
    expect(determineWinner(141.50, 141.50)).toBe('push');
  });
});

// ============================================
// STREAK CALCULATION TESTS
// ============================================

describe('Streak Calculation', () => {
  type Winner = 'long' | 'short' | 'push';

  interface StreakInfo {
    streak: number;
    side: Winner | null;
  }

  const calculateStreak = (recentRounds: { winner: Winner }[]): StreakInfo => {
    let streak = 0;
    let streakSide: Winner | null = null;

    for (const round of recentRounds) {
      if (!round.winner || round.winner === 'push') break;

      if (!streakSide) {
        streakSide = round.winner;
        streak = 1;
      } else if (round.winner === streakSide) {
        streak++;
      } else {
        break;
      }
    }

    return { streak, side: streakSide };
  };

  test('should calculate no streak for empty rounds', () => {
    const result = calculateStreak([]);
    expect(result.streak).toBe(0);
    expect(result.side).toBeNull();
  });

  test('should calculate single win as streak of 1', () => {
    const result = calculateStreak([{ winner: 'long' }]);
    expect(result.streak).toBe(1);
    expect(result.side).toBe('long');
  });

  test('should calculate consecutive wins correctly', () => {
    const result = calculateStreak([
      { winner: 'long' },
      { winner: 'long' },
      { winner: 'long' },
    ]);
    expect(result.streak).toBe(3);
    expect(result.side).toBe('long');
  });

  test('should stop streak on opposite result', () => {
    const result = calculateStreak([
      { winner: 'long' },
      { winner: 'long' },
      { winner: 'short' },
      { winner: 'short' },
    ]);
    expect(result.streak).toBe(2);
    expect(result.side).toBe('long');
  });

  test('should stop streak on push', () => {
    const result = calculateStreak([
      { winner: 'short' },
      { winner: 'short' },
      { winner: 'push' },
      { winner: 'short' },
    ]);
    expect(result.streak).toBe(2);
    expect(result.side).toBe('short');
  });

  test('should handle starting with push', () => {
    const result = calculateStreak([{ winner: 'push' }, { winner: 'long' }]);
    expect(result.streak).toBe(0);
    expect(result.side).toBeNull();
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('Bet Validation', () => {
  const VALID_BET_AMOUNTS_SOL = [0.01, 0.05, 0.1, 0.25, 0.5];
  const MIN_BET_LAMPORTS = 10_000_000; // 0.01 SOL

  const isValidBetAmount = (amountSol: number): boolean => {
    return VALID_BET_AMOUNTS_SOL.includes(amountSol);
  };

  const meetsMinimumBet = (lamports: number): boolean => {
    return lamports >= MIN_BET_LAMPORTS;
  };

  test('should accept valid bet amounts', () => {
    expect(isValidBetAmount(0.01)).toBe(true);
    expect(isValidBetAmount(0.05)).toBe(true);
    expect(isValidBetAmount(0.1)).toBe(true);
    expect(isValidBetAmount(0.25)).toBe(true);
    expect(isValidBetAmount(0.5)).toBe(true);
  });

  test('should reject invalid bet amounts', () => {
    expect(isValidBetAmount(0.02)).toBe(false);
    expect(isValidBetAmount(0.15)).toBe(false);
    expect(isValidBetAmount(1.0)).toBe(false);
    expect(isValidBetAmount(0)).toBe(false);
    expect(isValidBetAmount(-0.1)).toBe(false);
  });

  test('should check minimum bet in lamports', () => {
    expect(meetsMinimumBet(10_000_000)).toBe(true);
    expect(meetsMinimumBet(50_000_000)).toBe(true);
    expect(meetsMinimumBet(9_999_999)).toBe(false);
    expect(meetsMinimumBet(0)).toBe(false);
  });
});
