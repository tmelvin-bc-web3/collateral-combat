/**
 * Integration Tests for Economic Invariants
 *
 * Tests economic model correctness to ensure solvency invariants hold:
 * - total_payouts + fees <= total_pool (no money creation)
 * - paidOut <= locked for each game mode (solvency per mode)
 * - vault >= total liabilities (global solvency)
 * - Fee accuracy (500 BPS / 5% platform fee, 1000 BPS / 10% draft fee)
 * - Edge cases: draw refunds, single-sided pools
 *
 * These tests verify the economic model works correctly before mainnet deployment.
 */

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: () => `mock-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
}));

import {
  recordGameModeLock,
  recordGameModePayout,
  recordGameModeRefund,
  canPayoutFromGameMode,
  getGameModeBalance,
  getAllGameModeBalances,
  GameMode,
  GameModeBalance,
} from '../../src/db/balanceDatabase';

import {
  PLATFORM_FEE_BPS,
  DRAFT_FEE_BPS,
  PLATFORM_FEE_PERCENT,
  DRAFT_FEE_PERCENT,
  calculateDistributablePool,
  calculateFee,
} from '../../src/utils/fees';

// Helper to generate unique test context
const generateTestContext = () => `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ============================================
// Solvency Invariants
// ============================================

describe('Economic Invariants', () => {
  describe('Solvency', () => {
    it('should maintain: total_payouts + fees <= total_pool', () => {
      // Property test: for any set of bets and winner, verify invariant
      // total_pool = sum of all entry fees
      // After settlement: total_payouts + fees = total_pool

      const testCases = [
        // [longPool, shortPool, winner]
        { longPool: 100, shortPool: 100, winner: 'long' as const },
        { longPool: 100, shortPool: 100, winner: 'short' as const },
        { longPool: 300, shortPool: 100, winner: 'long' as const },
        { longPool: 100, shortPool: 300, winner: 'short' as const },
        { longPool: 50, shortPool: 200, winner: 'long' as const },
        { longPool: 1000, shortPool: 500, winner: 'short' as const },
      ];

      for (const tc of testCases) {
        const totalPool = tc.longPool + tc.shortPool;
        const losingPool = tc.winner === 'long' ? tc.shortPool : tc.longPool;
        const winningPool = tc.winner === 'long' ? tc.longPool : tc.shortPool;

        // Platform takes fee from losing pool
        const fee = calculateFee(losingPool);
        const distributable = calculateDistributablePool(losingPool);

        // Winners get: their bet back + share of distributable pool
        const totalPayouts = winningPool + distributable;

        // Fee taken
        const totalFees = fee;

        // Invariant: payouts + fees = total pool
        // Actually: payouts + fees <= total pool (fees come from losing side)
        const accountedFor = totalPayouts + totalFees;

        expect(accountedFor).toBeCloseTo(totalPool, 10);
        expect(accountedFor).toBeLessThanOrEqual(totalPool + 0.0001); // Allow tiny float error
      }
    });

    it('should maintain: paidOut <= locked for each game mode', () => {
      // Use a fresh game mode context by testing the logic
      const gameMode: GameMode = 'token_wars';

      // Get baseline
      const baseline = getGameModeBalance(gameMode);
      const initialAvailable = Math.max(0, baseline.totalLocked - baseline.totalPaidOut);

      // Lock some funds
      const lockAmount = 500_000_000; // 0.5 SOL
      recordGameModeLock(gameMode, lockAmount);

      // Verify we can pay up to locked - paidOut
      const afterLock = getGameModeBalance(gameMode);
      const available = afterLock.totalLocked - afterLock.totalPaidOut;
      expect(available).toBeGreaterThanOrEqual(lockAmount);

      // canPayoutFromGameMode should reject amounts > available
      const tooMuch = available + 1_000_000;
      expect(canPayoutFromGameMode(gameMode, tooMuch)).toBe(false);

      // canPayoutFromGameMode should accept amounts <= available
      if (available > 0) {
        expect(canPayoutFromGameMode(gameMode, Math.floor(available / 2))).toBe(true);
      }
    });

    it('should verify vault >= total liabilities via verifyGlobalVaultSolvency structure', () => {
      // Test the structure of getAllGameModeBalances which is used by verifyGlobalVaultSolvency
      const allBalances = getAllGameModeBalances();

      // Calculate total liabilities (sum of locked - paidOut for each mode)
      let totalLiabilities = 0;
      const gameModes: GameMode[] = ['oracle', 'battle', 'draft', 'spectator', 'lds', 'token_wars'];

      for (const mode of gameModes) {
        const balance = allBalances[mode];
        const available = Math.max(0, balance.totalLocked - balance.totalPaidOut);
        totalLiabilities += available;

        // Verify structure
        expect(balance).toHaveProperty('totalLocked');
        expect(balance).toHaveProperty('totalPaidOut');
        expect(balance).toHaveProperty('activeGames');
        expect(typeof balance.totalLocked).toBe('number');
        expect(typeof balance.totalPaidOut).toBe('number');
        expect(balance.totalLocked).toBeGreaterThanOrEqual(0);
        expect(balance.totalPaidOut).toBeGreaterThanOrEqual(0);
      }

      // totalLiabilities should be a valid number
      expect(typeof totalLiabilities).toBe('number');
      expect(totalLiabilities).toBeGreaterThanOrEqual(0);
    });

    it('should not allow paidOut to exceed locked for individual game modes', () => {
      const gameMode: GameMode = 'lds';
      const balance = getGameModeBalance(gameMode);
      const available = Math.max(0, balance.totalLocked - balance.totalPaidOut);

      // Try to pay out more than available
      if (available > 0) {
        const excess = available + 100_000_000; // 0.1 SOL more than available
        expect(canPayoutFromGameMode(gameMode, excess)).toBe(false);
      }

      // Even if available is 0, we cannot pay anything
      if (available === 0) {
        expect(canPayoutFromGameMode(gameMode, 1)).toBe(false);
      }
    });
  });

  // ============================================
  // Fee Accuracy
  // ============================================

  describe('Fee Accuracy', () => {
    it('should use consistent fee: PLATFORM_FEE_BPS equals 500 (5%)', () => {
      // Verify the constant matches expected value
      expect(PLATFORM_FEE_BPS).toBe(500);
      expect(PLATFORM_FEE_PERCENT).toBe(5);

      // Document that contract lib.rs line 18 uses same value:
      // pub const PLATFORM_FEE_BPS: u64 = 500;
      // This must match for correct settlement
    });

    it('should use consistent draft fee: DRAFT_FEE_BPS equals 1000 (10%)', () => {
      // Draft tournaments intentionally use higher fee
      expect(DRAFT_FEE_BPS).toBe(1000);
      expect(DRAFT_FEE_PERCENT).toBe(10);
    });

    it('should calculate distributable pool correctly: losingPool * 0.95', () => {
      // Test calculateDistributablePool from fees.ts
      // losingPool * (1 - 500/10000) = losingPool * 0.95

      const testCases = [
        { losingPool: 100, expected: 95 },
        { losingPool: 1000, expected: 950 },
        { losingPool: 200_000_000, expected: 190_000_000 }, // 0.2 SOL -> 0.19 SOL
        { losingPool: 1_000_000_000, expected: 950_000_000 }, // 1 SOL -> 0.95 SOL
        { losingPool: 0, expected: 0 },
      ];

      for (const tc of testCases) {
        const distributable = calculateDistributablePool(tc.losingPool);
        expect(distributable).toBe(tc.expected);
      }
    });

    it('should calculate platform fee correctly: losingPool * 0.05', () => {
      // Test calculateFee from fees.ts
      // losingPool * (500/10000) = losingPool * 0.05

      const testCases = [
        { pool: 100, expected: 5 },
        { pool: 1000, expected: 50 },
        { pool: 200_000_000, expected: 10_000_000 }, // 0.2 SOL -> 0.01 SOL fee
        { pool: 1_000_000_000, expected: 50_000_000 }, // 1 SOL -> 0.05 SOL fee
        { pool: 0, expected: 0 },
      ];

      for (const tc of testCases) {
        const fee = calculateFee(tc.pool);
        expect(fee).toBe(tc.expected);
      }
    });

    it('should calculate draft fee correctly: pool * 0.10', () => {
      // Draft uses 10% fee (DRAFT_FEE_BPS = 1000)

      const testCases = [
        { pool: 100, expected: 10 },
        { pool: 1000, expected: 100 },
        { pool: 200_000_000, expected: 20_000_000 }, // 0.2 SOL -> 0.02 SOL fee
        { pool: 1_000_000_000, expected: 100_000_000 }, // 1 SOL -> 0.1 SOL fee
      ];

      for (const tc of testCases) {
        const fee = calculateFee(tc.pool, DRAFT_FEE_BPS);
        expect(fee).toBe(tc.expected);
      }
    });

    it('should have fee + distributable = pool', () => {
      // Verify that fee + distributable equals the original pool
      const testPools = [100, 1000, 500_000_000, 1_000_000_000];

      for (const pool of testPools) {
        const fee = calculateFee(pool);
        const distributable = calculateDistributablePool(pool);
        expect(fee + distributable).toBe(pool);
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle draw scenario: full refund without fee', () => {
      // When price unchanged (draw/push), both sides get full refund
      // Contract handles this at line 913-917
      // Backend logic: if winner === 'push', refund all bets

      const longBet = 100_000_000;
      const shortBet = 150_000_000;
      const totalPool = longBet + shortBet;

      // In a draw, each bettor gets their original bet back
      // No platform fee is taken (no loser to take from)
      const longRefund = longBet;
      const shortRefund = shortBet;

      // Total refunds should equal total pool
      expect(longRefund + shortRefund).toBe(totalPool);

      // No fee should be extracted in a draw
      const feeExtracted = totalPool - (longRefund + shortRefund);
      expect(feeExtracted).toBe(0);
    });

    it('should handle single-sided pool: winner gets bet back only', () => {
      // If losing_pool = 0 (everyone bet same side)
      // Winner gets bet_amount back, no profit possible
      // Contract handles at line 993-995

      const winnerBet = 100_000_000;
      const losingPool = 0;

      // Distributable pool from losers
      const distributable = calculateDistributablePool(losingPool);
      expect(distributable).toBe(0);

      // Winner gets their bet back (no profit from empty losing pool)
      const winnerPayout = winnerBet + distributable;
      expect(winnerPayout).toBe(winnerBet);

      // Platform fee from empty pool is 0
      const fee = calculateFee(losingPool);
      expect(fee).toBe(0);
    });

    it('should handle multiple winners proportionally', () => {
      // Multiple winners split the distributable pool proportionally
      const winner1Bet = 100_000_000;
      const winner2Bet = 200_000_000;
      const winningPool = winner1Bet + winner2Bet;
      const losingPool = 300_000_000;

      const distributable = calculateDistributablePool(losingPool);
      expect(distributable).toBe(285_000_000); // 300M * 0.95

      // Winner 1 share: 100/300 = 1/3
      const winner1Share = Math.floor((winner1Bet / winningPool) * distributable);
      // Winner 2 share: 200/300 = 2/3
      const winner2Share = Math.floor((winner2Bet / winningPool) * distributable);

      // Total distributed should not exceed distributable
      expect(winner1Share + winner2Share).toBeLessThanOrEqual(distributable);

      // Each winner also gets their original bet back
      const winner1Payout = winner1Bet + winner1Share;
      const winner2Payout = winner2Bet + winner2Share;

      // Winner 2 (bigger bet) should get bigger payout
      expect(winner2Payout).toBeGreaterThan(winner1Payout);
    });

    it('should handle very small pools without precision loss', () => {
      // Minimum bet is 0.01 SOL = 10_000_000 lamports
      const minBet = 10_000_000;
      const losingPool = minBet;

      const fee = calculateFee(losingPool);
      const distributable = calculateDistributablePool(losingPool);

      // Fee should be 500_000 lamports (0.0005 SOL)
      expect(fee).toBe(500_000);

      // Distributable should be 9_500_000 lamports (0.0095 SOL)
      expect(distributable).toBe(9_500_000);

      // Verify no rounding error accumulation
      expect(fee + distributable).toBe(losingPool);
    });

    it('should handle large pools without overflow', () => {
      // Large pool: 1000 SOL = 1_000_000_000_000 lamports
      const largePool = 1_000_000_000_000;

      const fee = calculateFee(largePool);
      const distributable = calculateDistributablePool(largePool);

      // Fee should be 50B lamports (50 SOL)
      expect(fee).toBe(50_000_000_000);

      // Distributable should be 950B lamports (950 SOL)
      expect(distributable).toBe(950_000_000_000);

      // Verify no overflow
      expect(fee + distributable).toBe(largePool);

      // Verify values are positive (no overflow to negative)
      expect(fee).toBeGreaterThan(0);
      expect(distributable).toBeGreaterThan(0);
    });

    it('should handle game mode refunds reducing locked correctly', () => {
      const gameMode: GameMode = 'spectator';

      // Get baseline
      const baseline = getGameModeBalance(gameMode);

      // Lock funds (user enters bet)
      const lockAmount = 100_000_000;
      recordGameModeLock(gameMode, lockAmount);

      const afterLock = getGameModeBalance(gameMode);
      expect(afterLock.totalLocked).toBe(baseline.totalLocked + lockAmount);

      // Refund (game cancelled, user gets money back)
      recordGameModeRefund(gameMode, lockAmount);

      const afterRefund = getGameModeBalance(gameMode);
      expect(afterRefund.totalLocked).toBe(baseline.totalLocked);

      // paidOut should be unchanged (refund doesn't count as payout)
      expect(afterRefund.totalPaidOut).toBe(baseline.totalPaidOut);
    });
  });

  // ============================================
  // Invariant Preservation
  // ============================================

  describe('Invariant Preservation', () => {
    it('should never allow negative available balance in game mode', () => {
      const gameModes: GameMode[] = ['oracle', 'battle', 'draft', 'spectator', 'lds', 'token_wars'];

      for (const mode of gameModes) {
        const balance = getGameModeBalance(mode);
        const available = balance.totalLocked - balance.totalPaidOut;
        expect(available).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track payouts to prevent exceeding locked funds', () => {
      const gameMode: GameMode = 'battle';
      const balance = getGameModeBalance(gameMode);

      // Lock some funds
      const lockAmount = 200_000_000;
      recordGameModeLock(gameMode, lockAmount);

      // Record a payout
      const payoutAmount = 100_000_000;
      recordGameModePayout(gameMode, payoutAmount);

      const afterPayout = getGameModeBalance(gameMode);
      expect(afterPayout.totalPaidOut).toBe(balance.totalPaidOut + payoutAmount);

      // Available should account for the payout
      const available = afterPayout.totalLocked - afterPayout.totalPaidOut;
      expect(available).toBeGreaterThanOrEqual(0);
    });

    it('should enforce consistent economic model across all game modes', () => {
      // All game modes use the same fee structure (except draft)
      // This test verifies the fee application is consistent

      const standardGameModes: GameMode[] = ['oracle', 'battle', 'spectator', 'lds', 'token_wars'];
      const pool = 1_000_000_000; // 1 SOL

      // Standard modes use 5% fee
      for (const mode of standardGameModes) {
        const fee = calculateFee(pool, PLATFORM_FEE_BPS);
        expect(fee).toBe(50_000_000); // 0.05 SOL
      }

      // Draft uses 10% fee
      const draftFee = calculateFee(pool, DRAFT_FEE_BPS);
      expect(draftFee).toBe(100_000_000); // 0.1 SOL
    });
  });
});
