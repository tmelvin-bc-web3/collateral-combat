// Token Wars Manager
// Head-to-head token price battles with parimutuel betting
// Continuous operation: 60s betting -> 5min battle -> 30s cooldown -> repeat

import {
  createBattle,
  getBattle,
  getActiveBattle,
  getBettingBattle,
  getInProgressBattle,
  updateBattleStatus,
  startBattle as dbStartBattle,
  endBattle as dbEndBattle,
  placeBet as dbPlaceBet,
  getBet,
  getBetsForBattle,
  getBetsForSide,
  settleBet,
  getRecentBattles,
  getPlayerStats,
  getLeaderboard,
  getPlayerBetHistory,
  TWBattleRecord,
  TWBetRecord,
  TWBetSide,
  TWBattleStatus,
  TWPlayerStats,
} from '../db/tokenWarsDatabase';
import { balanceService } from './balanceService';
import { priceService } from './priceService';
import { pythVerificationService } from './pythVerificationService';
import {
  addFailedPayout,
  getPendingFailedPayouts,
  FailedPayoutRecord,
} from '../db/failedPayoutsDatabase';
import { PLATFORM_FEE_PERCENT } from '../utils/fees';

// Lamports per SOL
const LAMPORTS_PER_SOL = 1_000_000_000;

// Retry configuration for payouts
const PAYOUT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// Note: Failed payouts are now persisted to database via failedPayoutsDatabase.ts
// This ensures no user loses funds due to server restarts or crashes

/**
 * Validate Solana wallet address format
 */
function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Battle configuration
const CONFIG = {
  // Betting window duration in seconds
  BETTING_DURATION_SECONDS: 60,
  // Battle duration in seconds
  BATTLE_DURATION_SECONDS: 300, // 5 minutes
  // Cooldown duration in seconds
  COOLDOWN_DURATION_SECONDS: 60, // 1 minute grace period
  // Minimum bet in SOL
  MIN_BET_SOL: 0.01,
  // Maximum bet in SOL
  MAX_BET_SOL: 10,
  // Rake percentage (from centralized fee config)
  RAKE_PERCENT: PLATFORM_FEE_PERCENT,
};

// Token pairs for battles (tokens available in priceService)
// Each pair has: symbol, name, and optional Pyth feed ID (for future use)
export interface TokenInfo {
  symbol: string;
  name: string;
  pythFeed?: string;
}

// Available memecoins for Token Wars (volatile, uncorrelated - more exciting battles!)
const AVAILABLE_TOKENS: TokenInfo[] = [
  // Solana OG memecoins
  { symbol: 'WIF', name: 'dogwifhat', pythFeed: '4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc' },
  { symbol: 'BONK', name: 'Bonk', pythFeed: '72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419' },
  // Popular Solana memecoins
  { symbol: 'PONKE', name: 'Ponke', pythFeed: 'f4cb880742ecf6525885a239968914798c44cd83749856a6dff5c140ba5bf69b' },
  { symbol: 'PENGU', name: 'Pudgy Penguins', pythFeed: 'bed3097008b9b5e3c93bec20be79cb43986b85a996475589351a21e67bae9b61' },
  { symbol: 'TURBO', name: 'Turbo', pythFeed: 'a00e67c6232f2f564932c252c440ed30759d10fee966b601c1613b0ed8692a5c' },
  { symbol: 'POPCAT', name: 'Popcat', pythFeed: 'b9312a7ee50e189ef045aa3c7842e099b061bd9bdc99ac645956c3b660dc8cce' },
  { symbol: 'FARTCOIN', name: 'Fartcoin', pythFeed: '58cd29ef0e714c5affc44f269b2c1899a52da4169d7acc147b9da692e6953608' },
  { symbol: 'MEW', name: 'cat in a dogs world', pythFeed: '514aed52ca5294177f20187ae883cec4a018619772ddce41efcc36a6448f5d5d' },
  { symbol: 'PNUT', name: 'Peanut the Squirrel', pythFeed: '116da895807f81f6b5c5f01b109376e7f6834dc8b51365ab7cdfa66634340e54' },
  { symbol: 'GOAT', name: 'Goatseus Maximus', pythFeed: 'f7731dc812590214d3eb4343bfb13d1b4cfa9b1d4e020644b5d5d8e07d60c66c' },
  // Cross-chain memecoins
  { symbol: 'DOGE', name: 'Dogecoin', pythFeed: 'dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c' },
  { symbol: 'TRUMP', name: 'Official Trump', pythFeed: '879551021853eec7a7dc827578e8e69da7e4fa8148339aa0d3d5296405be4b1a' },
  { symbol: 'SPX', name: 'SPX6900', pythFeed: '8414cfadf82f6bed644d2e399c11df21ec0131aa574c56030b132113dbbf3a0a' },
  { symbol: 'FLOKI', name: 'Floki', pythFeed: '6b1381ce7e874dc5410b197ac8348162c0dd6c0d4c9cd6322672d6c2b1d58293' },
  { symbol: 'PIPPIN', name: 'Pippin' }, // No Pyth feed yet - uses fallback price
  { symbol: 'BRETT', name: 'Brett', pythFeed: '9b5729efe3d68e537cdcb2ca70444dea5f06e1660b562632609757076d0b9448' },
  { symbol: 'BABYDOGE', name: 'Baby Doge Coin', pythFeed: '053e0a17cc9282f191a6e60165dabd4a4861a8847c06eb34f54e07155eebedba' },
];

