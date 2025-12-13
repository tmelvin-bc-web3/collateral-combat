import { v4 as uuidv4 } from 'uuid';
import { PredictionRound, PredictionBet, PredictionSide, RoundStatus, PredictionStats } from '../types';
import { priceService } from './priceService';

const ROUND_DURATION = 30; // 30 seconds per round
const LOCK_BEFORE_END = 5; // Stop accepting bets 5 seconds before end
const PLATFORM_FEE_PERCENT = 5; // 5% fee on winnings

class PredictionService {
  private rounds: Map<string, PredictionRound[]> = new Map(); // asset -> rounds
  private currentRounds: Map<string, PredictionRound> = new Map(); // asset -> current round
  private userBets: Map<string, PredictionBet[]> = new Map(); // wallet -> bets
  private stats: Map<string, PredictionStats> = new Map(); // asset -> stats
  private listeners: Set<(event: string, data: any) => void> = new Set();
  private activeAssets: Set<string> = new Set(['SOL']); // Start with SOL only
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Initialize stats for active assets
    this.activeAssets.forEach(asset => {
      this.stats.set(asset, {
        asset,
        totalRounds: 0,
        totalVolume: 0,
        longWins: 0,
        shortWins: 0,
        pushes: 0
      });
      this.rounds.set(asset, []);
    });
  }

  // Start the prediction game for an asset
  start(asset: string = 'SOL'): void {
    if (this.currentRounds.has(asset)) {
      console.log(`Prediction game already running for ${asset}`);
      return;
    }

    this.activeAssets.add(asset);
    if (!this.stats.has(asset)) {
      this.stats.set(asset, {
        asset,
        totalRounds: 0,
        totalVolume: 0,
        longWins: 0,
        shortWins: 0,
        pushes: 0
      });
      this.rounds.set(asset, []);
    }

    console.log(`\n🎯 Starting prediction game for ${asset}...\n`);
    this.startNewRound(asset);
  }

  // Stop the prediction game for an asset
  stop(asset: string): void {
    const timer = this.roundTimers.get(asset);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(asset);
    }
    this.currentRounds.delete(asset);
    this.activeAssets.delete(asset);
    console.log(`\n🛑 Prediction game stopped for ${asset}\n`);
  }

  // Start a new round
  private startNewRound(asset: string): void {
    const now = Date.now();
    const startPrice = priceService.getPrice(asset);

    const round: PredictionRound = {
      id: uuidv4(),
      asset,
      status: 'betting',
      startPrice,
      startTime: now,
      lockTime: now + (ROUND_DURATION - LOCK_BEFORE_END) * 1000,
      endTime: now + ROUND_DURATION * 1000,
      duration: ROUND_DURATION,
      longPool: 0,
      shortPool: 0,
      longBets: [],
      shortBets: [],
      totalPool: 0
    };

    this.currentRounds.set(asset, round);
    const assetRounds = this.rounds.get(asset) || [];
    assetRounds.push(round);
    // Keep only last 50 rounds
    if (assetRounds.length > 50) {
      assetRounds.shift();
    }
    this.rounds.set(asset, assetRounds);

    console.log(`🎯 Round ${round.id.slice(0, 8)}... started for ${asset} @ $${startPrice.toFixed(2)}`);
    this.notifyListeners('round_started', round);

    // Schedule lock time
    const lockTimer = setTimeout(() => {
      this.lockRound(asset);
    }, (ROUND_DURATION - LOCK_BEFORE_END) * 1000);

    // Schedule end time
    const endTimer = setTimeout(() => {
      this.settleRound(asset);
    }, ROUND_DURATION * 1000);

    this.roundTimers.set(`${asset}_lock`, lockTimer);
    this.roundTimers.set(`${asset}_end`, endTimer);
  }

  // Lock round (no more bets)
  private lockRound(asset: string): void {
    const round = this.currentRounds.get(asset);
    if (!round || round.status !== 'betting') return;

    round.status = 'locked';
    console.log(`🔒 Round ${round.id.slice(0, 8)}... locked | Long: $${round.longPool} | Short: $${round.shortPool}`);
    this.notifyListeners('round_locked', round);
  }

  // Settle round and determine winner
  private settleRound(asset: string): void {
    const round = this.currentRounds.get(asset);
    if (!round) return;

    const endPrice = priceService.getPrice(asset);
    round.endPrice = endPrice;
    round.status = 'settled';

    // Determine winner
    if (endPrice > round.startPrice) {
      round.winner = 'long';
    } else if (endPrice < round.startPrice) {
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

    const priceChange = ((endPrice - round.startPrice) / round.startPrice * 100).toFixed(3);
    console.log(`✅ Round ${round.id.slice(0, 8)}... settled | ${asset}: $${round.startPrice.toFixed(2)} → $${endPrice.toFixed(2)} (${priceChange}%) | Winner: ${round.winner?.toUpperCase()}`);

    this.notifyListeners('round_settled', round);

    // Clear timers
    clearTimeout(this.roundTimers.get(`${asset}_lock`));
    clearTimeout(this.roundTimers.get(`${asset}_end`));

    // Start next round immediately
    this.currentRounds.delete(asset);
    if (this.activeAssets.has(asset)) {
      setTimeout(() => this.startNewRound(asset), 1000); // 1 second gap between rounds
    }
  }

  // Calculate payouts for a settled round
  private calculatePayouts(round: PredictionRound): void {
    const winningBets = round.winner === 'long' ? round.longBets :
                        round.winner === 'short' ? round.shortBets : [];
    const losingPool = round.winner === 'long' ? round.shortPool :
                       round.winner === 'short' ? round.longPool : 0;
    const winningPool = round.winner === 'long' ? round.longPool :
                        round.winner === 'short' ? round.shortPool : 0;

    // If push or no losing side, refund everyone
    if (round.winner === 'push' || losingPool === 0) {
      [...round.longBets, ...round.shortBets].forEach(bet => {
        bet.status = round.winner === 'push' ? 'push' : 'cancelled';
        bet.payout = bet.amount; // Refund
      });
      return;
    }

    // Calculate payouts for winners
    // Winners split the losing pool proportionally, minus platform fee
    const distributablePool = losingPool * (1 - PLATFORM_FEE_PERCENT / 100);

    winningBets.forEach(bet => {
      const share = bet.amount / winningPool;
      bet.payout = bet.amount + (distributablePool * share);
      bet.status = 'won';
    });

    // Mark losing bets
    const losingBets = round.winner === 'long' ? round.shortBets : round.longBets;
    losingBets.forEach(bet => {
      bet.status = 'lost';
      bet.payout = 0;
    });
  }

  // Place a bet
  placeBet(asset: string, side: PredictionSide, amount: number, bettor: string): PredictionBet {
    const round = this.currentRounds.get(asset);

    if (!round) {
      throw new Error('No active round');
    }

    if (round.status !== 'betting') {
      throw new Error('Betting is closed for this round');
    }

    if (![5, 15, 25, 50, 100].includes(amount)) {
      throw new Error('Invalid bet amount');
    }

    const bet: PredictionBet = {
      id: uuidv4(),
      roundId: round.id,
      bettor,
      side,
      amount,
      placedAt: Date.now(),
      status: 'pending'
    };

    // Add to round
    if (side === 'long') {
      round.longBets.push(bet);
      round.longPool += amount;
    } else {
      round.shortBets.push(bet);
      round.shortPool += amount;
    }
    round.totalPool = round.longPool + round.shortPool;

    // Track user bets
    const userBets = this.userBets.get(bettor) || [];
    userBets.push(bet);
    this.userBets.set(bettor, userBets);

    console.log(`📊 ${bettor.slice(0, 8)}... bet $${amount} ${side.toUpperCase()} on ${asset}`);
    this.notifyListeners('bet_placed', { round, bet });

    return bet;
  }

  // Get current round for an asset
  getCurrentRound(asset: string): PredictionRound | undefined {
    return this.currentRounds.get(asset);
  }

  // Get recent rounds for an asset
  getRecentRounds(asset: string, limit: number = 10): PredictionRound[] {
    const rounds = this.rounds.get(asset) || [];
    return rounds.slice(-limit).reverse();
  }

  // Get user's prediction bets
  getUserBets(wallet: string, limit: number = 20): PredictionBet[] {
    const bets = this.userBets.get(wallet) || [];
    return bets.slice(-limit).reverse();
  }

  // Get stats for an asset
  getStats(asset: string): PredictionStats | undefined {
    return this.stats.get(asset);
  }

  // Get all active assets
  getActiveAssets(): string[] {
    return Array.from(this.activeAssets);
  }

  // Check if prediction is running for an asset
  isRunning(asset: string): boolean {
    return this.activeAssets.has(asset);
  }

  // Subscribe to events
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => listener(event, data));
  }
}

// Singleton instance
export const predictionService = new PredictionService();
