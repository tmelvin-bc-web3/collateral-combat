import { v4 as uuidv4 } from 'uuid';
import { Battle, LiveBattle, BattleOdds, SpectatorBet, BetStatus } from '../types';
import { battleManager } from './battleManager';
import { progressionService } from './progressionService';
import { spectatorBetDatabase, SpectatorBetRecord, OddsLockRecord } from '../db/spectatorBetDatabase';
import { balanceService } from './balanceService';
import * as userStatsDb from '../db/userStatsDatabase';

const MIN_BET = 0.01; // Minimum bet in SOL
const MAX_BET = 10; // Maximum bet in SOL
const PLATFORM_FEE_PERCENT = 5; // 5% fee on winnings
const LAMPORTS_PER_SOL = 1_000_000_000;
const ODDS_LOCK_DURATION_MS = 30_000; // 30 seconds

// Response type for odds lock
export interface OddsLockResponse {
  lockId: string;
  battleId: string;
  backedPlayer: string;
  lockedOdds: number;
  amount: number;
  potentialPayout: number;
  expiresAt: number;
}

class SpectatorService {
  private spectators: Map<string, Set<string>> = new Map(); // battleId -> Set of socket ids
  private bets: Map<string, SpectatorBet[]> = new Map(); // battleId -> bets
  private allBets: Map<string, SpectatorBet> = new Map(); // betId -> bet
  private userBets: Map<string, string[]> = new Map(); // walletAddress -> betIds
  private listeners: Set<(event: string, data: any) => void> = new Set();

  constructor() {
    // Subscribe to battle updates to settle bets
    battleManager.subscribe((battle) => {
      if (battle.status === 'completed') {
        // Settle bets asynchronously
        this.settleBets(battle.id).catch(err => {
          console.error(`[SpectatorService] Error settling bets for battle ${battle.id}:`, err);
        });
      }
      // Broadcast spectator battle updates
      this.notifyListeners('spectator_battle_update', this.enrichBattleWithOdds(battle));
    });
  }

  // Add spectator to a battle
  joinSpectate(battleId: string, socketId: string): void {
    const spectators = this.spectators.get(battleId) || new Set();
    spectators.add(socketId);
    this.spectators.set(battleId, spectators);

    const battle = battleManager.getBattle(battleId);
    if (battle) {
      this.notifyListeners('spectator_count', {
        battleId,
        count: spectators.size
      });
    }
  }

  // Remove spectator from a battle
  leaveSpectate(battleId: string, socketId: string): void {
    const spectators = this.spectators.get(battleId);
    if (spectators) {
      spectators.delete(socketId);
      this.notifyListeners('spectator_count', {
        battleId,
        count: spectators.size
      });
    }
  }

  // Get spectator count for a battle
  getSpectatorCount(battleId: string): number {
    return this.spectators.get(battleId)?.size || 0;
  }

  // Get all live battles with odds
  getLiveBattles(): LiveBattle[] {
    const activeBattles = battleManager.getActiveBattles()
      .filter(b => b.status === 'active' && b.players.length === 2);

    return activeBattles.map(battle => this.enrichBattleWithOdds(battle));
  }

  // Enrich battle with odds and spectator info
  private enrichBattleWithOdds(battle: Battle): LiveBattle {
    const odds = this.calculateOdds(battle.id);
    const spectatorCount = this.getSpectatorCount(battle.id);
    const bets = this.bets.get(battle.id) || [];
    const totalBetPool = bets.reduce((sum, bet) => sum + bet.amount, 0);

    // Mark first active battle as featured
    const liveBattles = battleManager.getActiveBattles()
      .filter(b => b.status === 'active' && b.players.length === 2);
    const isFeatured = liveBattles[0]?.id === battle.id;

    return {
      ...battle,
      odds,
      spectatorCount,
      totalBetPool,
      featured: isFeatured
    };
  }