// Track recently used matchups to avoid repetition
const recentMatchups: Set<string> = new Set();
const MAX_RECENT_MATCHUPS = 5; // Remember last 5 matchups to avoid immediate repeats

// Event types for WebSocket notifications
export type TWEventType =
  | 'battle_created'
  | 'bet_placed'
  | 'betting_ended'
  | 'battle_started'
  | 'price_update'
  | 'battle_ended'
  | 'cooldown_started'
  | 'payout_processed';

export interface TWEvent {
  type: TWEventType;
  battleId: string;
  data: any;
  timestamp: number;
}

// Battle state for WebSocket updates
export interface TWBattleState {
  battle: TWBattleRecord;
  phase: 'betting' | 'in_progress' | 'cooldown' | 'completed';
  timeRemaining: number;
  tokenAPriceNow?: number;
  tokenBPriceNow?: number;
  tokenAChangeNow?: number;
  tokenBChangeNow?: number;
  odds: {
    tokenA: number;
    tokenB: number;
  };
}

class TokenWarsManager {
  private eventListeners: Set<(event: TWEvent) => void> = new Set();
  private battleTimer: NodeJS.Timeout | null = null;
  private priceUpdateTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    // Don't auto-initialize - let the main app call initialize()
  }

  /**
   * Initialize the manager and start the battle loop
   */
  initialize(): void {
    if (this.initialized) {
      console.log('[TokenWars] Manager already initialized');
      return;
    }

    // Check for any active battles from previous server instance
    const activeBattle = getActiveBattle();
    if (activeBattle) {
      console.log(`[TokenWars] Resuming active battle: ${activeBattle.id} (status: ${activeBattle.status})`);
      this.resumeBattle(activeBattle);
    } else {
      // Start a new battle
      this.startNewBattle();
    }

    // Start price update loop for in-progress battles
    this.startPriceUpdates();

    this.initialized = true;
    console.log('[TokenWars] Manager initialized');
  }

  /**
   * Resume an active battle after server restart
   */
  private resumeBattle(battle: TWBattleRecord): void {
    const now = Date.now();

    switch (battle.status) {
      case 'betting':
        if (now >= battle.bettingEndTime) {
          // Betting phase ended, start battle
          this.transitionToBattle(battle.id);
        } else {
          // Resume betting phase
          const remaining = battle.bettingEndTime - now;
          this.scheduleBattleStart(battle.id, remaining);
        }
        break;

      case 'in_progress':
        if (battle.battleStartTime) {
          const battleEnd = battle.battleStartTime + CONFIG.BATTLE_DURATION_SECONDS * 1000;
          if (now >= battleEnd) {
            // Battle ended, resolve it
            this.resolveBattle(battle.id);
          } else {
            // Resume battle
            const remaining = battleEnd - now;
            this.scheduleBattleEnd(battle.id, remaining);
          }
        }
        break;

      case 'cooldown':
        // Just start a new battle
        this.startNewBattle();
        break;
    }
  }

  /**
   * Start a new battle with next token pair
   */
  private startNewBattle(): void {
    // Get next matchup
    const [tokenA, tokenB] = this.getNextMatchup();
    const tokenAInfo = AVAILABLE_TOKENS.find(t => t.symbol === tokenA)!;
    const tokenBInfo = AVAILABLE_TOKENS.find(t => t.symbol === tokenB)!;

    const now = Date.now();
    const bettingEndTime = now + CONFIG.BETTING_DURATION_SECONDS * 1000;

    const battle = createBattle(
      tokenA,
      tokenB,
      tokenAInfo.pythFeed || '',
      tokenBInfo.pythFeed || '',
      now,
      bettingEndTime
    );

    this.emitEvent({
      type: 'battle_created',
      battleId: battle.id,
      data: {
        battle,
        tokenA: tokenAInfo,
        tokenB: tokenBInfo,
        bettingEndsAt: bettingEndTime,
      },
      timestamp: now,
    });

    console.log(`[TokenWars] New battle created: ${battle.id} - ${tokenA} vs ${tokenB}`);

    // Schedule transition to battle phase
    this.scheduleBattleStart(battle.id, CONFIG.BETTING_DURATION_SECONDS * 1000);
  }

  /**
   * Get a random matchup from all possible memecoin pairs
   * Avoids recently used matchups for variety
   */
  private getNextMatchup(): [string, string] {
    const tokens = AVAILABLE_TOKENS.map(t => t.symbol);

    // Generate all possible pairs
    const allPairs: [string, string][] = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        allPairs.push([tokens[i], tokens[j]]);
      }
    }

    // Filter out recently used matchups
    const availablePairs = allPairs.filter(([a, b]) => {
      const key = [a, b].sort().join('-');
      return !recentMatchups.has(key);
    });

    // If all pairs recently used, clear history and use all pairs
    const pairsToChooseFrom = availablePairs.length > 0 ? availablePairs : allPairs;

    // Pick a random pair
    const randomIndex = Math.floor(Math.random() * pairsToChooseFrom.length);
    const [tokenA, tokenB] = pairsToChooseFrom[randomIndex];

    // Track this matchup
    const matchupKey = [tokenA, tokenB].sort().join('-');
    recentMatchups.add(matchupKey);

    // Keep recent matchups limited
    if (recentMatchups.size > MAX_RECENT_MATCHUPS) {
      const oldest = recentMatchups.values().next().value as string;
      if (oldest) {
        recentMatchups.delete(oldest);
      }
    }

    // Randomly swap order so tokenA/tokenB positions vary
    if (Math.random() > 0.5) {
      return [tokenB, tokenA];
    }
    return [tokenA, tokenB];
  }

  /**
   * Schedule the transition from betting to battle
   */
  private scheduleBattleStart(battleId: string, delayMs: number): void {
    if (this.battleTimer) {
      clearTimeout(this.battleTimer);
    }

    this.battleTimer = setTimeout(() => {
      this.transitionToBattle(battleId);
    }, delayMs);

    console.log(`[TokenWars] Battle ${battleId} will start in ${Math.round(delayMs / 1000)}s`);
  }

  /**
   * Transition from betting to in_progress
   */
  private transitionToBattle(battleId: string): void {
    const battle = getBattle(battleId);
    if (!battle || battle.status !== 'betting') {
      console.log(`[TokenWars] Cannot start battle ${battleId} (status: ${battle?.status})`);
      return;
    }

    // Get starting prices
    const tokenAPrice = priceService.getPrice(battle.tokenA);
    const tokenBPrice = priceService.getPrice(battle.tokenB);

    if (tokenAPrice === 0 || tokenBPrice === 0) {
      console.error(`[TokenWars] Cannot get prices for ${battle.tokenA}/${battle.tokenB}, retrying...`);
      setTimeout(() => this.transitionToBattle(battleId), 2000);
      return;
    }

    // Check if there are any bets
    const bets = getBetsForBattle(battleId);
    if (bets.length === 0) {
      console.log(`[TokenWars] No bets for battle ${battleId}, starting new battle`);
      updateBattleStatus(battleId, 'cancelled');
      this.startNewBattle();
      return;
    }

    // Start the battle
    dbStartBattle(battleId, tokenAPrice, tokenBPrice);

    // Record Pyth-verified prices for audit trail
    pythVerificationService.recordMultiplePriceAudits('token_wars', battleId, 'battle_start', [
      { symbol: battle.tokenA, backendPrice: tokenAPrice },
      { symbol: battle.tokenB, backendPrice: tokenBPrice },
    ]).catch(err => console.error('[TokenWars] Pyth audit failed:', err));

    const updatedBattle = getBattle(battleId)!;

    this.emitEvent({
      type: 'betting_ended',
      battleId,
      data: { battle: updatedBattle },
      timestamp: Date.now(),
    });

    this.emitEvent({
      type: 'battle_started',
      battleId,
      data: {
        battle: updatedBattle,
        tokenAStartPrice: tokenAPrice,
        tokenBStartPrice: tokenBPrice,
        battleEndsAt: Date.now() + CONFIG.BATTLE_DURATION_SECONDS * 1000,
      },
      timestamp: Date.now(),
    });

    console.log(`[TokenWars] Battle ${battleId} started. ${battle.tokenA}: $${tokenAPrice.toFixed(4)}, ${battle.tokenB}: $${tokenBPrice.toFixed(4)}`);

    // Schedule battle end
    this.scheduleBattleEnd(battleId, CONFIG.BATTLE_DURATION_SECONDS * 1000);
  }

  /**
   * Schedule the battle end
   */
  private scheduleBattleEnd(battleId: string, delayMs: number): void {
    if (this.battleTimer) {
      clearTimeout(this.battleTimer);
    }

    this.battleTimer = setTimeout(() => {
      this.resolveBattle(battleId);
    }, delayMs);

    console.log(`[TokenWars] Battle ${battleId} will end in ${Math.round(delayMs / 1000)}s`);
  }

  /**
   * Resolve the battle and process payouts
   */
  private async resolveBattle(battleId: string): Promise<void> {
    const battle = getBattle(battleId);
    if (!battle || battle.status !== 'in_progress') {
      console.log(`[TokenWars] Cannot resolve battle ${battleId} (status: ${battle?.status})`);
      return;
    }

    // Get end prices
    const tokenAEndPrice = priceService.getPrice(battle.tokenA);
    const tokenBEndPrice = priceService.getPrice(battle.tokenB);

    if (tokenAEndPrice === 0 || tokenBEndPrice === 0) {
      console.error(`[TokenWars] Cannot get prices for resolution, retrying...`);
      setTimeout(() => this.resolveBattle(battleId), 2000);
      return;
    }

    // Record Pyth-verified end prices for audit trail
    pythVerificationService.recordMultiplePriceAudits('token_wars', battleId, 'battle_end', [
      { symbol: battle.tokenA, backendPrice: tokenAEndPrice },
      { symbol: battle.tokenB, backendPrice: tokenBEndPrice },
    ]).catch(err => console.error('[TokenWars] Pyth audit failed:', err));

    // Calculate percentage changes
    const tokenAChange = ((tokenAEndPrice - battle.tokenAStartPrice!) / battle.tokenAStartPrice!) * 100;
    const tokenBChange = ((tokenBEndPrice - battle.tokenBStartPrice!) / battle.tokenBStartPrice!) * 100;

    // Determine winner
    let winner: TWBetSide | 'tie';
    if (tokenAChange > tokenBChange) {
      winner = 'token_a';
    } else if (tokenBChange > tokenAChange) {
      winner = 'token_b';
    } else {
      winner = 'tie';
    }

    // Update battle
    dbEndBattle(battleId, tokenAEndPrice, tokenBEndPrice, tokenAChange, tokenBChange, winner);

    const updatedBattle = getBattle(battleId)!;

    this.emitEvent({
      type: 'battle_ended',
      battleId,
      data: {
        battle: updatedBattle,
        winner,
        tokenAChange,
        tokenBChange,
      },
      timestamp: Date.now(),
    });

    console.log(`[TokenWars] Battle ${battleId} ended. ${battle.tokenA}: ${tokenAChange.toFixed(2)}%, ${battle.tokenB}: ${tokenBChange.toFixed(2)}%. Winner: ${winner}`);

    // Process payouts
    await this.processPayouts(battleId, winner);

    // Start cooldown then new battle
    updateBattleStatus(battleId, 'cooldown');

    this.emitEvent({
      type: 'cooldown_started',
      battleId,
      data: { nextBattleIn: CONFIG.COOLDOWN_DURATION_SECONDS },
      timestamp: Date.now(),
    });

    // Schedule next battle after cooldown
    setTimeout(() => {
      this.startNewBattle();
    }, CONFIG.COOLDOWN_DURATION_SECONDS * 1000);
  }

  /**
   * Retry a payout with exponential backoff
   */
  private async retryPayout(
    walletAddress: string,
    amountLamports: number,
    battleId: string,
    retryCount: number = 0
  ): Promise<string | null> {
    try {
      const tx = await balanceService.creditWinnings(
        walletAddress,
        amountLamports,
        'token_wars',
        battleId
      );
      return tx;
    } catch (error) {
      if (retryCount < PAYOUT_RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          PAYOUT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          PAYOUT_RETRY_CONFIG.maxDelayMs
        );
        console.log(`[TokenWars] Payout failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${PAYOUT_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryPayout(walletAddress, amountLamports, battleId, retryCount + 1);
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addFailedPayout(
        'token_wars',
        battleId,
        walletAddress,
        amountLamports,
        'payout',
        errorMsg,
        retryCount
      );
      console.error(`[TokenWars] CRITICAL: Payout failed after ${PAYOUT_RETRY_CONFIG.maxRetries} retries for ${walletAddress.slice(0, 8)}... Amount: ${amountLamports} lamports. Persisted to recovery database.`);
      return null;
    }
  }

  /**
   * Retry a refund with exponential backoff
   */
  private async retryRefund(
    walletAddress: string,
    amountLamports: number,
    battleId: string,
    retryCount: number = 0
  ): Promise<string | null> {
    try {
      const tx = await balanceService.refundFromGlobalVault(
        walletAddress,
        amountLamports,
        'token_wars',
        battleId
      );
      return tx;
    } catch (error) {
      if (retryCount < PAYOUT_RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          PAYOUT_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount),
          PAYOUT_RETRY_CONFIG.maxDelayMs
        );
        console.log(`[TokenWars] Refund failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${PAYOUT_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRefund(walletAddress, amountLamports, battleId, retryCount + 1);
      }

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addFailedPayout(
        'token_wars',
        battleId,
        walletAddress,
        amountLamports,
        'refund',
        `Refund failed: ${errorMsg}`,
        retryCount
      );
      console.error(`[TokenWars] CRITICAL: Refund failed after ${PAYOUT_RETRY_CONFIG.maxRetries} retries for ${walletAddress.slice(0, 8)}... Amount: ${amountLamports} lamports. Persisted to recovery database.`);
      return null;
    }
  }

  /**
   * Get failed payouts for manual recovery (now reads from persistent database)
   */
  getFailedPayouts(): FailedPayoutRecord[] {
    return getPendingFailedPayouts(100);
  }

  /**
   * Process payouts using parimutuel model
   */
  private async processPayouts(battleId: string, winner: TWBetSide | 'tie'): Promise<void> {
    const battle = getBattle(battleId)!;
    const bets = getBetsForBattle(battleId);

    if (bets.length === 0) return;

    const totalPool = battle.totalBetsTokenA + battle.totalBetsTokenB;
    const rake = Math.floor(totalPool * CONFIG.RAKE_PERCENT / 100);
    const distributablePool = totalPool - rake;

    if (winner === 'tie') {
      // Refund all bets (minus rake? or full refund?)
      // For ties, we'll do full refund to be fair
      for (const bet of bets) {
        await this.processBetRefund(bet, battleId);
      }
      console.log(`[TokenWars] Battle ${battleId} was a tie, refunded ${bets.length} bets`);
      return;
    }

    // Get winning and losing bets
    const winningBets = bets.filter(b => b.side === winner);
    const losingBets = bets.filter(b => b.side !== winner);

    // Calculate total on winning side
    const totalWinningBets = winningBets.reduce((sum, b) => sum + b.amountLamports, 0);

    if (totalWinningBets === 0) {
      // No winners - everyone bet on the losing side
      // Refund all bets (fair outcome - no one should profit from collective loss)
      console.log(`[TokenWars] Battle ${battleId} had no winning bets - refunding all ${losingBets.length} bettors`);
      for (const bet of losingBets) {
        await this.processBetRefund(bet, battleId);
      }
      return;
    }

    // Process winning bets (proportional share of pool)
    for (const bet of winningBets) {
      const share = bet.amountLamports / totalWinningBets;
      const payout = Math.floor(distributablePool * share);

      const tx = await this.retryPayout(bet.walletAddress, payout, battleId);
      if (tx) {
        settleBet(bet.id, 'won', payout);
        console.log(`[TokenWars] Paid ${payout} lamports to ${bet.walletAddress.slice(0, 8)}... TX: ${tx}`);

        this.emitEvent({
          type: 'payout_processed',
          battleId,
          data: {
            walletAddress: bet.walletAddress,
            betAmount: bet.amountLamports,
            payout,
            profit: payout - bet.amountLamports,
          },
          timestamp: Date.now(),
        });
      } else {
        // Mark as won but with 0 payout - recovery queue will handle actual payment
        settleBet(bet.id, 'won', 0);
      }
    }

    // Process losing bets
    for (const bet of losingBets) {
      settleBet(bet.id, 'lost', 0);
    }

    console.log(`[TokenWars] Processed ${winningBets.length} winning bets, ${losingBets.length} losing bets. Pool: ${totalPool}, Distributed: ${distributablePool}`);
  }

  /**
   * Process bet refund (for ties or cancelled battles)
   */
  private async processBetRefund(bet: TWBetRecord, battleId: string): Promise<void> {
    const tx = await this.retryRefund(bet.walletAddress, bet.amountLamports, battleId);
    if (tx) {
      settleBet(bet.id, 'refunded', bet.amountLamports);
      console.log(`[TokenWars] Refunded ${bet.amountLamports} lamports to ${bet.walletAddress.slice(0, 8)}... TX: ${tx}`);
    } else {
      // Mark as refunded with 0 payout so it's not stuck in pending
      // Recovery queue will handle actual refund
      settleBet(bet.id, 'refunded', 0);
    }
  }

  /**
   * Start price update loop for real-time battle updates
   */
  private startPriceUpdates(): void {
    // Update every 2 seconds during both betting and in-progress phases
    this.priceUpdateTimer = setInterval(() => {
      // Check for in-progress battle first (has change data)
      const inProgressBattle = getInProgressBattle();
      if (inProgressBattle) {
        this.emitPriceUpdate(inProgressBattle);
        return;
      }

      // Also emit prices during betting phase (no change data yet)
      const bettingBattle = getBettingBattle();
      if (bettingBattle) {
        this.emitPriceUpdate(bettingBattle);
      }
    }, 2000);
  }

  /**
   * Emit current price update for active battle
   */
  private emitPriceUpdate(battle: TWBattleRecord): void {
    const tokenAPrice = priceService.getPrice(battle.tokenA);
    const tokenBPrice = priceService.getPrice(battle.tokenB);

    // Calculate changes only if battle has started (has start prices)
    let tokenAChange: number | null = null;
    let tokenBChange: number | null = null;
    let leader: 'token_a' | 'token_b' | 'tie' | null = null;

    if (battle.tokenAStartPrice && battle.tokenBStartPrice) {
      tokenAChange = ((tokenAPrice - battle.tokenAStartPrice) / battle.tokenAStartPrice) * 100;
      tokenBChange = ((tokenBPrice - battle.tokenBStartPrice) / battle.tokenBStartPrice) * 100;
      leader = tokenAChange > tokenBChange ? 'token_a' : (tokenBChange > tokenAChange ? 'token_b' : 'tie');
    }

    this.emitEvent({
      type: 'price_update',
      battleId: battle.id,
      data: {
        tokenA: {
          symbol: battle.tokenA,
          price: tokenAPrice,
          change: tokenAChange,
        },
        tokenB: {
          symbol: battle.tokenB,
          price: tokenBPrice,
          change: tokenBChange,
        },
        leader,
      },
      timestamp: Date.now(),
    });
  }

  // ============================================
  // Public API
  // ============================================

  /**
   * Place a bet on the current battle
   * @param walletAddress - The bettor's wallet address
   * @param side - Which side to bet on (token_a or token_b)
   * @param amountLamports - Amount to bet in lamports
   */
  async placeBet(
    walletAddress: string,
    side: TWBetSide,
    amountLamports: number
  ): Promise<{ success: boolean; error?: string; bet?: TWBetRecord }> {
    // Validate wallet address format
    if (!isValidSolanaAddress(walletAddress)) {
      return { success: false, error: 'Invalid wallet address format' };
    }

    const battle = getBettingBattle();
    if (!battle) {
      return { success: false, error: 'No battle currently accepting bets' };
    }

    // Validate bet amount
    const minBetLamports = CONFIG.MIN_BET_SOL * LAMPORTS_PER_SOL;
    const maxBetLamports = CONFIG.MAX_BET_SOL * LAMPORTS_PER_SOL;

    if (amountLamports < minBetLamports) {
      return { success: false, error: `Minimum bet is ${CONFIG.MIN_BET_SOL} SOL` };
    }

    if (amountLamports > maxBetLamports) {
      return { success: false, error: `Maximum bet is ${CONFIG.MAX_BET_SOL} SOL` };
    }

    // Check for existing bet on opposite side
    const existingBet = getBet(battle.id, walletAddress);
    if (existingBet && existingBet.side !== side) {
      return { success: false, error: 'Cannot bet on opposite side of existing bet' };
    }

    // SECURITY: Atomic balance verification and fund locking
    // This prevents TOCTOU race conditions where user could withdraw between check and lock
    try {
      await balanceService.verifyAndLockBalance(
        walletAddress,
        amountLamports,
        'token_wars',
        battle.id
      );
    } catch (error: any) {
      // Check for insufficient balance error
      if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
        const available = await balanceService.getAvailableBalance(walletAddress);
        return {
          success: false,
          error: `Insufficient balance. Have ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL`
        };
      }
      return { success: false, error: 'Failed to lock bet on-chain. Please try again.' };
    }

    // Place the bet
    // SECURITY: Wrap in try/catch to refund if dbPlaceBet fails after funds are locked
    let bet: TWBetRecord;
    try {
      bet = dbPlaceBet(battle.id, walletAddress, side, amountLamports);
      // Note: verifyAndLockBalance already handles pending transaction tracking internally
    } catch (error) {
      // Critical error: bet couldn't be placed
      console.error(`[TokenWars] dbPlaceBet failed for ${walletAddress.slice(0, 8)}...`);

      console.error(`[TokenWars] Attempting refund for locked funds...`);
      try {
        await balanceService.refundFromGlobalVault(walletAddress, amountLamports, 'token_wars', battle.id);
        console.log(`[TokenWars] Successfully refunded ${walletAddress.slice(0, 8)}... after placeBet failure`);
      } catch (refundError) {
        // If refund also fails, log to failed payouts for manual recovery
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addFailedPayout(
          'token_wars',
          battle.id,
          walletAddress,
          amountLamports,
          'refund',
          `Bet failed after lock, refund failed: ${errorMsg}`,
          0
        );
        console.error(`[TokenWars] CRITICAL: Refund also failed for ${walletAddress.slice(0, 8)}... Added to recovery queue.`);
      }

      const errorMsg = error instanceof Error ? error.message : 'Failed to place bet';
      return { success: false, error: errorMsg };
    }

    // Get updated battle for odds
    const updatedBattle = getBattle(battle.id)!;

    this.emitEvent({
      type: 'bet_placed',
      battleId: battle.id,
      data: {
        walletAddress,
        side,
        amount: amountLamports,
        totalTokenA: updatedBattle.totalBetsTokenA,
        totalTokenB: updatedBattle.totalBetsTokenB,
        totalBettors: updatedBattle.totalBettors,
      },
      timestamp: Date.now(),
    });

    const tokenName = side === 'token_a' ? battle.tokenA : battle.tokenB;
    console.log(`[TokenWars] ${walletAddress.slice(0, 8)}... bet ${amountLamports / LAMPORTS_PER_SOL} SOL on ${tokenName}`);

    return { success: true, bet };
  }

  /**
   * Get current battle state
   */
  getBattleState(): TWBattleState | null {
    const battle = getActiveBattle();
    if (!battle) return null;

    const now = Date.now();
    let phase: TWBattleState['phase'];
    let timeRemaining = 0;

    switch (battle.status) {
      case 'betting':
        phase = 'betting';
        timeRemaining = Math.max(0, Math.floor((battle.bettingEndTime - now) / 1000));
        break;
      case 'in_progress':
        phase = 'in_progress';
        if (battle.battleStartTime) {
          const battleEnd = battle.battleStartTime + CONFIG.BATTLE_DURATION_SECONDS * 1000;
          timeRemaining = Math.max(0, Math.floor((battleEnd - now) / 1000));
        }
        break;
      case 'cooldown':
        phase = 'cooldown';
        timeRemaining = CONFIG.COOLDOWN_DURATION_SECONDS;
        break;
      default:
        phase = 'completed';
    }

    // Calculate current prices and changes
    let tokenAPriceNow, tokenBPriceNow, tokenAChangeNow, tokenBChangeNow;
    // Always get current prices for display
    tokenAPriceNow = priceService.getPrice(battle.tokenA);
    tokenBPriceNow = priceService.getPrice(battle.tokenB);

    // Calculate change only during in-progress battles (when we have start prices)
    if (battle.status === 'in_progress' && battle.tokenAStartPrice && battle.tokenBStartPrice) {
      tokenAChangeNow = ((tokenAPriceNow - battle.tokenAStartPrice) / battle.tokenAStartPrice) * 100;
      tokenBChangeNow = ((tokenBPriceNow - battle.tokenBStartPrice) / battle.tokenBStartPrice) * 100;
    }

    // Calculate odds (implied from pool distribution)
    const totalPool = battle.totalBetsTokenA + battle.totalBetsTokenB;
    const oddsTokenA = totalPool > 0 ? (battle.totalBetsTokenA / totalPool) * 100 : 50;
    const oddsTokenB = totalPool > 0 ? (battle.totalBetsTokenB / totalPool) * 100 : 50;

    return {
      battle,
      phase,
      timeRemaining,
      tokenAPriceNow,
      tokenBPriceNow,
      tokenAChangeNow,
      tokenBChangeNow,
      odds: {
        tokenA: oddsTokenA,
        tokenB: oddsTokenB,
      },
    };
  }

  /**
   * Get user's bet for current battle
   */
  getUserBet(walletAddress: string): TWBetRecord | null {
    const battle = getActiveBattle();
    if (!battle) return null;
    return getBet(battle.id, walletAddress);
  }

  /**
   * Get player stats
   */
  getPlayerStats(walletAddress: string): TWPlayerStats {
    return getPlayerStats(walletAddress);
  }

  /**
   * Get player bet history
   */
  getPlayerHistory(walletAddress: string, limit: number = 20): ReturnType<typeof getPlayerBetHistory> {
    return getPlayerBetHistory(walletAddress, limit);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 50): TWPlayerStats[] {
    return getLeaderboard(limit);
  }

  /**
   * Get recent battles
   */
  getRecentBattles(limit: number = 20): TWBattleRecord[] {
    return getRecentBattles(limit);
  }

  /**
   * Get available tokens
   */
  getAvailableTokens(): TokenInfo[] {
    return [...AVAILABLE_TOKENS];
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      bettingDurationSeconds: CONFIG.BETTING_DURATION_SECONDS,
      battleDurationSeconds: CONFIG.BATTLE_DURATION_SECONDS,
      cooldownDurationSeconds: CONFIG.COOLDOWN_DURATION_SECONDS,
      minBetSol: CONFIG.MIN_BET_SOL,
      maxBetSol: CONFIG.MAX_BET_SOL,
      rakePercent: CONFIG.RAKE_PERCENT,
    };
  }

  /**
   * Get upcoming matchups (pre-generated for display purposes)
   * Simulates matchup selection without affecting the real recentMatchups set
   * @param count - Number of upcoming matchups to generate (default: 3)
   */
  getUpcomingMatchups(count: number = 3): Array<{ tokenA: TokenInfo; tokenB: TokenInfo }> {
    const tokens = AVAILABLE_TOKENS.map(t => t.symbol);

    // Generate all possible pairs
    const allPairs: [string, string][] = [];
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        allPairs.push([tokens[i], tokens[j]]);
      }
    }

    // Create a copy of recent matchups to simulate selection
    const simulatedRecent = new Set(recentMatchups);

    // Get current battle to exclude it from upcoming
    const currentBattle = getActiveBattle();
    if (currentBattle) {
      const currentKey = [currentBattle.tokenA, currentBattle.tokenB].sort().join('-');
      simulatedRecent.add(currentKey);
    }

    const upcoming: Array<{ tokenA: TokenInfo; tokenB: TokenInfo }> = [];

    // Use a seeded approach for consistency within a time window
    // This ensures the "upcoming" display is stable for a period
    const timeWindow = Math.floor(Date.now() / 60000); // Changes every minute
    let seed = timeWindow;

    const seededRandom = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let n = 0; n < count; n++) {
      // Filter out recently used matchups
      const availablePairs = allPairs.filter(([a, b]) => {
        const key = [a, b].sort().join('-');
        return !simulatedRecent.has(key);
      });

      // If all pairs recently used, use all pairs
      const pairsToChooseFrom = availablePairs.length > 0 ? availablePairs : allPairs;

      // Pick using seeded random for stability
      const randomIndex = Math.floor(seededRandom() * pairsToChooseFrom.length);
      const [tokenA, tokenB] = pairsToChooseFrom[randomIndex];

      // Track this matchup in simulated set
      const matchupKey = [tokenA, tokenB].sort().join('-');
      simulatedRecent.add(matchupKey);

      // Get token info
      const tokenAInfo = AVAILABLE_TOKENS.find(t => t.symbol === tokenA)!;
      const tokenBInfo = AVAILABLE_TOKENS.find(t => t.symbol === tokenB)!;

      // Randomly swap order for variety (using seeded random)
      if (seededRandom() > 0.5) {
        upcoming.push({ tokenA: tokenBInfo, tokenB: tokenAInfo });
      } else {
        upcoming.push({ tokenA: tokenAInfo, tokenB: tokenBInfo });
      }
    }

    return upcoming;
  }

  // ============================================
  // Event System
  // ============================================

  /**
   * Subscribe to Token Wars events
   */
  subscribe(listener: (event: TWEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: TWEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    if (this.battleTimer) {
      clearTimeout(this.battleTimer);
      this.battleTimer = null;
    }

    if (this.priceUpdateTimer) {
      clearInterval(this.priceUpdateTimer);
      this.priceUpdateTimer = null;
    }

    this.eventListeners.clear();
    this.initialized = false;

    console.log('[TokenWars] Manager shutdown');
  }
}

// Export singleton instance
export const tokenWarsManager = new TokenWarsManager();
