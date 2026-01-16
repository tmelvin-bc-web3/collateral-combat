// LDS (Last Degen Standing) Manager
// Battle royale elimination game where players predict SOL up/down
// Wrong prediction = eliminated, last player standing wins

import {
  createGame,
  getGame,
  getActiveGame,
  getRegisteringGame,
  startGame,
  endGame,
  updateGameStatus,
  updateGameRound,
  addPlayer,
  getPlayer,
  getPlayers,
  getAlivePlayers,
  getAlivePlayerCount,
  eliminatePlayer,
  setPlayerPayout,
  setPlayerWinner,
  removePlayer,
  isPlayerInAnyActiveGame,
  getPlayerActiveGame,
  createRound,
  getRound,
  getCurrentRound,
  resolveRound,
  recordPrediction,
  getPrediction,
  getPredictions,
  updatePredictionResult,
  getLeaderboard,
  getPlayerStats,
  getRecentGames,
  getPlayerHistory,
  LDSGameRecord,
  LDSPlayerRecord,
  LDSRoundRecord,
  LDSPrediction,
  LDSRoundResult,
  LDSGameStatus,
  LDSLeaderboardEntry,
} from '../db/ldsDatabase';
import { balanceService } from './balanceService';
import { priceService } from './priceService';
import { addFreeBetCredit } from '../db/progressionDatabase';
import { pythVerificationService } from './pythVerificationService';

import crypto from 'crypto';

// Lamports per SOL
const LAMPORTS_PER_SOL = 1_000_000_000;

// Retry configuration for payouts
const PAYOUT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// Failed payout tracking for manual recovery
interface FailedPayout {
  gameId: string;
  walletAddress: string;
  amountLamports: number;
  reason: string;
  timestamp: number;
  retryCount: number;
  isFreeBet?: boolean;
}

// In-memory queue for failed payouts (would be persisted in production)
const failedPayouts: FailedPayout[] = [];

/**
 * Validate Solana wallet address format
 * Base58 encoded, 32-44 characters
 */
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  // Solana addresses are base58 encoded, typically 32-44 characters
  // Base58 alphabet (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Game configuration
const CONFIG = {
  // Entry fee in SOL
  ENTRY_FEE_SOL: 0.1,
  // Entry fee in lamports
  ENTRY_FEE_LAMPORTS: 0.1 * LAMPORTS_PER_SOL,
  // Rake percentage
  RAKE_PERCENT: 5,
  // Max players per game
  MAX_PLAYERS: 50,
  // Min players to start (otherwise refund)
  MIN_PLAYERS: 3,
  // Game interval in minutes
  GAME_INTERVAL_MINUTES: 10,
  // Round duration in seconds
  ROUND_DURATION_SECONDS: 30,
  // Prediction window in seconds (players can predict during this time)
  PREDICTION_WINDOW_SECONDS: 25,
  // Max rounds before stalemate split
  MAX_ROUNDS: 15,
};

// Payout tiers based on player count
// Structure: { minPlayers, maxPlayers, payouts: [1st%, 2nd%, 3rd%, ...] }
const PAYOUT_TIERS = [
  { minPlayers: 3, maxPlayers: 9, payouts: [100] }, // Winner takes all for small games
  { minPlayers: 10, maxPlayers: 19, payouts: [60, 25, 15] }, // Top 3
  { minPlayers: 20, maxPlayers: 34, payouts: [45, 25, 15, 10, 5] }, // Top 5
  { minPlayers: 35, maxPlayers: 50, payouts: [35, 20, 15, 10, 8, 7, 5] }, // Top 7
];

// Event types for WebSocket notifications
export type LDSEventType =
  | 'game_created'
  | 'player_joined'
  | 'player_left'
  | 'game_starting'
  | 'game_started'
  | 'round_started'
  | 'prediction_submitted'
  | 'round_resolved'
  | 'player_eliminated'
  | 'game_ended'
  | 'game_cancelled';

export interface LDSEvent {
  type: LDSEventType;
  gameId: string;
  data: any;
  timestamp: number;
}

// Game state for WebSocket updates
export interface LDSGameState {
  game: LDSGameRecord;
  players: LDSPlayerRecord[];
  currentRound: LDSRoundRecord | null;
  alivePlayers: number;
  timeRemaining: number;
  phase: 'registering' | 'starting' | 'predicting' | 'resolving' | 'completed' | 'cancelled';
}

class LDSManager {
  private eventListeners: Set<(event: LDSEvent) => void> = new Set();
  private gameTimers: Map<string, NodeJS.Timeout> = new Map();
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();
  private schedulerTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  // In-memory cache for quick access
  private activeGameId: string | null = null;

  constructor() {
    // Don't auto-initialize - let the main app call initialize()
  }

