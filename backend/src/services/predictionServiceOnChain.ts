/**
 * On-Chain Prediction Service
 *
 * Manages prediction game rounds using on-chain round management
 * while keeping the existing balance system for bets.
 *
 * Key differences from off-chain version:
 * - Rounds are created/settled on-chain (verifiable)
 * - Uses Pyth oracle for price (tamper-proof)
 * - Accounts are closed after grace period (rent reclaimed)
 * - Bets still use balanceService for efficiency
 */

import { v4 as uuidv4 } from 'uuid';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import {
  PredictionRound,
  PredictionBet,
  PredictionSide,
  PredictionStats,
} from '../types';
import { priceService } from './priceService';
import { progressionService } from './progressionService';
import { pythVerificationService } from './pythVerificationService';
import * as userStatsDb from '../db/userStatsDatabase';
import { balanceService } from './balanceService';

// Program constants
const SESSION_BETTING_PROGRAM_ID = new PublicKey(
  '4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA'
);

// Timing constants
const ROUND_DURATION = 30; // 30 seconds per round
const LOCK_BEFORE_END = 5; // Stop accepting bets 5 seconds before end
const PLATFORM_FEE_PERCENT = 5; // 5% fee on winnings
const EARLY_BIRD_MAX_BONUS = 0.2; // 20% max bonus for early bets
const LAMPORTS_PER_SOL = 1_000_000_000;
const CLOSE_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

// Valid bet amounts in SOL
const VALID_BET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5];

// Pyth price feed IDs (mainnet)
const PYTH_PRICE_FEEDS: Record<string, number[]> = {
  BTC: hexToBytes('e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43'),
  SOL: hexToBytes('ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d'),
  ETH: hexToBytes('ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'),
};

// Pyth price accounts (mainnet)
const PYTH_PRICE_ACCOUNTS: Record<string, string> = {
  BTC: 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
  SOL: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
  ETH: 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
};

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

interface SettledRoundInfo {
  roundId: number;
  settledAt: number;
  closeAt: number;
}

class PredictionServiceOnChain {
  // Connection and program
  private connection: Connection;
  private authority: Keypair | null = null;
  private program: Program | null = null;
  private initialized = false;

  // PDAs
  private gameStatePDA: PublicKey;
  private globalVaultPDA: PublicKey;

  // Round state
  private rounds: Map<string, PredictionRound[]> = new Map();
  private currentRounds: Map<string, PredictionRound> = new Map();
  private currentOnChainRoundId: Map<string, number> = new Map();
  private userBets: Map<string, PredictionBet[]> = new Map();
  private stats: Map<string, PredictionStats> = new Map();
  private listeners: Set<(event: string, data: any) => void> = new Set();
  private activeAssets: Set<string> = new Set();
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();

