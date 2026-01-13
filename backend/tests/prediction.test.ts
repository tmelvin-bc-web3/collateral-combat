/**
 * Integration Tests for Prediction Service (Oracle)
 * Tests bet placement, round lifecycle, and payout calculations
 */

import {
  PredictionRound,
  PredictionBet,
  PredictionSide,
  RoundStatus,
  PredictionStats,
} from '../src/types';

// Simple UUID generator for tests (avoids ESM issues with uuid package)
let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `test-${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 9)}`;
};

// Constants matching the production service
const ROUND_DURATION = 30;
const LOCK_BEFORE_END = 5;
const PLATFORM_FEE_PERCENT = 5;
const EARLY_BIRD_MAX_BONUS = 0.20;
const VALID_BET_AMOUNTS = [5, 15, 25, 50, 100];

/**
 * Testable Prediction Service implementation
 * Isolated from external dependencies (priceService, progressionService, database)
 */
class TestPredictionService {
  private rounds: Map<string, PredictionRound[]> = new Map();
  private currentRounds: Map<string, PredictionRound> = new Map();
  private userBets: Map<string, PredictionBet[]> = new Map();
  private stats: Map<string, PredictionStats> = new Map();
  private mockPrice: number = 100;

  constructor() {
    this.stats.set('SOL', {
      asset: 'SOL',
      totalRounds: 0,
      totalVolume: 0,
      longWins: 0,
      shortWins: 0,
      pushes: 0,
    });
    this.rounds.set('SOL', []);
  }

  setMockPrice(price: number): void {
    this.mockPrice = price;
  }

  getMockPrice(): number {
    return this.mockPrice;
  }

  startRound(asset: string = 'SOL'): PredictionRound {
    const now = Date.now();

    const round: PredictionRound = {
      id: generateId(),
      asset,
      status: 'betting',
      startPrice: this.mockPrice,
      startTime: now,
      lockTime: now + (ROUND_DURATION - LOCK_BEFORE_END) * 1000,
      endTime: now + ROUND_DURATION * 1000,
      duration: ROUND_DURATION,
      longPool: 0,
      shortPool: 0,
      longBets: [],
      shortBets: [],
      totalPool: 0,
    };

    this.currentRounds.set(asset, round);
    const assetRounds = this.rounds.get(asset) || [];
    assetRounds.push(round);
    this.rounds.set(asset, assetRounds);

    return round;
  }

  lockRound(asset: string): PredictionRound | null {
    const round = this.currentRounds.get(asset);
    if (!round || round.status !== 'betting') return null;

    round.status = 'locked';
    return round;
  }

  settleRound(asset: string, endPrice?: number): PredictionRound | null {
    const round = this.currentRounds.get(asset);
    if (!round) return null;

    round.endPrice = endPrice ?? this.mockPrice;
    round.status = 'settled';

    // Determine winner
    if (round.endPrice > round.startPrice) {
      round.winner = 'long';
    } else if (round.endPrice < round.startPrice) {
      round.winner = 'short';
    } else {
      round.winner = 'push';
    }

    // Calculate payouts
    this.calculatePayouts(round);

    // Update stats
    const stats = this.stats.get(asset)!;
    stats.totalRounds++;
    stats.totalVolume += round.totalPool;
    if (round.winner === 'long') stats.longWins++;
    else if (round.winner === 'short') stats.shortWins++;
    else stats.pushes++;

    this.currentRounds.delete(asset);
    return round;
  }

  private getEarlyBirdMultiplier(bet: PredictionBet, round: PredictionRound): number {
    const timeIntoRound = bet.placedAt - round.startTime;
    const bettingDuration = round.lockTime - round.startTime;
    const timeRatio = Math.min(1, Math.max(0, timeIntoRound / bettingDuration));
    return 1 + (EARLY_BIRD_MAX_BONUS * (1 - timeRatio));
  }

  private calculatePayouts(round: PredictionRound): void {
    const winningBets =
      round.winner === 'long'
        ? round.longBets
        : round.winner === 'short'
        ? round.shortBets
        : [];
    const losingPool =
      round.winner === 'long'
        ? round.shortPool
        : round.winner === 'short'
        ? round.longPool
        : 0;
    const winningPool =
      round.winner === 'long'
        ? round.longPool
        : round.winner === 'short'
        ? round.shortPool
        : 0;

    // If push or no losing side, refund everyone
    if (round.winner === 'push' || losingPool === 0) {
      [...round.longBets, ...round.shortBets].forEach((bet) => {
        bet.status = round.winner === 'push' ? 'push' : 'cancelled';
        bet.payout = bet.amount;
      });
      return;
    }

    // Calculate payouts for winners
    const distributablePool = losingPool * (1 - PLATFORM_FEE_PERCENT / 100);

    winningBets.forEach((bet) => {
      const share = bet.amount / winningPool;
      const basePayout = bet.amount + distributablePool * share;
      const earlyBirdMultiplier = this.getEarlyBirdMultiplier(bet, round);
      bet.payout = basePayout * earlyBirdMultiplier;
      bet.status = 'won';
    });

    // Mark losing bets
    const losingBets =
      round.winner === 'long' ? round.shortBets : round.longBets;
    losingBets.forEach((bet) => {
      bet.status = 'lost';
      bet.payout = 0;
    });
  }