  // Calculate IMPLIED PARIMUTUEL ODDS based on current pool sizes
  // These odds represent what you'd get if you bet now and won
  // Odds = 1 + (opposing_pool / (your_pool + your_bet)) after platform fee
  calculateOdds(battleId: string): BattleOdds | undefined {
    const battle = battleManager.getBattle(battleId);
    if (!battle || battle.players.length < 2) return undefined;

    const player1 = battle.players[0];
    const player2 = battle.players[1];
    const bets = this.bets.get(battleId) || [];

    // Calculate total backed for each player (in SOL)
    const p1Backed = bets
      .filter(b => b.backedPlayer === player1.walletAddress && b.status === 'pending')
      .reduce((sum, b) => sum + b.amount, 0);
    const p2Backed = bets
      .filter(b => b.backedPlayer === player2.walletAddress && b.status === 'pending')
      .reduce((sum, b) => sum + b.amount, 0);

    const totalPool = p1Backed + p2Backed;

    // Calculate implied parimutuel odds
    // If you bet on P1: your payout = bet + (p2Pool × (1-fee) × bet / p1Pool)
    // Implied odds = payout / bet = 1 + (p2Pool × (1-fee) / p1Pool)
    // We use a hypothetical small bet (0.01 SOL) to estimate odds
    const hypotheticalBet = 0.01;
    const feeMultiplier = 1 - PLATFORM_FEE_PERCENT / 100; // 0.95 for 5% fee

    let p1Odds: number;
    let p2Odds: number;

    if (totalPool === 0) {
      // No bets yet - show even odds
      p1Odds = 2.0;
      p2Odds = 2.0;
    } else if (p1Backed === 0) {
      // No bets on P1 yet - betting on P1 gets the entire P2 pool
      p1Odds = 1 + (p2Backed * feeMultiplier / hypotheticalBet);
      p1Odds = Math.min(10.0, p1Odds); // Cap at 10x for display
      p2Odds = 1.0; // Betting on P2 when no one is on P1 = no profit (only get your bet back)
    } else if (p2Backed === 0) {
      // No bets on P2 yet - betting on P2 gets the entire P1 pool
      p1Odds = 1.0;
      p2Odds = 1 + (p1Backed * feeMultiplier / hypotheticalBet);
      p2Odds = Math.min(10.0, p2Odds);
    } else {
      // Normal case - both sides have bets
      // P1 odds: if P1 wins, P1 bettors split P2's pool
      p1Odds = 1 + (p2Backed * feeMultiplier / p1Backed);
      // P2 odds: if P2 wins, P2 bettors split P1's pool
      p2Odds = 1 + (p1Backed * feeMultiplier / p2Backed);

      // Cap odds for display (very lopsided pools can create extreme odds)
      p1Odds = Math.min(10.0, Math.max(1.01, p1Odds));
      p2Odds = Math.min(10.0, Math.max(1.01, p2Odds));
    }

    return {
      battleId,
      player1: {
        wallet: player1.walletAddress,
        odds: Math.round(p1Odds * 100) / 100,
        totalBacked: p1Backed
      },
      player2: {
        wallet: player2.walletAddress,
        odds: Math.round(p2Odds * 100) / 100,
        totalBacked: p2Backed
      },
      totalPool,
      lastUpdated: Date.now()
    };
  }