  /**
   * Initialize the manager and start the game scheduler
   */
  initialize(): void {
    if (this.initialized) {
      console.log('[LDS] Manager already initialized');
      return;
    }

    // Check for any active games from previous server instance
    const activeGame = getActiveGame();
    if (activeGame) {
      this.activeGameId = activeGame.id;
      console.log(`[LDS] Resuming active game: ${activeGame.id} (status: ${activeGame.status})`);

      // Resume game based on its status
      if (activeGame.status === 'in_progress') {
        this.resumeInProgressGame(activeGame);
      } else if (activeGame.status === 'registering') {
        this.scheduleGameStart(activeGame);
      }
    }

    // Start the game scheduler
    this.startScheduler();
    this.initialized = true;
    console.log('[LDS] Manager initialized');
  }

  /**
   * Start the periodic game scheduler
   */
  private startScheduler(): void {
    // Schedule next game if there isn't one
    this.ensureUpcomingGame();

    // Check every minute for games that need to start
    this.schedulerTimer = setInterval(() => {
      this.processScheduledGames();
    }, 60_000);

    console.log('[LDS] Game scheduler started');
  }

  /**
   * Ensure there's always an upcoming game scheduled
   */
  private ensureUpcomingGame(): void {
    const registering = getRegisteringGame();
    if (!registering) {
      // Schedule next game
      const nextStartTime = this.getNextGameStartTime();
      this.createScheduledGame(nextStartTime);
    }
  }

  /**
   * Get the next game start time (aligned to 10-minute intervals)
   */
  private getNextGameStartTime(): number {
    const now = Date.now();
    const intervalMs = CONFIG.GAME_INTERVAL_MINUTES * 60 * 1000;
    // Round up to next interval
    return Math.ceil(now / intervalMs) * intervalMs;
  }

  /**
   * Create a scheduled game
   */
  private createScheduledGame(scheduledStartTime: number): LDSGameRecord {
    const game = createGame(CONFIG.ENTRY_FEE_LAMPORTS, scheduledStartTime);
    console.log(`[LDS] Created scheduled game ${game.id} starting at ${new Date(scheduledStartTime).toISOString()}`);

    this.scheduleGameStart(game);
    this.emitEvent({
      type: 'game_created',
      gameId: game.id,
      data: { game },
      timestamp: Date.now(),
    });

    return game;
  }

  /**
   * Schedule a game to start at its scheduled time
   */
  private scheduleGameStart(game: LDSGameRecord): void {
    const now = Date.now();
    const delay = Math.max(0, game.scheduledStartTime - now);

    const timer = setTimeout(() => {
      this.handleGameStart(game.id);
    }, delay);

    this.gameTimers.set(game.id, timer);
    console.log(`[LDS] Game ${game.id} scheduled to start in ${Math.round(delay / 1000)}s`);
  }

  /**
   * Process scheduled games (called every minute)
   */
  private processScheduledGames(): void {
    this.ensureUpcomingGame();
  }