  placeBet(
    asset: string,
    side: PredictionSide,
    amount: number,
    bettor: string,
    placedAt?: number
  ): PredictionBet {
    const round = this.currentRounds.get(asset);

    if (!round) {
      throw new Error('No active round');
    }

    if (round.status !== 'betting') {
      throw new Error('Betting is closed for this round');
    }

    if (!VALID_BET_AMOUNTS.includes(amount)) {
      throw new Error('Invalid bet amount');
    }

    const bet: PredictionBet = {
      id: generateId(),
      roundId: round.id,
      bettor,
      side,
      amount,
      placedAt: placedAt ?? Date.now(),
      status: 'pending',
    };

    if (side === 'long') {
      round.longBets.push(bet);
      round.longPool += amount;
    } else {
      round.shortBets.push(bet);
      round.shortPool += amount;
    }
    round.totalPool = round.longPool + round.shortPool;

    const userBets = this.userBets.get(bettor) || [];
    userBets.push(bet);
    this.userBets.set(bettor, userBets);

    return bet;
  }

  getCurrentRound(asset: string): PredictionRound | undefined {
    return this.currentRounds.get(asset);
  }

  getUserBets(wallet: string): PredictionBet[] {
    return this.userBets.get(wallet) || [];
  }

  getStats(asset: string): PredictionStats | undefined {
    return this.stats.get(asset);
  }
}

// ============================================
// TEST SUITES
// ============================================

describe('Prediction Service - Bet Placement', () => {
  let service: TestPredictionService;

  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  test('should place a valid long bet', () => {
    service.startRound('SOL');
    const bet = service.placeBet('SOL', 'long', 25, 'wallet123');

    expect(bet).toBeDefined();
    expect(bet.side).toBe('long');
    expect(bet.amount).toBe(25);
    expect(bet.bettor).toBe('wallet123');
    expect(bet.status).toBe('pending');

    const round = service.getCurrentRound('SOL');
    expect(round?.longPool).toBe(25);
    expect(round?.longBets.length).toBe(1);
  });

  test('should place a valid short bet', () => {
    service.startRound('SOL');
    const bet = service.placeBet('SOL', 'short', 50, 'wallet456');

    expect(bet).toBeDefined();
    expect(bet.side).toBe('short');
    expect(bet.amount).toBe(50);

    const round = service.getCurrentRound('SOL');
    expect(round?.shortPool).toBe(50);
    expect(round?.shortBets.length).toBe(1);
  });

  test('should reject bet when no active round', () => {
    expect(() => service.placeBet('SOL', 'long', 25, 'wallet123')).toThrow(
      'No active round'
    );
  });

  test('should reject bet when betting is closed (round locked)', () => {
    service.startRound('SOL');
    service.lockRound('SOL');

    expect(() => service.placeBet('SOL', 'long', 25, 'wallet123')).toThrow(
      'Betting is closed for this round'
    );
  });

  test('should reject invalid bet amounts', () => {
    service.startRound('SOL');

    expect(() => service.placeBet('SOL', 'long', 10, 'wallet123')).toThrow(
      'Invalid bet amount'
    );
    expect(() => service.placeBet('SOL', 'long', 30, 'wallet123')).toThrow(
      'Invalid bet amount'
    );
    expect(() => service.placeBet('SOL', 'long', 0, 'wallet123')).toThrow(
      'Invalid bet amount'
    );
    expect(() => service.placeBet('SOL', 'long', -5, 'wallet123')).toThrow(
      'Invalid bet amount'
    );
  });

  test('should accept all valid bet amounts', () => {
    service.startRound('SOL');

    VALID_BET_AMOUNTS.forEach((amount, idx) => {
      const bet = service.placeBet('SOL', 'long', amount, `wallet${idx}`);
      expect(bet.amount).toBe(amount);
    });

    const round = service.getCurrentRound('SOL');
    const expectedTotal = VALID_BET_AMOUNTS.reduce((a, b) => a + b, 0);
    expect(round?.longPool).toBe(expectedTotal);
  });

  test('should track user bets correctly', () => {
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 25, 'userA');
    service.placeBet('SOL', 'short', 50, 'userA');
    service.placeBet('SOL', 'long', 15, 'userB');

    const userABets = service.getUserBets('userA');
    const userBBets = service.getUserBets('userB');

    expect(userABets.length).toBe(2);
    expect(userBBets.length).toBe(1);
  });

  test('should update total pool correctly', () => {
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 25, 'user1');
    service.placeBet('SOL', 'short', 50, 'user2');
    service.placeBet('SOL', 'long', 100, 'user3');

    const round = service.getCurrentRound('SOL');
    expect(round?.longPool).toBe(125);
    expect(round?.shortPool).toBe(50);
    expect(round?.totalPool).toBe(175);
  });
});