  // Place a bet using PDA balance
  // NOTE: Free bets are NOT allowed for spectator wagering
  async placeBet(
    battleId: string,
    backedPlayer: string,
    amount: number,
    bettor: string,
    isFreeBet: boolean = false
  ): Promise<SpectatorBet> {
    // Free bets are not allowed for spectator wagering
    if (isFreeBet) {
      throw new Error('Free bets cannot be used for spectator wagering');
    }

    const battle = battleManager.getBattle(battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    if (battle.status !== 'active') {
      throw new Error('Battle is not active');
    }

    if (amount < MIN_BET) {
      throw new Error(`Minimum bet is ${MIN_BET} SOL`);
    }

    if (amount > MAX_BET) {
      throw new Error(`Maximum bet is ${MAX_BET} SOL`);
    }

    // Check if backed player is in the battle
    if (!battle.players.some(p => p.walletAddress === backedPlayer)) {
      throw new Error('Invalid player selection');
    }

    // Cannot bet on yourself
    if (battle.players.some(p => p.walletAddress === bettor)) {
      throw new Error('Cannot bet on your own battle');
    }

    // Calculate bet amount in lamports
    const amountLamports = Math.round(amount * LAMPORTS_PER_SOL);

    // SECURITY: Atomic balance verification and fund locking
    // This prevents TOCTOU race conditions where user could withdraw between check and lock
    let lockResult: { txId: string; newBalance: number };
    try {
      lockResult = await balanceService.verifyAndLockBalance(
        bettor,
        amountLamports,
        'spectator',
        battleId
      );
    } catch (error: any) {
      // Check for insufficient balance error
      if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
        const available = await balanceService.getAvailableBalance(bettor);
        throw new Error(`Insufficient balance. Available: ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL, Need: ${amount} SOL`);
      }
      throw new Error('Failed to lock wager on-chain. Please try again.');
    }

    const lockTx = lockResult.txId;

    // Get current implied odds (for display only - actual payout is parimutuel)
    const odds = this.calculateOdds(battleId);
    const impliedOdds = odds?.player1.wallet === backedPlayer
      ? odds.player1.odds
      : odds?.player2.odds || 2.0;

    // NOTE: potentialPayout is an ESTIMATE based on current pools.
    // Actual payout is calculated at settlement using parimutuel formula:
    // payout = original_bet + (losing_pool × (1-fee) × my_bet / winning_pool)
    const estimatedPayout = amount * impliedOdds;

    const bet: SpectatorBet = {
      id: uuidv4(),
      battleId,
      bettor,
      backedPlayer,
      amount,
      odds: impliedOdds, // Current implied odds (will change as more bets come in)
      potentialPayout: estimatedPayout, // Estimated - actual calculated at settlement
      placedAt: Date.now(),
      status: 'pending',
      lockTx, // Track the lock transaction
    };

    // Store bet in memory
    const battleBets = this.bets.get(battleId) || [];
    battleBets.push(bet);
    this.bets.set(battleId, battleBets);
    this.allBets.set(bet.id, bet);

    // Track user bets
    const userBetIds = this.userBets.get(bettor) || [];
    userBetIds.push(bet.id);
    this.userBets.set(bettor, userBetIds);

    // Persist to database
    const backedPlayerSide = this.getBackedPlayerSide(battle, backedPlayer);
    spectatorBetDatabase.createBet({
      id: bet.id,
      battleId,
      onChainBattleId: battle.onChainBattleId || null,
      bettorWallet: bettor,
      backedPlayer: backedPlayerSide,
      amountLamports,
      oddsAtPlacement: impliedOdds, // Snapshot of implied odds at bet time
      potentialPayoutLamports: Math.round(estimatedPayout * LAMPORTS_PER_SOL), // Estimate
      txSignature: null,
      status: 'pending',
      claimTx: null,
      createdAt: bet.placedAt,
      settledAt: null,
    });

    console.log(`[SpectatorService] Bet placed: ${bettor.slice(0, 8)}... bet ${amount} SOL on ${backedPlayer.slice(0, 8)}... (implied odds: ${impliedOdds}x, parimutuel payout at settlement). Lock TX: ${lockTx.slice(0, 16)}...`);

    // Notify about new bet and updated odds
    this.notifyListeners('bet_placed', bet);
    this.notifyListeners('odds_update', this.calculateOdds(battleId));

    return bet;
  }

  // ================================================
  // NEW: Odds Locking for On-Chain Betting
  // ================================================