  // Settled rounds awaiting closure
  private settledRounds: SettledRoundInfo[] = [];
  private closeCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Derive PDAs
    [this.gameStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('game')],
      SESSION_BETTING_PROGRAM_ID
    );
    [this.globalVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global_vault')],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  /**
   * Initialize the service
   */
  initialize(): boolean {
    try {
      const privateKeyStr = process.env.SESSION_BETTING_AUTHORITY_PRIVATE_KEY;
      if (!privateKeyStr) {
        console.warn(
          '[PredictionServiceOnChain] SESSION_BETTING_AUTHORITY_PRIVATE_KEY not set'
        );
        return false;
      }

      let secretKey: Uint8Array;
      if (privateKeyStr.startsWith('[')) {
        secretKey = Uint8Array.from(JSON.parse(privateKeyStr));
      } else {
        secretKey = bs58.decode(privateKeyStr);
      }

      this.authority = Keypair.fromSecretKey(secretKey);
      console.log(
        `[PredictionServiceOnChain] Authority: ${this.authority.publicKey.toBase58()}`
      );

      const wallet = new Wallet(this.authority);
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
      });
      this.program = new Program(
        require('../idl/session_betting.json'),
        provider
      );

      this.initialized = true;
      console.log('[PredictionServiceOnChain] Initialized successfully');

      // Start close checker
      this.closeCheckInterval = setInterval(() => {
        this.checkAndCloseRounds();
      }, 60_000);

      return true;
    } catch (error) {
      console.error('[PredictionServiceOnChain] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Initialize the on-chain game state (one-time setup)
   */
  async initializeGameState(asset: string = 'BTC'): Promise<string> {
    if (!this.authority || !this.program) {
      throw new Error('Service not initialized');
    }

    const priceFeedId = PYTH_PRICE_FEEDS[asset];
    if (!priceFeedId) {
      throw new Error(`No price feed for asset: ${asset}`);
    }

    console.log('[PredictionServiceOnChain] Initializing game state on-chain...');

    const tx = await (this.program.methods as any)
      .initializeGame(priceFeedId)
      .accounts({
        gameState: this.gameStatePDA,
        globalVault: this.globalVaultPDA,
        authority: this.authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.authority])
      .rpc();

    console.log(`[PredictionServiceOnChain] Game state initialized: ${tx}`);
    return tx;
  }

  /**
   * Start the prediction game for an asset
   */
  async start(asset: string = 'SOL'): Promise<void> {
    if (!this.initialized) {
      const success = this.initialize();
      if (!success) {
        console.warn(
          '[PredictionServiceOnChain] Cannot start - service not initialized (missing authority key)'
        );
        return;
      }
    }

    if (this.currentRounds.has(asset)) {
      console.log(`[PredictionServiceOnChain] Already running for ${asset}`);
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
        pushes: 0,
      });
      this.rounds.set(asset, []);
    }

    // Get current round ID from chain
    try {
      const gameState = await (this.program!.account as any).gameState.fetch(
        this.gameStatePDA
      );
      this.currentOnChainRoundId.set(asset, gameState.currentRound.toNumber());
    } catch (error) {
      console.log(
        '[PredictionServiceOnChain] Game state not found, initializing...'
      );
      try {
        await this.initializeGameState(asset);
        this.currentOnChainRoundId.set(asset, 0);
      } catch (initError) {
        console.error('[PredictionServiceOnChain] Failed to initialize game state on-chain:', initError);
        console.warn('[PredictionServiceOnChain] Continuing without on-chain prediction - authority wallet may need SOL');
        return; // Don't crash, just skip on-chain prediction
      }
    }

    console.log(
      `\n[PredictionServiceOnChain] Starting prediction game for ${asset}...\n`
    );
    this.startNewRound(asset);
  }

  /**
   * Stop the prediction game
   */
  stop(asset: string): void {
    const timer = this.roundTimers.get(asset);
    if (timer) {
      clearTimeout(timer);
      this.roundTimers.delete(asset);
    }
    this.currentRounds.delete(asset);
    this.activeAssets.delete(asset);
    console.log(`\n[PredictionServiceOnChain] Stopped for ${asset}\n`);
  }

  /**
   * Start a new round (on-chain + off-chain tracking)
   */
  private async startNewRound(asset: string): Promise<void> {
    if (!this.authority || !this.program) return;

    const now = Date.now();
    const startPrice = priceService.getPrice(asset);
    const onChainRoundId = this.currentOnChainRoundId.get(asset) || 0;

    try {
      // Create round on-chain
      const startPriceBN = new BN(Math.floor(startPrice * 1e8));
      const roundIdBN = new BN(onChainRoundId);

      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );

      const tx = await (this.program.methods as any)
        .startRound(startPriceBN)
        .accounts({
          gameState: this.gameStatePDA,
          round: roundPDA,
          pool: poolPDA,
          authority: this.authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.authority])
        .rpc();

      console.log(
        `[PredictionServiceOnChain] Round ${onChainRoundId} started on-chain: ${tx}`
      );
    } catch (error: any) {
      console.error(
        '[PredictionServiceOnChain] Failed to start round on-chain:',
        error.message
      );
      // Continue with off-chain tracking anyway
    }

    // Create off-chain round tracking
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
      totalPool: 0,
      onChainRoundId: onChainRoundId,
    };

    this.currentRounds.set(asset, round);
    const assetRounds = this.rounds.get(asset) || [];
    assetRounds.push(round);
    if (assetRounds.length > 50) {
      assetRounds.shift();
    }
    this.rounds.set(asset, assetRounds);

    // Record Pyth-verified price for audit trail
    pythVerificationService.recordPriceAudit('oracle', round.id, 'round_start', asset, startPrice)
      .catch(err => console.error('[Oracle] Pyth audit failed:', err));

    console.log(
      `[PredictionServiceOnChain] Round ${round.id.slice(0, 8)}... started for ${asset} @ $${startPrice.toFixed(2)}`
    );
    this.notifyListeners('round_started', round);

    // Schedule lock
    const lockTimer = setTimeout(() => {
      this.lockRound(asset);
    }, (ROUND_DURATION - LOCK_BEFORE_END) * 1000);

    // Schedule settle
    const endTimer = setTimeout(() => {
      this.settleRound(asset).catch((err) => {
        console.error(
          `[PredictionServiceOnChain] Error settling round:`,
          err
        );
      });
    }, ROUND_DURATION * 1000);

    this.roundTimers.set(`${asset}_lock`, lockTimer);
    this.roundTimers.set(`${asset}_end`, endTimer);
  }

  /**
   * Lock round (on-chain + off-chain)
   */
  private async lockRound(asset: string): Promise<void> {
    const round = this.currentRounds.get(asset);
    if (!round || round.status !== 'betting') return;

    // Lock on-chain with Pyth oracle
    if (this.authority && this.program && round.onChainRoundId !== undefined) {
      try {
        const roundIdBN = new BN(round.onChainRoundId);
        const [roundPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
          SESSION_BETTING_PROGRAM_ID
        );

        const priceFeedAccount = new PublicKey(
          PYTH_PRICE_ACCOUNTS[asset] || PYTH_PRICE_ACCOUNTS['SOL']
        );

        const tx = await (this.program.methods as any)
          .lockRound()
          .accounts({
            gameState: this.gameStatePDA,
            round: roundPDA,
            priceFeed: priceFeedAccount,
            authority: this.authority.publicKey,
          })
          .signers([this.authority])
          .rpc();

        console.log(
          `[PredictionServiceOnChain] Round ${round.onChainRoundId} locked on-chain: ${tx}`
        );
      } catch (error: any) {
        console.error(
          '[PredictionServiceOnChain] Failed to lock on-chain:',
          error.message
        );
      }
    }

    round.status = 'locked';
    console.log(
      `[PredictionServiceOnChain] Round locked | Long: $${round.longPool} | Short: $${round.shortPool}`
    );
    this.notifyListeners('round_locked', round);
  }

  /**
   * Settle round and determine winner
   */
  private async settleRound(asset: string): Promise<void> {
    const round = this.currentRounds.get(asset);
    if (!round) return;

    const endPrice = priceService.getPrice(asset);
    round.endPrice = endPrice;
    round.status = 'settled';

    // Record Pyth-verified price for audit trail
    pythVerificationService.recordPriceAudit('oracle', round.id, 'round_end', asset, endPrice)
      .catch(err => console.error('[Oracle] Pyth audit failed:', err));

    // Determine winner
    if (endPrice > round.startPrice) {
      round.winner = 'long';
    } else if (endPrice < round.startPrice) {
      round.winner = 'short';
    } else {
      round.winner = 'push';
    }

    // Settle on-chain
    if (this.authority && this.program && round.onChainRoundId !== undefined) {
      try {
        const roundIdBN = new BN(round.onChainRoundId);
        const [roundPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
          SESSION_BETTING_PROGRAM_ID
        );
        const [poolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
          SESSION_BETTING_PROGRAM_ID
        );

        const tx = await (this.program.methods as any)
          .settleRound()
          .accounts({
            gameState: this.gameStatePDA,
            round: roundPDA,
            pool: poolPDA,
            caller: this.authority.publicKey,
          })
          .signers([this.authority])
          .rpc();

        console.log(
          `[PredictionServiceOnChain] Round ${round.onChainRoundId} settled on-chain: ${tx}`
        );

        // Track for closing later
        this.settledRounds.push({
          roundId: round.onChainRoundId,
          settledAt: Date.now(),
          closeAt: Date.now() + CLOSE_GRACE_PERIOD_MS,
        });
      } catch (error: any) {
        console.error(
          '[PredictionServiceOnChain] Failed to settle on-chain:',
          error.message
        );
      }
    }

    // Calculate payouts (off-chain credit to balances)
    await this.calculatePayouts(round);

    // Update stats
    const stats = this.stats.get(asset)!;
    stats.totalRounds++;
    stats.totalVolume += round.totalPool;
    if (round.winner === 'long') stats.longWins++;
    else if (round.winner === 'short') stats.shortWins++;
    else stats.pushes++;

    const priceChange = (
      ((endPrice - round.startPrice) / round.startPrice) *
      100
    ).toFixed(3);
    console.log(
      `[PredictionServiceOnChain] Round settled | ${asset}: $${round.startPrice.toFixed(2)} -> $${endPrice.toFixed(2)} (${priceChange}%) | Winner: ${round.winner?.toUpperCase()}`
    );

    this.notifyListeners('round_settled', round);

    // Clear timers
    clearTimeout(this.roundTimers.get(`${asset}_lock`));
    clearTimeout(this.roundTimers.get(`${asset}_end`));

    // Increment round ID and start next
    this.currentRounds.delete(asset);
    const nextRoundId = (this.currentOnChainRoundId.get(asset) || 0) + 1;
    this.currentOnChainRoundId.set(asset, nextRoundId);

    if (this.activeAssets.has(asset)) {
      setTimeout(() => this.startNewRound(asset), 1000);
    }
  }

  /**
   * Check and close rounds past grace period
   */
  private async checkAndCloseRounds(): Promise<void> {
    if (!this.authority || !this.program) return;

    const now = Date.now();
    const toClose = this.settledRounds.filter((r) => r.closeAt <= now);

    for (const round of toClose) {
      try {
        const roundIdBN = new BN(round.roundId);
        const [roundPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
          SESSION_BETTING_PROGRAM_ID
        );
        const [poolPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
          SESSION_BETTING_PROGRAM_ID
        );

        const tx = await (this.program.methods as any)
          .closeRound()
          .accounts({
            gameState: this.gameStatePDA,
            round: roundPDA,
            pool: poolPDA,
            authority: this.authority.publicKey,
          })
          .signers([this.authority])
          .rpc();

        console.log(
          `[PredictionServiceOnChain] Round ${round.roundId} closed (rent reclaimed): ${tx}`
        );
        this.settledRounds = this.settledRounds.filter(
          (r) => r.roundId !== round.roundId
        );
      } catch (error: any) {
        console.error(
          `[PredictionServiceOnChain] Failed to close round ${round.roundId}:`,
          error.message
        );
      }
    }
  }

  /**
   * Calculate payouts for winners
   */
  private async calculatePayouts(round: PredictionRound): Promise<void> {
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

    // Refund on push or no losers
    if (round.winner === 'push' || losingPool === 0) {
      for (const bet of [...round.longBets, ...round.shortBets]) {
        bet.status = round.winner === 'push' ? 'push' : 'cancelled';
        bet.payout = bet.amount;
        const refundLamports = Math.round(bet.amount * LAMPORTS_PER_SOL);
        await balanceService.creditWinnings(
          bet.bettor,
          refundLamports,
          'oracle',
          round.id
        );
        this.recordBetToDatabase(bet, round);
      }
      return;
    }

    // Pay winners
    // SECURITY FIX: Early bird bonus could push total payouts above locked pool
    // Solution: Calculate raw payouts, then normalize if total exceeds available
    const distributablePool = losingPool * (1 - PLATFORM_FEE_PERCENT / 100);
    const maxAvailablePayout = winningPool + distributablePool; // Winners get stake back + share of losers

    // First pass: calculate raw payouts with early bird bonus
    const rawPayouts: { bet: PredictionBet; payout: number }[] = [];
    let totalRawPayout = 0;

    for (const bet of winningBets) {
      const share = bet.amount / winningPool;
      const basePayout = bet.amount + distributablePool * share;
      const earlyBirdMultiplier = this.getEarlyBirdMultiplier(bet, round);
      const rawPayout = basePayout * earlyBirdMultiplier;
      rawPayouts.push({ bet, payout: rawPayout });
      totalRawPayout += rawPayout;
    }

    // Normalize if total exceeds available (shouldn't happen often, but prevents insolvency)
    const scaleFactor = totalRawPayout > maxAvailablePayout
      ? maxAvailablePayout / totalRawPayout
      : 1;

    if (scaleFactor < 1) {
      console.warn(`[PredictionServiceOnChain] Early bird bonus exceeded pool, scaling payouts by ${scaleFactor.toFixed(4)}`);
    }

    // Second pass: apply scaled payouts
    for (const { bet, payout } of rawPayouts) {
      bet.payout = payout * scaleFactor;
      bet.status = 'won';

      const payoutLamports = Math.round(bet.payout * LAMPORTS_PER_SOL);
      await balanceService.creditWinnings(
        bet.bettor,
        payoutLamports,
        'oracle',
        round.id
      );
      this.recordBetToDatabase(bet, round);
    }

    // Mark losers
    const losingBets =
      round.winner === 'long' ? round.shortBets : round.longBets;
    for (const bet of losingBets) {
      bet.status = 'lost';
      bet.payout = 0;
      this.recordBetToDatabase(bet, round);
    }

    this.awardPredictionXp(round, winningBets, losingBets);
  }

  private getEarlyBirdMultiplier(
    bet: PredictionBet,
    round: PredictionRound
  ): number {
    const timeIntoRound = bet.placedAt - round.startTime;
    const bettingDuration = round.lockTime - round.startTime;
    const timeRatio = Math.min(1, Math.max(0, timeIntoRound / bettingDuration));
    return 1 + EARLY_BIRD_MAX_BONUS * (1 - timeRatio);
  }

  private recordBetToDatabase(bet: PredictionBet, round: PredictionRound): void {
    try {
      const profitLoss = (bet.payout || 0) - bet.amount;
      userStatsDb.recordWager(
        bet.bettor,
        'prediction',
        bet.amount,
        bet.status as userStatsDb.WagerOutcome,
        profitLoss,
        round.id
      );
    } catch (error) {
      console.error('[PredictionServiceOnChain] Failed to record bet:', error);
    }
  }

  private awardPredictionXp(
    round: PredictionRound,
    winningBets: PredictionBet[],
    losingBets: PredictionBet[]
  ): void {
    winningBets.forEach((bet) => {
      const xpAmount = 50 + Math.floor(bet.amount * 0.1);
      progressionService.awardXp(
        bet.bettor,
        xpAmount,
        'prediction',
        round.id,
        `Correct ${bet.side} prediction on ${round.asset}`
      );
    });

    losingBets.forEach((bet) => {
      const xpAmount = 10 + Math.floor(bet.amount * 0.02);
      progressionService.awardXp(
        bet.bettor,
        xpAmount,
        'prediction',
        round.id,
        `${bet.side} prediction on ${round.asset}`
      );
    });
  }

  /**
   * Place a bet
   * SECURITY: Funds are locked on-chain immediately to prevent withdraw-after-bet exploit
   */
  async placeBet(
    asset: string,
    side: PredictionSide,
    amount: number,
    bettor: string
  ): Promise<PredictionBet> {
    const round = this.currentRounds.get(asset);

    if (!round) throw new Error('No active round');
    if (round.status !== 'betting') throw new Error('Betting is closed');
    if (!VALID_BET_AMOUNTS.includes(amount)) {
      throw new Error(`Invalid bet amount. Valid: ${VALID_BET_AMOUNTS.join(', ')} SOL`);
    }

    const amountLamports = Math.round(amount * LAMPORTS_PER_SOL);
    const hasSufficient = await balanceService.hasSufficientBalance(
      bettor,
      amountLamports
    );
    if (!hasSufficient) {
      const available = await balanceService.getAvailableBalance(bettor);
      throw new Error(
        `Insufficient balance. Available: ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL`
      );
    }

    // Create pending debit to prevent double-spending while we process
    const pendingId = await balanceService.debitPending(
      bettor,
      amountLamports,
      'oracle',
      round.id
    );

    // SECURITY: Lock funds on-chain IMMEDIATELY
    // This prevents the withdraw-after-bet exploit where user could:
    // 1. Place bet (off-chain tracking)
    // 2. Withdraw from PDA (on-chain)
    // 3. Lose the bet but have no funds to collect
    const lockTx = await balanceService.transferToGlobalVault(bettor, amountLamports, 'oracle');
    if (!lockTx) {
      // Failed to lock funds on-chain - cancel the bet
      balanceService.cancelDebit(pendingId);
      throw new Error('Failed to lock funds on-chain. Please try again.');
    }

    const bet: PredictionBet = {
      id: uuidv4(),
      roundId: round.id,
      bettor,
      side,
      amount,
      placedAt: Date.now(),
      status: 'pending',
      lockTx, // Track the lock transaction
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

    balanceService.confirmDebit(pendingId);

    console.log(
      `[PredictionServiceOnChain] ${bettor.slice(0, 8)}... bet ${amount} SOL ${side.toUpperCase()} on ${asset} (locked: ${lockTx.slice(0, 8)}...)`
    );
    this.notifyListeners('bet_placed', { round, bet });

    return bet;
  }

  // Getters
  getCurrentRound(asset: string): PredictionRound | undefined {
    return this.currentRounds.get(asset);
  }

  getRecentRounds(asset: string, limit: number = 10): PredictionRound[] {
    const rounds = this.rounds.get(asset) || [];
    return rounds.slice(-limit).reverse();
  }

  getUserBets(wallet: string, limit: number = 20): PredictionBet[] {
    const bets = this.userBets.get(wallet) || [];
    return bets.slice(-limit).reverse();
  }

  getStats(asset: string): PredictionStats | undefined {
    return this.stats.get(asset);
  }

  getActiveAssets(): string[] {
    return Array.from(this.activeAssets);
  }

  isRunning(asset: string): boolean {
    return this.activeAssets.has(asset);
  }

  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach((listener) => listener(event, data));
  }
}

// Singleton
export const predictionServiceOnChain = new PredictionServiceOnChain();