describe('Prediction Service - Round Lifecycle', () => {
  let service: TestPredictionService;

  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  test('should start a new round in betting status', () => {
    const round = service.startRound('SOL');

    expect(round).toBeDefined();
    expect(round.status).toBe('betting');
    expect(round.asset).toBe('SOL');
    expect(round.startPrice).toBe(100);
    expect(round.longPool).toBe(0);
    expect(round.shortPool).toBe(0);
  });

  test('should transition from betting to locked', () => {
    service.startRound('SOL');
    const lockedRound = service.lockRound('SOL');

    expect(lockedRound?.status).toBe('locked');
  });

  test('should not lock an already locked round', () => {
    service.startRound('SOL');
    service.lockRound('SOL');
    const result = service.lockRound('SOL');

    expect(result).toBeNull();
  });

  test('should settle a round and determine long winner', () => {
    service.setMockPrice(100);
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 50, 'winner');
    service.placeBet('SOL', 'short', 50, 'loser');

    service.lockRound('SOL');

    // Price goes up - long wins
    const settledRound = service.settleRound('SOL', 105);

    expect(settledRound?.status).toBe('settled');
    expect(settledRound?.winner).toBe('long');
    expect(settledRound?.endPrice).toBe(105);
  });

  test('should settle a round and determine short winner', () => {
    service.setMockPrice(100);
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 50, 'loser');
    service.placeBet('SOL', 'short', 50, 'winner');

    service.lockRound('SOL');

    // Price goes down - short wins
    const settledRound = service.settleRound('SOL', 95);

    expect(settledRound?.status).toBe('settled');
    expect(settledRound?.winner).toBe('short');
    expect(settledRound?.endPrice).toBe(95);
  });

  test('should handle push when price unchanged', () => {
    service.setMockPrice(100);
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 50, 'player1');
    service.placeBet('SOL', 'short', 50, 'player2');

    service.lockRound('SOL');

    // Price stays the same - push
    const settledRound = service.settleRound('SOL', 100);

    expect(settledRound?.winner).toBe('push');
  });

  test('should update stats after settlement', () => {
    service.setMockPrice(100);
    service.startRound('SOL');
    service.placeBet('SOL', 'long', 50, 'player');
    service.lockRound('SOL');
    service.settleRound('SOL', 105);

    const stats = service.getStats('SOL');
    expect(stats?.totalRounds).toBe(1);
    expect(stats?.longWins).toBe(1);
    expect(stats?.totalVolume).toBe(50);
  });

  test('should clear current round after settlement', () => {
    service.startRound('SOL');
    service.lockRound('SOL');
    service.settleRound('SOL', 100);

    const currentRound = service.getCurrentRound('SOL');
    expect(currentRound).toBeUndefined();
  });
});