  /**
   * Request an odds lock before placing on-chain bet
   * This prevents odds slippage during transaction signing
   * NOTE: Free bets are NOT allowed for spectator wagering
   */
  requestOddsLock(
    battleId: string,
    backedPlayer: string,
    amount: number,
    bettor: string,
    isFreeBet: boolean = false
  ): OddsLockResponse {
    // Free bets are not allowed for spectator wagering
    if (isFreeBet) {
      throw new Error('Free bets cannot be used for spectator wagering');
    }

    const battle = battleManager.getBattle(battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    if (battle.status !== 'active') {
      throw new Error('Battle is not active');
    }

    if (amount < MIN_BET) {
      throw new Error(`Minimum bet is ${MIN_BET} SOL`);
    }

    if (amount > MAX_BET) {
      throw new Error(`Maximum bet is ${MAX_BET} SOL`);
    }

    // Cannot bet on yourself
    if (battle.players.some(p => p.walletAddress === bettor)) {
      throw new Error('Cannot bet on your own battle');
    }

    // Get current odds
    const odds = this.calculateOdds(battleId);
    const playerOdds = odds?.player1.wallet === backedPlayer
      ? odds.player1.odds
      : odds?.player2.odds || 2.0;

    const lockId = uuidv4();
    const now = Date.now();
    const expiresAt = now + ODDS_LOCK_DURATION_MS;
    const potentialPayout = amount * playerOdds * (1 - PLATFORM_FEE_PERCENT / 100);

    // Store lock in database
    const backedPlayerSide = this.getBackedPlayerSide(battle, backedPlayer);
    spectatorBetDatabase.createOddsLock({
      id: lockId,
      battleId,
      backedPlayer: backedPlayerSide,
      amountLamports: Math.round(amount * LAMPORTS_PER_SOL),
      lockedOdds: playerOdds,
      expiresAt,
      used: false,
      createdAt: now,
    });

    console.log(`Odds lock created: ${lockId} for ${amount} SOL @ ${playerOdds}x (expires ${new Date(expiresAt).toISOString()})`);

    return {
      lockId,
      battleId,
      backedPlayer,
      lockedOdds: playerOdds,
      amount,
      potentialPayout,
      expiresAt,
    };
  }

  /**
   * Verify an on-chain bet and record it in the database
   * Called after frontend successfully places bet on-chain
   */
  verifyAndRecordBet(
    lockId: string,
    txSignature: string,
    bettor: string
  ): SpectatorBet | null {
    // Get the odds lock
    const lock = spectatorBetDatabase.getOddsLock(lockId);
    if (!lock) {
      console.error(`[Spectator] Odds lock not found: ${lockId}`);
      return null;
    }

    // Check if lock is expired
    if (Date.now() > lock.expiresAt) {
      console.error(`[Spectator] Odds lock expired: ${lockId}`);
      return null;
    }

    // SECURITY: Atomically mark lock as used - prevents race condition where two
    // concurrent requests could both use the same lock
    // This replaces the old check-then-mark pattern which had a race condition
    const wasMarked = spectatorBetDatabase.markLockUsedAtomic(lockId);
    if (!wasMarked) {
      console.error(`[Spectator] Odds lock already used (atomic check): ${lockId}`);
      return null;
    }

    const battle = battleManager.getBattle(lock.battleId);
    const backedPlayerWallet = this.getWalletFromSide(battle, lock.backedPlayer);
    const amount = lock.amountLamports / LAMPORTS_PER_SOL;
    const potentialPayout = amount * lock.lockedOdds * (1 - PLATFORM_FEE_PERCENT / 100);

    // Create bet record
    const betId = uuidv4();
    const now = Date.now();

    spectatorBetDatabase.createBet({
      id: betId,
      battleId: lock.battleId,
      onChainBattleId: battle?.onChainBattleId || null,
      bettorWallet: bettor,
      backedPlayer: lock.backedPlayer,
      amountLamports: lock.amountLamports,
      oddsAtPlacement: lock.lockedOdds,
      potentialPayoutLamports: Math.round(potentialPayout * LAMPORTS_PER_SOL),
      txSignature,
      status: 'pending',
      claimTx: null,
      createdAt: now,
      settledAt: null,
    });

    // Create in-memory bet for real-time updates
    const bet: SpectatorBet = {
      id: betId,
      battleId: lock.battleId,
      bettor,
      backedPlayer: backedPlayerWallet || '',
      amount,
      odds: lock.lockedOdds,
      potentialPayout,
      placedAt: now,
      status: 'pending',
    };

    // Store in memory
    const battleBets = this.bets.get(lock.battleId) || [];
    battleBets.push(bet);
    this.bets.set(lock.battleId, battleBets);
    this.allBets.set(betId, bet);

    const userBetIds = this.userBets.get(bettor) || [];
    userBetIds.push(betId);
    this.userBets.set(bettor, userBetIds);

    console.log(`Verified bet: ${bettor} bet ${amount} SOL @ ${lock.lockedOdds}x (tx: ${txSignature.slice(0, 8)}...)`);

    // Notify
    this.notifyListeners('bet_placed', bet);
    this.notifyListeners('odds_update', this.calculateOdds(lock.battleId));

    return bet;
  }

  /**
   * Get unclaimed winning bets for a wallet
   */
  getUnclaimedWins(walletAddress: string): SpectatorBet[] {
    const records = spectatorBetDatabase.getUnclaimedWins(walletAddress);
    return records.map(r => this.recordToBet(r));
  }

  /**
   * Get a bet by ID (for ownership verification)
   */
  getBet(betId: string): SpectatorBet | null {
    // First check in-memory cache
    const memBet = this.allBets.get(betId);
    if (memBet) return memBet;

    // Fall back to database
    const dbRecord = spectatorBetDatabase.getBet(betId);
    if (dbRecord) return this.recordToBet(dbRecord);

    return null;
  }

  /**
   * Mark a bet as claimed after on-chain claim
   */
  markBetClaimed(betId: string, claimTx: string): void {
    spectatorBetDatabase.markClaimed(betId, claimTx);

    // Update in-memory
    const bet = this.allBets.get(betId);
    if (bet) {
      bet.status = 'won'; // Already won, just claimed
    }

    console.log(`Bet ${betId} claimed (tx: ${claimTx.slice(0, 8)}...)`);
  }

  // Helper to get backed player side ('creator' or 'opponent')
  private getBackedPlayerSide(battle: Battle | undefined, backedPlayerWallet: string): 'creator' | 'opponent' {
    if (!battle) return 'creator';
    return battle.players[0]?.walletAddress === backedPlayerWallet ? 'creator' : 'opponent';
  }

  // Helper to get wallet from side
  private getWalletFromSide(battle: Battle | undefined, side: 'creator' | 'opponent'): string | null {
    if (!battle) return null;
    return side === 'creator' ? battle.players[0]?.walletAddress : battle.players[1]?.walletAddress;
  }

  // Convert database record to SpectatorBet
  private recordToBet(record: SpectatorBetRecord): SpectatorBet {
    const battle = battleManager.getBattle(record.battleId);
    const backedPlayerWallet = this.getWalletFromSide(battle, record.backedPlayer);

    return {
      id: record.id,
      battleId: record.battleId,
      bettor: record.bettorWallet,
      backedPlayer: backedPlayerWallet || '',
      amount: record.amountLamports / LAMPORTS_PER_SOL,
      odds: record.oddsAtPlacement,
      potentialPayout: record.potentialPayoutLamports / LAMPORTS_PER_SOL,
      placedAt: record.createdAt,
      status: record.status as BetStatus,
      settledAt: record.settledAt || undefined,
    };
  }

  // Settle all bets for a completed battle using PARIMUTUEL model
  // Losers fund winners - mathematically guarantees solvency
  private async settleBets(battleId: string): Promise<void> {
    const battle = battleManager.getBattle(battleId);
    if (!battle || !battle.winnerId) return;

    const now = Date.now();
    const winnerSide = this.getBackedPlayerSide(battle, battle.winnerId);

    // Gather ALL bets (in-memory + database-only)
    const memoryBets = this.bets.get(battleId) || [];
    const dbBets = spectatorBetDatabase.getPendingBets(battleId);

    // Combine into unified list, avoiding duplicates
    interface UnifiedBet {
      id: string;
      bettor: string;
      amountLamports: number;
      backedSide: 'creator' | 'opponent';
      isMemoryBet: boolean;
    }

    const allBets: UnifiedBet[] = [];

    // Add memory bets
    for (const bet of memoryBets.filter(b => b.status === 'pending')) {
      const backedSide = this.getBackedPlayerSide(battle, bet.backedPlayer);
      allBets.push({
        id: bet.id,
        bettor: bet.bettor,
        amountLamports: Math.round(bet.amount * LAMPORTS_PER_SOL),
        backedSide,
        isMemoryBet: true,
      });
    }

    // Add database-only bets (not in memory)
    for (const dbBet of dbBets) {
      if (!this.allBets.has(dbBet.id)) {
        allBets.push({
          id: dbBet.id,
          bettor: dbBet.bettorWallet,
          amountLamports: dbBet.amountLamports,
          backedSide: dbBet.backedPlayer,
          isMemoryBet: false,
        });
      }
    }

    if (allBets.length === 0) {
      console.log(`[SpectatorService] No bets to settle for battle ${battleId}`);
      return;
    }

    // Calculate pools
    const winningBets = allBets.filter(b => b.backedSide === winnerSide);
    const losingBets = allBets.filter(b => b.backedSide !== winnerSide);

    const winningPool = winningBets.reduce((sum, b) => sum + b.amountLamports, 0);
    const losingPool = losingBets.reduce((sum, b) => sum + b.amountLamports, 0);

    // Platform takes fee from losing pool only
    const platformFeeLamports = Math.floor(losingPool * PLATFORM_FEE_PERCENT / 100);
    const distributablePool = losingPool - platformFeeLamports;

    console.log(`[SpectatorService] Settling battle ${battleId}:`);
    console.log(`  Winner: ${winnerSide}, Winning pool: ${winningPool / LAMPORTS_PER_SOL} SOL (${winningBets.length} bets)`);
    console.log(`  Losing pool: ${losingPool / LAMPORTS_PER_SOL} SOL (${losingBets.length} bets)`);
    console.log(`  Platform fee: ${platformFeeLamports / LAMPORTS_PER_SOL} SOL, Distributable: ${distributablePool / LAMPORTS_PER_SOL} SOL`);

    // Process losing bets first (just update status, funds already locked)
    for (const bet of losingBets) {
      spectatorBetDatabase.updateBetStatus(bet.id, 'lost', now);

      // Update in-memory if exists
      const memBet = this.allBets.get(bet.id);
      if (memBet) {
        memBet.status = 'lost';
        memBet.settledAt = now;
      }

      const amountSol = bet.amountLamports / LAMPORTS_PER_SOL;
      console.log(`[SpectatorService] Bet lost: ${bet.bettor.slice(0, 8)}... lost ${amountSol.toFixed(4)} SOL`);

      // Award XP for participation
      const xpAmount = 10 + Math.floor(amountSol * 0.02);
      progressionService.awardXp(bet.bettor, xpAmount, 'spectator', battleId, 'Spectator bet');

      // Record wager
      try {
        userStatsDb.recordWager(bet.bettor, 'spectator', amountSol, 'lost', -amountSol, battleId);
      } catch (error) {
        console.error(`[SpectatorService] Failed to record wager for ${bet.bettor}:`, error);
      }

      this.notifyListeners('bet_settled', { id: bet.id, status: 'lost', bettor: bet.bettor });
    }

    // Process winning bets with parimutuel payout
    for (const bet of winningBets) {
      // PARIMUTUEL CALCULATION:
      // payout = original_bet + (distributable_pool × my_bet / winning_pool)
      const share = winningPool > 0 ? bet.amountLamports / winningPool : 0;
      const winningsFromLosers = Math.floor(distributablePool * share);
      const totalPayoutLamports = bet.amountLamports + winningsFromLosers;

      spectatorBetDatabase.updateBetStatus(bet.id, 'won', now);

      // Update in-memory if exists
      const memBet = this.allBets.get(bet.id);
      if (memBet) {
        memBet.status = 'won';
        memBet.settledAt = now;
        memBet.potentialPayout = totalPayoutLamports / LAMPORTS_PER_SOL; // Update with actual payout
      }

      // Credit winnings to PDA balance
      const tx = await balanceService.creditWinnings(bet.bettor, totalPayoutLamports, 'spectator', battleId);

      const amountSol = bet.amountLamports / LAMPORTS_PER_SOL;
      const payoutSol = totalPayoutLamports / LAMPORTS_PER_SOL;
      const profitSol = payoutSol - amountSol;

      if (tx) {
        console.log(`[SpectatorService] Bet won: ${bet.bettor.slice(0, 8)}... bet ${amountSol.toFixed(4)} SOL, payout ${payoutSol.toFixed(4)} SOL (+${profitSol.toFixed(4)} profit)`);
      } else {
        console.error(`[SpectatorService] Failed to credit winnings for bet ${bet.id}`);
      }

      // Award XP for winning
      const xpAmount = 30 + Math.floor(amountSol * 0.1);
      progressionService.awardXp(bet.bettor, xpAmount, 'spectator', battleId, 'Won spectator bet');

      // Record wager
      try {
        userStatsDb.recordWager(bet.bettor, 'spectator', amountSol, 'won', profitSol, battleId);
      } catch (error) {
        console.error(`[SpectatorService] Failed to record wager for ${bet.bettor}:`, error);
      }

      this.notifyListeners('bet_settled', { id: bet.id, status: 'won', bettor: bet.bettor, payout: payoutSol });
    }

    // Handle edge case: all bets on one side (no losers)
    if (losingBets.length === 0 && winningBets.length > 0) {
      console.log(`[SpectatorService] All bets were on the winner - returning original amounts (no profit)`);
    }

    console.log(`[SpectatorService] Settlement complete for battle ${battleId}`);
  }

  // Get user's bets
  getUserBets(walletAddress: string): SpectatorBet[] {
    const betIds = this.userBets.get(walletAddress) || [];
    return betIds
      .map(id => this.allBets.get(id))
      .filter((bet): bet is SpectatorBet => bet !== undefined)
      .sort((a, b) => b.placedAt - a.placedAt);
  }

  // Subscribe to spectator events
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }
}

// Singleton instance
export const spectatorService = new SpectatorService();