  /**
   * Handle game start
   */
  private async handleGameStart(gameId: string): Promise<void> {
    const game = getGame(gameId);
    if (!game || game.status !== 'registering') {
      console.log(`[LDS] Game ${gameId} not in registering state, skipping start`);
      return;
    }

    const players = getPlayers(gameId);

    // Check minimum players
    if (players.length < CONFIG.MIN_PLAYERS) {
      console.log(`[LDS] Game ${gameId} has only ${players.length} players (min: ${CONFIG.MIN_PLAYERS}), cancelling`);
      await this.cancelGame(gameId, 'Insufficient players');
      return;
    }

    // Transition to starting state briefly
    updateGameStatus(gameId, 'starting');
    this.emitEvent({
      type: 'game_starting',
      gameId,
      data: { playerCount: players.length },
      timestamp: Date.now(),
    });

    // Small delay for UI to show "starting" state
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start the game
    startGame(gameId);
    this.activeGameId = gameId;

    this.emitEvent({
      type: 'game_started',
      gameId,
      data: {
        game: getGame(gameId),
        players: players.length,
        totalRounds: CONFIG.MAX_ROUNDS,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] Game ${gameId} started with ${players.length} players`);

    // Start first round
    await this.startNextRound(gameId);

    // Ensure next game is scheduled
    this.ensureUpcomingGame();
  }

  /**
   * Start the next round
   */
  private async startNextRound(gameId: string): Promise<void> {
    const game = getGame(gameId);
    if (!game || game.status !== 'in_progress') {
      console.log(`[LDS] Cannot start round for game ${gameId} (status: ${game?.status})`);
      return;
    }

    const aliveCount = getAlivePlayerCount(gameId);

    // Check for winner (only 1 player left)
    if (aliveCount <= 1) {
      await this.endGameWithWinner(gameId);
      return;
    }

    // Check for stalemate (max rounds reached)
    if (game.currentRound >= CONFIG.MAX_ROUNDS) {
      await this.endGameStalemate(gameId);
      return;
    }

    const roundNumber = game.currentRound + 1;
    const startPrice = priceService.getPrice('SOL');

    if (startPrice === 0) {
      console.error(`[LDS] Cannot get SOL price for game ${gameId}, waiting...`);
      // Retry in 5 seconds
      setTimeout(() => this.startNextRound(gameId), 5000);
      return;
    }

    const now = Date.now();
    const predictionDeadline = now + CONFIG.PREDICTION_WINDOW_SECONDS * 1000;

    const round = createRound(gameId, roundNumber, startPrice, aliveCount, predictionDeadline);
    updateGameRound(gameId, roundNumber);

    // Record Pyth-verified price for audit trail
    pythVerificationService.recordPriceAudit('lds', gameId, 'round_start', 'SOL', startPrice)
      .catch(err => console.error('[LDS] Pyth audit failed:', err));

    this.emitEvent({
      type: 'round_started',
      gameId,
      data: {
        round,
        alivePlayers: aliveCount,
        predictionDeadline,
        roundDuration: CONFIG.ROUND_DURATION_SECONDS,
        predictionWindow: CONFIG.PREDICTION_WINDOW_SECONDS,
      },
      timestamp: now,
    });

    console.log(`[LDS] Game ${gameId} round ${roundNumber} started. Price: $${startPrice.toFixed(2)}, ${aliveCount} players alive`);

    // Set timer to resolve round after duration
    const timer = setTimeout(() => {
      this.resolveCurrentRound(gameId);
    }, CONFIG.ROUND_DURATION_SECONDS * 1000);

    this.roundTimers.set(gameId, timer);
  }

  /**
   * Submit a prediction for the current round
   */
  async submitPrediction(
    gameId: string,
    walletAddress: string,
    prediction: LDSPrediction
  ): Promise<{ success: boolean; error?: string }> {
    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    const game = getGame(gameId);
    if (!game || game.status !== 'in_progress') {
      return { success: false, error: 'Game not in progress' };
    }

    const player = getPlayer(gameId, walletAddress);
    if (!player) {
      return { success: false, error: 'Not in this game' };
    }

    if (player.status !== 'alive') {
      return { success: false, error: 'You have been eliminated' };
    }

    const round = getCurrentRound(gameId);
    if (!round) {
      return { success: false, error: 'No active round' };
    }

    const now = Date.now();
    if (now > round.predictionDeadline) {
      return { success: false, error: 'Prediction window closed' };
    }

    // Record the prediction (upsert to allow changing during window)
    recordPrediction(gameId, round.roundNumber, walletAddress, prediction);

    this.emitEvent({
      type: 'prediction_submitted',
      gameId,
      data: {
        roundNumber: round.roundNumber,
        walletAddress,
        // Don't reveal the actual prediction to other players
      },
      timestamp: now,
    });

    console.log(`[LDS] ${walletAddress.slice(0, 8)}... predicted ${prediction} in game ${gameId} round ${round.roundNumber}`);
    return { success: true };
  }

  /**
   * Resolve the current round
   */
  private async resolveCurrentRound(gameId: string): Promise<void> {
    const game = getGame(gameId);
    if (!game || game.status !== 'in_progress') {
      console.log(`[LDS] Cannot resolve round for game ${gameId} (status: ${game?.status})`);
      return;
    }

    const round = getCurrentRound(gameId);
    if (!round || round.resolvedAt !== null) {
      console.log(`[LDS] No unresolved round for game ${gameId}`);
      return;
    }

    // Get end price
    const endPrice = priceService.getPrice('SOL');
    if (endPrice === 0) {
      console.error(`[LDS] Cannot get SOL price for round resolution, retrying...`);
      setTimeout(() => this.resolveCurrentRound(gameId), 2000);
      return;
    }

    // Record Pyth-verified price for audit trail
    pythVerificationService.recordPriceAudit('lds', gameId, 'round_end', 'SOL', endPrice)
      .catch(err => console.error('[LDS] Pyth audit failed:', err));

    // Determine round result
    let result: LDSRoundResult;
    if (endPrice > round.startPrice) {
      result = 'up';
    } else if (endPrice < round.startPrice) {
      result = 'down';
    } else {
      // Price unchanged - use deterministic hash for tie-breaking (very rare)
      // This is unpredictable to players but reproducible and not dependent on weak PRNG
      result = this.deterministicTieBreak(gameId, round.roundNumber, round.startPrice, endPrice);
    }

    // Get all alive players and their predictions
    const alivePlayers = getAlivePlayers(gameId);
    const predictions = getPredictions(gameId, round.roundNumber);
    const eliminatedWallets: string[] = [];

    // Process each alive player
    for (const player of alivePlayers) {
      const pred = predictions.find(p => p.walletAddress === player.walletAddress);
      const playerPrediction = pred?.prediction;

      // Player is eliminated if:
      // 1. They didn't predict (auto-eliminate)
      // 2. Their prediction was wrong
      const correct = playerPrediction === result;
      const eliminated = !playerPrediction || !correct;

      // Update prediction result in database
      if (pred) {
        updatePredictionResult(gameId, round.roundNumber, player.walletAddress, correct, eliminated);
      }

      if (eliminated) {
        eliminatePlayer(gameId, player.walletAddress, round.roundNumber);
        eliminatedWallets.push(player.walletAddress);
        console.log(`[LDS] ${player.walletAddress.slice(0, 8)}... eliminated in round ${round.roundNumber} (predicted: ${playerPrediction || 'nothing'}, result: ${result})`);
      }
    }

    // Update round with results
    const aliveAfter = getAlivePlayerCount(gameId);
    resolveRound(gameId, round.roundNumber, endPrice, result, aliveAfter);

    // Clear round timer
    const timer = this.roundTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(gameId);
    }

    this.emitEvent({
      type: 'round_resolved',
      gameId,
      data: {
        roundNumber: round.roundNumber,
        startPrice: round.startPrice,
        endPrice,
        result,
        eliminatedCount: eliminatedWallets.length,
        eliminatedWallets,
        aliveBefore: round.playersAliveBefore,
        aliveAfter,
      },
      timestamp: Date.now(),
    });

    // Emit individual elimination events
    for (const wallet of eliminatedWallets) {
      this.emitEvent({
        type: 'player_eliminated',
        gameId,
        data: {
          walletAddress: wallet,
          roundNumber: round.roundNumber,
          placement: aliveAfter + eliminatedWallets.indexOf(wallet) + 1,
        },
        timestamp: Date.now(),
      });
    }

    console.log(`[LDS] Round ${round.roundNumber} resolved. Result: ${result}, ${eliminatedWallets.length} eliminated, ${aliveAfter} remaining`);

    // Small delay before next round
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start next round
    await this.startNextRound(gameId);
  }

  /**
   * End game with a winner
   */
  private async endGameWithWinner(gameId: string): Promise<void> {
    const game = getGame(gameId);
    if (!game) return;

    const players = getPlayers(gameId);
    const alivePlayers = players.filter(p => p.status === 'alive');

    if (alivePlayers.length === 0) {
      // Everyone eliminated in same round - split among last eliminated
      await this.endGameSplit(gameId, 'All remaining players eliminated');
      return;
    }

    if (alivePlayers.length > 1) {
      // Multiple winners - shouldn't happen but handle it
      await this.endGameSplit(gameId, 'Multiple winners');
      return;
    }

    // Single winner!
    const winner = alivePlayers[0];
    setPlayerWinner(gameId, winner.walletAddress);
    endGame(gameId);
    this.activeGameId = null;

    // Calculate payouts
    await this.processPayouts(gameId);

    this.emitEvent({
      type: 'game_ended',
      gameId,
      data: {
        winner: winner.walletAddress,
        rounds: game.currentRound,
        prizePool: game.prizePoolLamports,
        players: players.length,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] Game ${gameId} ended. Winner: ${winner.walletAddress.slice(0, 8)}...`);
    this.cleanup(gameId);
  }

  /**
   * End game due to stalemate (max rounds reached)
   */
  private async endGameStalemate(gameId: string): Promise<void> {
    console.log(`[LDS] Game ${gameId} reached max rounds (${CONFIG.MAX_ROUNDS}), ending in stalemate`);
    await this.endGameSplit(gameId, 'Max rounds reached');
  }

  /**
   * End game with prize split among remaining players
   */
  private async endGameSplit(gameId: string, reason: string): Promise<void> {
    const game = getGame(gameId);
    if (!game) return;

    endGame(gameId);
    this.activeGameId = null;

    const alivePlayers = getAlivePlayers(gameId);
    let splitWinnerWallets: string[] = [];

    if (alivePlayers.length === 0) {
      // Everyone eliminated in same round - find last eliminated and split among them
      const players = getPlayers(gameId);
      const eliminatedRounds = players
        .map(p => p.eliminatedAtRound)
        .filter((r): r is number => r !== null && r > 0);

      if (eliminatedRounds.length === 0) {
        // Edge case: no one was properly eliminated (shouldn't happen)
        console.error(`[LDS] Game ${gameId} has no eliminated players - refunding all`);
        splitWinnerWallets = players.map(p => p.walletAddress);
      } else {
        const maxEliminatedRound = Math.max(...eliminatedRounds);
        const lastEliminatedPlayers = players.filter(p => p.eliminatedAtRound === maxEliminatedRound);
        splitWinnerWallets = lastEliminatedPlayers.map(p => p.walletAddress);

        console.log(`[LDS] Everyone eliminated in round ${maxEliminatedRound}. Splitting among ${splitWinnerWallets.length} players.`);
      }
    } else {
      // Split among alive players (stalemate scenario)
      splitWinnerWallets = alivePlayers.map(p => p.walletAddress);
    }

    // Process the split payout
    await this.processSplitPayout(gameId, splitWinnerWallets);

    this.emitEvent({
      type: 'game_ended',
      gameId,
      data: {
        reason,
        splitWinners: splitWinnerWallets,
        splitCount: splitWinnerWallets.length,
        rounds: game.currentRound,
        prizePool: game.prizePoolLamports,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] Game ${gameId} ended in split. Reason: ${reason}. Winners: ${splitWinnerWallets.length}`);
    this.cleanup(gameId);
  }

  /**
   * Process payouts based on payout tiers
   */
  private async processPayouts(gameId: string): Promise<void> {
    const game = getGame(gameId);
    if (!game) return;

    const players = getPlayers(gameId);
    const playerCount = players.length;
    const prizePool = game.prizePoolLamports;
    const rake = Math.floor(prizePool * CONFIG.RAKE_PERCENT / 100);
    const distributablePool = prizePool - rake;

    // Find the appropriate payout tier
    const tier = PAYOUT_TIERS.find(t => playerCount >= t.minPlayers && playerCount <= t.maxPlayers)
      || PAYOUT_TIERS[PAYOUT_TIERS.length - 1];

    // Sort players by placement (winner = 1, eliminated players by round desc)
    const sortedPlayers = [...players].sort((a, b) => {
      if (a.status === 'winner') return -1;
      if (b.status === 'winner') return 1;
      // Higher elimination round = better placement
      return (b.eliminatedAtRound || 0) - (a.eliminatedAtRound || 0);
    });

    // Assign placements and calculate payouts
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const placement = i + 1;
      let payout = 0;

      if (i < tier.payouts.length) {
        payout = Math.floor(distributablePool * tier.payouts[i] / 100);
      }

      setPlayerPayout(gameId, player.walletAddress, placement, payout);

      // Credit payout on-chain with retry logic
      if (payout > 0) {
        const tx = await this.retryPayout(player.walletAddress, payout, 'lds', gameId);
        if (tx) {
          console.log(`[LDS] Credited ${payout} lamports to ${player.walletAddress.slice(0, 8)}... (place ${placement}). TX: ${tx}`);
        }
        // If tx is null, retryPayout already logged the error and added to recovery queue
      }
    }

    console.log(`[LDS] Processed payouts for game ${gameId}. Pool: ${prizePool}, Rake: ${rake}, Distributed: ${distributablePool}`);
  }

  /**
   * Process equal split payout among winners
   */
  private async processSplitPayout(gameId: string, winnerWallets: string[]): Promise<void> {
    const game = getGame(gameId);
    if (!game || winnerWallets.length === 0) return;

    const prizePool = game.prizePoolLamports;
    const rake = Math.floor(prizePool * CONFIG.RAKE_PERCENT / 100);
    const distributablePool = prizePool - rake;
    const perWinner = Math.floor(distributablePool / winnerWallets.length);

    for (let i = 0; i < winnerWallets.length; i++) {
      const wallet = winnerWallets[i];
      setPlayerPayout(gameId, wallet, 1, perWinner); // All get placement 1 in split

      const tx = await this.retryPayout(wallet, perWinner, 'lds', gameId);
      if (tx) {
        console.log(`[LDS] Credited ${perWinner} lamports to ${wallet.slice(0, 8)}... (split). TX: ${tx}`);
      }
      // If tx is null, retryPayout already logged the error and added to recovery queue
    }
  }

  /**
   * Cancel a game and refund all players
   * Free bet players get a free bet credit instead of SOL refund
   */
  private async cancelGame(gameId: string, reason: string): Promise<void> {
    const game = getGame(gameId);
    if (!game) return;

    updateGameStatus(gameId, 'cancelled');

    // Refund all players with retry logic
    const players = getPlayers(gameId);
    let successfulRefunds = 0;

    for (const player of players) {
      // Pass isFreeBet flag - free bet players get a free bet credit instead of SOL
      const tx = await this.retryRefund(player.walletAddress, CONFIG.ENTRY_FEE_LAMPORTS, gameId, player.isFreeBet);
      if (tx) {
        const refundType = player.isFreeBet ? 'free bet' : 'SOL';
        console.log(`[LDS] Refunded ${player.walletAddress.slice(0, 8)}... (${refundType}) for cancelled game ${gameId}. TX: ${tx}`);
        successfulRefunds++;
      }
      // Failed refunds are added to recovery queue by retryRefund
    }

    this.emitEvent({
      type: 'game_cancelled',
      gameId,
      data: {
        reason,
        refundedPlayers: successfulRefunds,
        totalPlayers: players.length,
        failedRefunds: players.length - successfulRefunds,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] Game ${gameId} cancelled. Reason: ${reason}. Refunded: ${successfulRefunds}/${players.length}`);
    this.cleanup(gameId);
    this.ensureUpcomingGame();
  }

  /**
   * Resume an in-progress game (after server restart)
   */
  private resumeInProgressGame(game: LDSGameRecord): void {
    const round = getCurrentRound(game.id);
    if (!round || round.resolvedAt !== null) {
      // Start next round
      this.startNextRound(game.id);
    } else {
      // Resume current round
      const now = Date.now();
      const roundEnd = round.startedAt + CONFIG.ROUND_DURATION_SECONDS * 1000;

      if (now >= roundEnd) {
        // Round should have ended, resolve it
        this.resolveCurrentRound(game.id);
      } else {
        // Set timer for remaining time
        const remaining = roundEnd - now;
        const timer = setTimeout(() => {
          this.resolveCurrentRound(game.id);
        }, remaining);
        this.roundTimers.set(game.id, timer);
        console.log(`[LDS] Resumed game ${game.id} round ${round.roundNumber}, ${Math.round(remaining / 1000)}s remaining`);
      }
    }
  }

  /**
   * Deterministic tie-break using cryptographic hash
   * Used when price is exactly unchanged (rare edge case)
   * Produces consistent, unpredictable result based on game state
   */
  private deterministicTieBreak(
    gameId: string,
    roundNumber: number,
    startPrice: number,
    endPrice: number
  ): LDSRoundResult {
    const input = `${gameId}:${roundNumber}:${startPrice}:${endPrice}:tiebreak`;
    const hash = crypto.createHash('sha256').update(input).digest();
    // Use first byte of hash to determine result
    return hash[0] % 2 === 0 ? 'up' : 'down';
  }

  /**
   * Retry a payout with exponential backoff
   */
  private async retryPayout(
    walletAddress: string,
    amountLamports: number,
    gameType: 'lds',
    gameId: string,
    retryCount: number = 0
  ): Promise<string | null> {
    try {
      const tx = await balanceService.creditWinnings(
        walletAddress,
        amountLamports,
        gameType,
        gameId
      );
      return tx;
    } catch (error) {
      if (retryCount < PAYOUT_RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          PAYOUT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          PAYOUT_RETRY_CONFIG.maxDelayMs
        );
        console.log(`[LDS] Payout failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${PAYOUT_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryPayout(walletAddress, amountLamports, gameType, gameId, retryCount + 1);
      }

      // Max retries exceeded - add to failed payouts queue
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failedPayouts.push({
        gameId,
        walletAddress,
        amountLamports,
        reason: errorMsg,
        timestamp: Date.now(),
        retryCount,
      });
      console.error(`[LDS] CRITICAL: Payout failed after ${PAYOUT_RETRY_CONFIG.maxRetries} retries for ${walletAddress.slice(0, 8)}... Amount: ${amountLamports} lamports. Added to recovery queue.`);
      return null;
    }
  }

  /**
   * Retry a refund with exponential backoff
   * For free bets, credits a free bet instead of refunding SOL
   */
  private async retryRefund(
    walletAddress: string,
    amountLamports: number,
    gameId: string,
    isFreeBet: boolean = false,
    retryCount: number = 0
  ): Promise<string | null> {
    // For free bets, credit a free bet instead of refunding SOL
    if (isFreeBet) {
      try {
        addFreeBetCredit(walletAddress, 1, `LDS game ${gameId} refund`);
        console.log(`[LDS] Credited free bet to ${walletAddress.slice(0, 8)}... for cancelled game ${gameId}`);
        return 'free_bet_credited';
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        failedPayouts.push({
          gameId,
          walletAddress,
          amountLamports,
          reason: `Free bet credit failed: ${errorMsg}`,
          timestamp: Date.now(),
          retryCount,
          isFreeBet: true,
        });
        console.error(`[LDS] Failed to credit free bet to ${walletAddress.slice(0, 8)}... for game ${gameId}. Added to recovery queue.`);
        return null;
      }
    }

    // Regular SOL refund
    try {
      const tx = await balanceService.refundFromGlobalVault(
        walletAddress,
        amountLamports,
        'lds',
        gameId
      );
      return tx;
    } catch (error) {
      if (retryCount < PAYOUT_RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          PAYOUT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          PAYOUT_RETRY_CONFIG.maxDelayMs
        );
        console.log(`[LDS] Refund failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${PAYOUT_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRefund(walletAddress, amountLamports, gameId, isFreeBet, retryCount + 1);
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failedPayouts.push({
        gameId,
        walletAddress,
        amountLamports,
        reason: `Refund failed: ${errorMsg}`,
        timestamp: Date.now(),
        retryCount,
        isFreeBet: false,
      });
      console.error(`[LDS] CRITICAL: Refund failed after ${PAYOUT_RETRY_CONFIG.maxRetries} retries for ${walletAddress.slice(0, 8)}... Amount: ${amountLamports} lamports. Added to recovery queue.`);
      return null;
    }
  }

  /**
   * Get failed payouts for manual recovery
   */
  getFailedPayouts(): FailedPayout[] {
    return [...failedPayouts];
  }

  /**
   * Cleanup timers for a game
   */
  private cleanup(gameId: string): void {
    const gameTimer = this.gameTimers.get(gameId);
    if (gameTimer) {
      clearTimeout(gameTimer);
      this.gameTimers.delete(gameId);
    }

    const roundTimer = this.roundTimers.get(gameId);
    if (roundTimer) {
      clearTimeout(roundTimer);
      this.roundTimers.delete(gameId);
    }

    if (this.activeGameId === gameId) {
      this.activeGameId = null;
    }
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Join the current registering game
   * @param walletAddress - The player's wallet address
   * @param isFreeBet - Whether this is a free bet entry (default: false)
   */
  async joinGame(walletAddress: string, isFreeBet: boolean = false): Promise<{ success: boolean; error?: string; game?: LDSGameRecord }> {
    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    // Check if player is already in an active game
    if (isPlayerInAnyActiveGame(walletAddress)) {
      const existing = getPlayerActiveGame(walletAddress);
      return { success: false, error: `Already in an active game (${existing?.gameId.slice(0, 8)}...)` };
    }

    // Get current registering game
    const game = getRegisteringGame();
    if (!game) {
      return { success: false, error: 'No game currently accepting players' };
    }

    // Check if game is full
    if (game.playerCount >= CONFIG.MAX_PLAYERS) {
      return { success: false, error: 'Game is full' };
    }

    // Check if player has sufficient balance
    const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, CONFIG.ENTRY_FEE_LAMPORTS);
    if (!hasSufficient) {
      const available = await balanceService.getAvailableBalance(walletAddress);
      return {
        success: false,
        error: `Insufficient balance. Need ${CONFIG.ENTRY_FEE_SOL} SOL, have ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL`
      };
    }

    // Create pending debit
    const pendingId = await balanceService.debitPending(
      walletAddress,
      CONFIG.ENTRY_FEE_LAMPORTS,
      'lds',
      game.id
    );

    // Lock funds on-chain
    const lockTx = await balanceService.transferToGlobalVault(walletAddress, CONFIG.ENTRY_FEE_LAMPORTS, 'lds');
    if (!lockTx) {
      balanceService.cancelDebit(pendingId);
      return { success: false, error: 'Failed to lock entry fee on-chain. Please try again.' };
    }

    // Add player to game with free bet flag
    addPlayer(game.id, walletAddress, CONFIG.ENTRY_FEE_LAMPORTS, isFreeBet);
    balanceService.confirmDebit(pendingId);

    // Get updated game
    const updatedGame = getGame(game.id)!;

    this.emitEvent({
      type: 'player_joined',
      gameId: game.id,
      data: {
        walletAddress,
        playerCount: updatedGame.playerCount,
        maxPlayers: CONFIG.MAX_PLAYERS,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] ${walletAddress.slice(0, 8)}... joined game ${game.id}. Players: ${updatedGame.playerCount}/${CONFIG.MAX_PLAYERS}`);
    return { success: true, game: updatedGame };
  }

  /**
   * Leave a registering game (before it starts)
   */
  async leaveGame(walletAddress: string): Promise<{ success: boolean; error?: string }> {
    const playerGame = getPlayerActiveGame(walletAddress);
    if (!playerGame) {
      return { success: false, error: 'Not in any active game' };
    }

    const game = getGame(playerGame.gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Can only leave during registration
    if (game.status !== 'registering') {
      return { success: false, error: 'Cannot leave after game has started' };
    }

    // Refund entry fee
    const refundTx = await balanceService.refundFromGlobalVault(
      walletAddress,
      CONFIG.ENTRY_FEE_LAMPORTS,
      'lds',
      game.id
    );

    if (!refundTx) {
      return { success: false, error: 'Failed to refund entry fee. Please contact support.' };
    }

    // Remove player from game
    removePlayer(game.id, walletAddress, CONFIG.ENTRY_FEE_LAMPORTS);

    // Get updated game
    const updatedGame = getGame(game.id)!;

    this.emitEvent({
      type: 'player_left',
      gameId: game.id,
      data: {
        walletAddress,
        playerCount: updatedGame.playerCount,
      },
      timestamp: Date.now(),
    });

    console.log(`[LDS] ${walletAddress.slice(0, 8)}... left game ${game.id}. Players: ${updatedGame.playerCount}`);
    return { success: true };
  }

  /**
   * Get current game state
   */
  getGameState(gameId: string): LDSGameState | null {
    const game = getGame(gameId);
    if (!game) return null;

    const players = getPlayers(gameId);
    const currentRound = getCurrentRound(gameId);
    const alivePlayers = getAlivePlayerCount(gameId);

    let phase: LDSGameState['phase'] = 'registering';
    let timeRemaining = 0;

    switch (game.status) {
      case 'registering':
        phase = 'registering';
        timeRemaining = Math.max(0, Math.floor((game.scheduledStartTime - Date.now()) / 1000));
        break;
      case 'starting':
        phase = 'starting';
        timeRemaining = 3;
        break;
      case 'in_progress':
        if (currentRound && currentRound.resolvedAt === null) {
          const now = Date.now();
          if (now < currentRound.predictionDeadline) {
            phase = 'predicting';
            timeRemaining = Math.max(0, Math.floor((currentRound.predictionDeadline - now) / 1000));
          } else {
            phase = 'resolving';
            const roundEnd = currentRound.startedAt + CONFIG.ROUND_DURATION_SECONDS * 1000;
            timeRemaining = Math.max(0, Math.floor((roundEnd - now) / 1000));
          }
        }
        break;
      case 'completed':
        phase = 'completed';
        break;
      case 'cancelled':
        phase = 'cancelled';
        break;
    }

    return {
      game,
      players,
      currentRound,
      alivePlayers,
      timeRemaining,
      phase,
    };
  }

  /**
   * Get the current registering game
   */
  getCurrentGame(): LDSGameRecord | null {
    return getRegisteringGame();
  }

  /**
   * Get the active in-progress game
   */
  getActiveGame(): LDSGameRecord | null {
    return getActiveGame();
  }

  /**
   * Get player's game status
   */
  getPlayerStatus(walletAddress: string): { inGame: boolean; gameId?: string; status?: string } {
    const playerGame = getPlayerActiveGame(walletAddress);
    if (!playerGame) {
      return { inGame: false };
    }
    return {
      inGame: true,
      gameId: playerGame.gameId,
      status: playerGame.status,
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 50): LDSLeaderboardEntry[] {
    return getLeaderboard(limit);
  }

  /**
   * Get player stats
   */
  getPlayerStats(walletAddress: string): ReturnType<typeof getPlayerStats> {
    return getPlayerStats(walletAddress);
  }

  /**
   * Get player history
   */
  getPlayerHistory(walletAddress: string, limit: number = 20): ReturnType<typeof getPlayerHistory> {
    return getPlayerHistory(walletAddress, limit);
  }

  /**
   * Get recent completed games
   */
  getRecentGames(limit: number = 10): LDSGameRecord[] {
    return getRecentGames(limit);
  }

  /**
   * Get game configuration
   */
  getConfig() {
    return {
      entryFeeSol: CONFIG.ENTRY_FEE_SOL,
      maxPlayers: CONFIG.MAX_PLAYERS,
      minPlayers: CONFIG.MIN_PLAYERS,
      gameIntervalMinutes: CONFIG.GAME_INTERVAL_MINUTES,
      roundDurationSeconds: CONFIG.ROUND_DURATION_SECONDS,
      predictionWindowSeconds: CONFIG.PREDICTION_WINDOW_SECONDS,
      maxRounds: CONFIG.MAX_ROUNDS,
      rakePercent: CONFIG.RAKE_PERCENT,
      payoutTiers: PAYOUT_TIERS,
    };
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to LDS events
   */
  subscribe(listener: (event: LDSEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: LDSEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    this.gameTimers.forEach(timer => clearTimeout(timer));
    this.gameTimers.clear();

    this.roundTimers.forEach(timer => clearTimeout(timer));
    this.roundTimers.clear();

    this.eventListeners.clear();
    this.initialized = false;

    console.log('[LDS] Manager shutdown');
  }
}

// Export singleton instance
export const ldsManager = new LDSManager();