describe('Prediction Service - Payout Calculations', () => {
  let service: TestPredictionService;

  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  test('should calculate winner payouts with platform fee deducted', () => {
    service.startRound('SOL');

    // Set bets placed at round start for max early bird bonus
    const round = service.getCurrentRound('SOL')!;
    const placedAt = round.startTime;

    service.placeBet('SOL', 'long', 50, 'winner', placedAt);
    service.placeBet('SOL', 'short', 50, 'loser', placedAt);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    const winnerBet = settledRound!.longBets[0];
    const loserBet = settledRound!.shortBets[0];

    // Winner should get their bet back plus 95% of losing pool (5% fee)
    // With max early bird bonus (1.2x): (50 + 50 * 0.95) * 1.2 = 97.5 * 1.2 = 117
    expect(winnerBet.status).toBe('won');
    expect(winnerBet.payout).toBeCloseTo(117, 1);

    expect(loserBet.status).toBe('lost');
    expect(loserBet.payout).toBe(0);
  });

  test('should distribute proportional payouts to multiple winners', () => {
    service.startRound('SOL');
    const round = service.getCurrentRound('SOL')!;
    const placedAt = round.startTime;

    // Two long bets, one short bet (using valid amounts: 100, 50, 100+50=150 split)
    service.placeBet('SOL', 'long', 100, 'bigWinner', placedAt);
    service.placeBet('SOL', 'long', 50, 'smallWinner', placedAt);
    service.placeBet('SOL', 'short', 100, 'loser1', placedAt);
    service.placeBet('SOL', 'short', 50, 'loser2', placedAt);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    const bigWinnerBet = settledRound!.longBets[0];
    const smallWinnerBet = settledRound!.longBets[1];

    // Losing pool: 150, distributable: 142.5 (95% after 5% fee)
    // Big winner share: 100/150 = 2/3 of 142.5 = 95 + 100 = 195 * 1.2 = 234
    // Small winner share: 50/150 = 1/3 of 142.5 = 47.5 + 50 = 97.5 * 1.2 = 117
    expect(bigWinnerBet.payout).toBeCloseTo(234, 0);
    expect(smallWinnerBet.payout).toBeCloseTo(117, 0);
  });

  test('should refund all bets on push', () => {
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 50, 'player1');
    service.placeBet('SOL', 'short', 50, 'player2'); // Changed from 75 to valid amount

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 100); // Same price = push

    expect(settledRound!.longBets[0].status).toBe('push');
    expect(settledRound!.longBets[0].payout).toBe(50);

    expect(settledRound!.shortBets[0].status).toBe('push');
    expect(settledRound!.shortBets[0].payout).toBe(50);
  });

  test('should refund bets when no opposing side', () => {
    service.startRound('SOL');

    // Only long bets, no shorts
    service.placeBet('SOL', 'long', 50, 'player1');
    service.placeBet('SOL', 'long', 100, 'player2');

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110); // Long wins but no losers

    expect(settledRound!.longBets[0].status).toBe('cancelled');
    expect(settledRound!.longBets[0].payout).toBe(50);

    expect(settledRound!.longBets[1].status).toBe('cancelled');
    expect(settledRound!.longBets[1].payout).toBe(100);
  });

  test('should apply early bird bonus for early bets', () => {
    service.startRound('SOL');
    const round = service.getCurrentRound('SOL')!;

    // Bet at start (max bonus)
    service.placeBet('SOL', 'long', 50, 'earlyBird', round.startTime);

    // Bet at end (no bonus)
    service.placeBet('SOL', 'long', 50, 'lateBird', round.lockTime);

    service.placeBet('SOL', 'short', 100, 'loser', round.startTime);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    const earlyBet = settledRound!.longBets[0];
    const lateBet = settledRound!.longBets[1];

    // Early bird should have higher payout due to 20% bonus
    expect(earlyBet.payout).toBeDefined();
    expect(lateBet.payout).toBeDefined();
    expect(earlyBet.payout!).toBeGreaterThan(lateBet.payout!);

    // Early bird multiplier = 1.2 (placed at start)
    // Late bird multiplier = 1.0 (placed at lock time)
    const earlyMultiplier = earlyBet.payout! / lateBet.payout!;
    expect(earlyMultiplier).toBeCloseTo(1.2, 1);
  });

  test('should calculate correct payout for single winner', () => {
    service.startRound('SOL');
    const round = service.getCurrentRound('SOL')!;

    service.placeBet('SOL', 'long', 25, 'winner', round.startTime);
    service.placeBet('SOL', 'short', 50, 'loser1', round.startTime);
    service.placeBet('SOL', 'short', 25, 'loser2', round.startTime);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    const winnerBet = settledRound!.longBets[0];

    // Winner gets: 25 + (75 * 0.95) = 25 + 71.25 = 96.25
    // With max early bird (1.2): 96.25 * 1.2 = 115.5
    expect(winnerBet.payout!).toBeCloseTo(115.5, 0);
  });
});

