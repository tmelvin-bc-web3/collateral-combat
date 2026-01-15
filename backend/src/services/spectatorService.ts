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

  // Calculate dynamic odds based on current P&L and betting
  calculateOdds(battleId: string): BattleOdds | undefined {
    const battle = battleManager.getBattle(battleId);
    if (!battle || battle.players.length < 2) return undefined;

    const player1 = battle.players[0];
    const player2 = battle.players[1];
    const bets = this.bets.get(battleId) || [];

    // Calculate total backed for each player
    const p1Backed = bets
      .filter(b => b.backedPlayer === player1.walletAddress && b.status === 'pending')
      .reduce((sum, b) => sum + b.amount, 0);
    const p2Backed = bets
      .filter(b => b.backedPlayer === player2.walletAddress && b.status === 'pending')
      .reduce((sum, b) => sum + b.amount, 0);

    // Calculate odds based on P&L differential and betting amounts
    const p1Pnl = player1.account.totalPnlPercent;
    const p2Pnl = player2.account.totalPnlPercent;
    const pnlDiff = p1Pnl - p2Pnl;

    // Base odds calculation:
    // If player has higher P&L, they have lower odds (more likely to win)
    // Odds range from 1.1x (heavy favorite) to 5x (underdog)
    let p1BaseOdds = 2.0;
    let p2BaseOdds = 2.0;

    if (Math.abs(pnlDiff) > 1) {
      // Adjust odds based on P&L difference
      // Every 5% difference shifts odds by 0.3
      const shift = Math.min(0.9, Math.abs(pnlDiff) * 0.06);
      if (pnlDiff > 0) {
        // Player 1 is winning
        p1BaseOdds = Math.max(1.1, 2.0 - shift);
        p2BaseOdds = Math.min(5.0, 2.0 + shift);
      } else {
        // Player 2 is winning
        p1BaseOdds = Math.min(5.0, 2.0 + shift);
        p2BaseOdds = Math.max(1.1, 2.0 - shift);
      }
    }

    // Adjust for betting amounts (if one side heavily bet, odds shift)
    const totalBacked = p1Backed + p2Backed;
    if (totalBacked > 0) {
      const p1Ratio = p1Backed / totalBacked;
      const betShift = (p1Ratio - 0.5) * 0.4; // Max 0.2 shift from betting
      p1BaseOdds = Math.max(1.1, Math.min(5.0, p1BaseOdds - betShift));
      p2BaseOdds = Math.max(1.1, Math.min(5.0, p2BaseOdds + betShift));
    }

    return {
      battleId,
      player1: {
        wallet: player1.walletAddress,
        odds: Math.round(p1BaseOdds * 100) / 100,
        totalBacked: p1Backed
      },
      player2: {
        wallet: player2.walletAddress,
        odds: Math.round(p2BaseOdds * 100) / 100,
        totalBacked: p2Backed
      },
      totalPool: totalBacked,
      lastUpdated: Date.now()
    };
  }

  // Place a bet using PDA balance
  async placeBet(
    battleId: string,
    backedPlayer: string,
    amount: number,
    bettor: string
  ): Promise<SpectatorBet> {
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

    // Check PDA balance
    const hasSufficient = await balanceService.hasSufficientBalance(bettor, amountLamports);
    if (!hasSufficient) {
      const available = await balanceService.getAvailableBalance(bettor);
      throw new Error(`Insufficient balance. Available: ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL, Need: ${amount} SOL`);
    }

    // Create pending debit
    const pendingId = await balanceService.debitPending(bettor, amountLamports, 'spectator', battleId);

    // Get current odds
    const odds = this.calculateOdds(battleId);
    const playerOdds = odds?.player1.wallet === backedPlayer
      ? odds.player1.odds
      : odds?.player2.odds || 2.0;

    const bet: SpectatorBet = {
      id: uuidv4(),
      battleId,
      bettor,
      backedPlayer,
      amount,
      odds: playerOdds,
      potentialPayout: amount * playerOdds * (1 - PLATFORM_FEE_PERCENT / 100),
      placedAt: Date.now(),
      status: 'pending'
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
      oddsAtPlacement: playerOdds,
      potentialPayoutLamports: Math.round(bet.potentialPayout * LAMPORTS_PER_SOL),
      txSignature: null,
      status: 'pending',
      claimTx: null,
      createdAt: bet.placedAt,
      settledAt: null,
    });

    // Confirm the debit
    balanceService.confirmDebit(pendingId);

    console.log(`[SpectatorService] Bet placed: ${bettor} bet ${amount} SOL on ${backedPlayer.slice(0, 8)}... @ ${playerOdds}x`);

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
   */
  requestOddsLock(
    battleId: string,
    backedPlayer: string,
    amount: number,
    bettor: string
  ): OddsLockResponse {
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

    // Check if lock is already used
    if (lock.used) {
      console.error(`[Spectator] Odds lock already used: ${lockId}`);
      return null;
    }

    // Mark lock as used
    spectatorBetDatabase.markLockUsed(lockId);

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

  // Settle all bets for a completed battle
  private async settleBets(battleId: string): Promise<void> {
    const battle = battleManager.getBattle(battleId);
    if (!battle || !battle.winnerId) return;

    const now = Date.now();

    // Settle in-memory bets
    const bets = this.bets.get(battleId) || [];
    const pendingBets = bets.filter(b => b.status === 'pending');

    for (const bet of pendingBets) {
      const isWinner = bet.backedPlayer === battle.winnerId;
      const newStatus: BetStatus = isWinner ? 'won' : 'lost';

      bet.status = newStatus;
      bet.settledAt = now;

      // Update database
      spectatorBetDatabase.updateBetStatus(bet.id, newStatus, now);

      if (isWinner) {
        // Credit winnings to PDA balance
        const payoutLamports = Math.round(bet.potentialPayout * LAMPORTS_PER_SOL);
        const tx = await balanceService.creditWinnings(bet.bettor, payoutLamports, 'spectator', battleId);
        if (tx) {
          console.log(`[SpectatorService] Bet won: ${bet.bettor} credited ${bet.potentialPayout.toFixed(4)} SOL (tx: ${tx.slice(0, 8)}...)`);
        } else {
          console.error(`[SpectatorService] Failed to credit winnings for bet ${bet.id}`);
        }

        // Award XP for winning spectator bet: 30 XP + (bet × 0.1)
        const xpAmount = 30 + Math.floor(bet.amount * 0.1);
        progressionService.awardXp(
          bet.bettor,
          xpAmount,
          'spectator',
          battleId,
          'Won spectator bet'
        );
      } else {
        console.log(`[SpectatorService] Bet lost: ${bet.bettor} lost ${bet.amount} SOL`);

        // Award XP for losing spectator bet: 10 XP + (bet × 0.02)
        const xpAmount = 10 + Math.floor(bet.amount * 0.02);
        progressionService.awardXp(
          bet.bettor,
          xpAmount,
          'spectator',
          battleId,
          'Spectator bet'
        );
      }

      // Record to user_wagers for win verification
      const profitLoss = isWinner ? (bet.potentialPayout - bet.amount) : -bet.amount;
      try {
        userStatsDb.recordWager(
          bet.bettor,
          'spectator',
          bet.amount,
          isWinner ? 'won' : 'lost',
          profitLoss,
          battleId
        );
      } catch (error) {
        console.error(`[SpectatorService] Failed to record wager for ${bet.bettor}:`, error);
      }

      this.notifyListeners('bet_settled', bet);
    }

    // Also settle any database-only bets (from on-chain flow)
    const dbBets = spectatorBetDatabase.getPendingBets(battleId);
    const winnerSide = this.getBackedPlayerSide(battle, battle.winnerId);

    for (const dbBet of dbBets) {
      // Skip if already processed in memory
      if (this.allBets.has(dbBet.id)) continue;

      const isWinner = dbBet.backedPlayer === winnerSide;
      spectatorBetDatabase.updateBetStatus(dbBet.id, isWinner ? 'won' : 'lost', now);

      // Credit winnings for database-only bets too
      if (isWinner) {
        const payoutLamports = dbBet.potentialPayoutLamports;
        await balanceService.creditWinnings(dbBet.bettorWallet, payoutLamports, 'spectator', battleId);
      }

      // Record to user_wagers for win verification
      const amountSol = dbBet.amountLamports / LAMPORTS_PER_SOL;
      const payoutSol = dbBet.potentialPayoutLamports / LAMPORTS_PER_SOL;
      const profitLoss = isWinner ? (payoutSol - amountSol) : -amountSol;
      try {
        userStatsDb.recordWager(
          dbBet.bettorWallet,
          'spectator',
          amountSol,
          isWinner ? 'won' : 'lost',
          profitLoss,
          battleId
        );
      } catch (error) {
        console.error(`[SpectatorService] Failed to record db wager for ${dbBet.bettorWallet}:`, error);
      }
    }
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