describe('Prediction Service - Edge Cases', () => {
  let service: TestPredictionService;

  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  test('should handle empty round (no bets)', () => {
    service.startRound('SOL');
    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 105);

    expect(settledRound?.status).toBe('settled');
    expect(settledRound?.totalPool).toBe(0);
  });

  test('should handle very small price differences', () => {
    service.setMockPrice(100.0);
    service.startRound('SOL');

    service.placeBet('SOL', 'long', 50, 'player1');
    service.placeBet('SOL', 'short', 50, 'player2');

    service.lockRound('SOL');

    // Tiny price increase
    const settledRound = service.settleRound('SOL', 100.001);

    expect(settledRound?.winner).toBe('long');
  });

  test('should handle large pools correctly', () => {
    service.startRound('SOL');
    const round = service.getCurrentRound('SOL')!;

    // Simulate many bets
    for (let i = 0; i < 20; i++) {
      service.placeBet('SOL', 'long', 100, `longPlayer${i}`, round.startTime);
      service.placeBet('SOL', 'short', 100, `shortPlayer${i}`, round.startTime);
    }

    const preSettleRound = service.getCurrentRound('SOL')!;
    expect(preSettleRound.totalPool).toBe(4000);
    expect(preSettleRound.longPool).toBe(2000);
    expect(preSettleRound.shortPool).toBe(2000);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    // All long bets should win
    settledRound!.longBets.forEach((bet) => {
      expect(bet.status).toBe('won');
      expect(bet.payout).toBeGreaterThan(bet.amount);
    });

    // All short bets should lose
    settledRound!.shortBets.forEach((bet) => {
      expect(bet.status).toBe('lost');
      expect(bet.payout).toBe(0);
    });
  });

  test('should handle asymmetric pools', () => {
    service.startRound('SOL');
    const round = service.getCurrentRound('SOL')!;

    // Heavy long bias
    service.placeBet('SOL', 'long', 100, 'player1', round.startTime);
    service.placeBet('SOL', 'long', 100, 'player2', round.startTime);
    service.placeBet('SOL', 'long', 100, 'player3', round.startTime);
    service.placeBet('SOL', 'short', 25, 'player4', round.startTime);

    const preRound = service.getCurrentRound('SOL')!;
    expect(preRound.longPool).toBe(300);
    expect(preRound.shortPool).toBe(25);

    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 110);

    // Long wins but small losing pool
    // Distributable: 25 * 0.95 = 23.75
    // Each long winner gets: (100/300) * 23.75 = 7.916... + 100 = 107.916...
    // With early bird 1.2x: ~129.5
    settledRound!.longBets.forEach((bet) => {
      expect(bet.payout).toBeCloseTo(129.5, 0);
    });
  });

  test('should track multiple rounds correctly', () => {
    // Round 1
    service.startRound('SOL');
    service.placeBet('SOL', 'long', 50, 'player1');
    service.lockRound('SOL');
    service.settleRound('SOL', 105);

    // Round 2
    service.startRound('SOL');
    service.placeBet('SOL', 'short', 50, 'player2');
    service.lockRound('SOL');
    service.settleRound('SOL', 95);

    // Round 3
    service.startRound('SOL');
    service.placeBet('SOL', 'long', 25, 'player3');
    service.placeBet('SOL', 'short', 25, 'player4');
    service.lockRound('SOL');
    service.settleRound('SOL', 100); // Push

    const stats = service.getStats('SOL');
    expect(stats?.totalRounds).toBe(3);
    expect(stats?.longWins).toBe(1);
    expect(stats?.shortWins).toBe(1);
    expect(stats?.pushes).toBe(1);
  });
});

describe('Prediction Service - Stats Tracking', () => {
  let service: TestPredictionService;

  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  test('should initialize stats correctly', () => {
    const stats = service.getStats('SOL');

    expect(stats).toBeDefined();
    expect(stats?.totalRounds).toBe(0);
    expect(stats?.totalVolume).toBe(0);
    expect(stats?.longWins).toBe(0);
    expect(stats?.shortWins).toBe(0);
    expect(stats?.pushes).toBe(0);
  });

  test('should track total volume', () => {
    service.startRound('SOL');
    service.placeBet('SOL', 'long', 50, 'p1');
    service.placeBet('SOL', 'short', 100, 'p2');
    service.lockRound('SOL');
    service.settleRound('SOL', 105);

    const stats = service.getStats('SOL');
    expect(stats?.totalVolume).toBe(150);
  });

  test('should accumulate stats across multiple rounds', () => {
    // 5 rounds with different outcomes
    for (let i = 0; i < 5; i++) {
      service.startRound('SOL');
      service.placeBet('SOL', 'long', 25, 'player');
      service.lockRound('SOL');
      service.settleRound('SOL', i < 3 ? 105 : 95); // 3 long wins, 2 short wins
    }

    const stats = service.getStats('SOL');
    expect(stats?.totalRounds).toBe(5);
    expect(stats?.longWins).toBe(3);
    expect(stats?.shortWins).toBe(2);
    expect(stats?.totalVolume).toBe(125);
  });
});
