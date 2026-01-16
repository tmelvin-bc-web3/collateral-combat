/**
 * On-Chain Round Manager
 *
 * Manages the lifecycle of prediction rounds on the Solana blockchain
 * using the session_betting program.
 *
 * Round Lifecycle:
 * 1. start_round() - Create new round with current price
 * 2. [25 seconds] - Betting period
 * 3. lock_round() - Lock with Pyth oracle price
 * 4. [5 seconds] - Waiting period
 * 5. settle_round() - Determine winner
 * 6. [1 hour grace period] - Players claim winnings
 * 7. close_round() - Reclaim rent
 */

import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';

// Program constants
const SESSION_BETTING_PROGRAM_ID = new PublicKey('4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA');

// Timing constants (in milliseconds)
const ROUND_DURATION_MS = 30_000; // 30 seconds
const LOCK_BUFFER_MS = 5_000; // Lock 5 seconds before end
const SETTLE_DELAY_MS = 1_000; // Wait 1 second after lock to settle
const CLOSE_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour
const ROUND_GAP_MS = 1_000; // 1 second between rounds

// Pyth price feed IDs (mainnet)
const PYTH_PRICE_FEEDS: Record<string, string> = {
  'BTC': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'SOL': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'ETH': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
};

// Pyth program on mainnet
const PYTH_PROGRAM_ID = new PublicKey('FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH');

interface RoundInfo {
  roundId: number;
  startTime: number;
  lockTime: number;
  endTime: number;
  status: 'open' | 'locked' | 'settled' | 'closed';
  startPrice?: number;
  endPrice?: number;
  winner?: 'up' | 'down' | 'draw';
}

interface SettledRound {
  roundId: number;
  settledAt: number;
  closeAt: number; // When it can be closed
}

export class OnChainRoundManager {
  private connection: Connection;
  private program: Program;
  private authority: Keypair;
  private priceFeedId: number[];
  private asset: string;

  // State tracking
  private currentRoundId: number = 0;
  private isRunning: boolean = false;
  private roundTimer: NodeJS.Timeout | null = null;
  private settledRounds: SettledRound[] = [];
  private closeCheckInterval: NodeJS.Timeout | null = null;

  // Event listeners
  private listeners: Set<(event: string, data: any) => void> = new Set();

  // PDAs
  private gameStatePDA: PublicKey;
  private globalVaultPDA: PublicKey;

  constructor(
    connection: Connection,
    authorityKeypair: Keypair,
    asset: string = 'BTC'
  ) {
    this.connection = connection;
    this.authority = authorityKeypair;
    this.asset = asset;

    // Get price feed ID for asset
    const feedIdHex = PYTH_PRICE_FEEDS[asset];
    if (!feedIdHex) {
      throw new Error(`No Pyth price feed configured for asset: ${asset}`);
    }
    this.priceFeedId = this.hexToBytes(feedIdHex);

    // Create provider and program
    const wallet = new Wallet(authorityKeypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Load IDL and create program
    // Note: In production, load IDL from file or fetch from chain
    this.program = new Program(
      require('../idl/session_betting.json'),
      provider
    );

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

  private hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  /**
   * Initialize the game state on-chain (only needed once)
   */
  async initializeGame(): Promise<string> {
    console.log('[OnChainRoundManager] Initializing game state...');

    const tx = await (this.program.methods as any)
      .initializeGame(this.priceFeedId)
      .accounts({
        gameState: this.gameStatePDA,
        globalVault: this.globalVaultPDA,
        authority: this.authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.authority])
      .rpc();

    console.log(`[OnChainRoundManager] Game initialized: ${tx}`);
    return tx;
  }

  /**
   * Start the round manager - begins continuous round operation
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[OnChainRoundManager] Already running');
      return;
    }

    console.log(`\n[OnChainRoundManager] Starting round manager for ${this.asset}...\n`);
    this.isRunning = true;

    // Get current round ID from chain
    try {
      const gameState = await (this.program.account as any).gameState.fetch(this.gameStatePDA);
      this.currentRoundId = gameState.currentRound.toNumber();
      console.log(`[OnChainRoundManager] Current round ID: ${this.currentRoundId}`);
    } catch (error) {
      console.log('[OnChainRoundManager] Game not initialized, initializing...');
      await this.initializeGame();
      this.currentRoundId = 0;
    }

    // Start the round loop
    this.startNextRound();

    // Start the close checker (checks every minute for rounds to close)
    this.closeCheckInterval = setInterval(() => {
      this.checkAndCloseRounds();
    }, 60_000);
  }

  /**
   * Stop the round manager
   */
  stop(): void {
    console.log('[OnChainRoundManager] Stopping...');
    this.isRunning = false;

    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    if (this.closeCheckInterval) {
      clearInterval(this.closeCheckInterval);
      this.closeCheckInterval = null;
    }
  }

  /**
   * Start a new round on-chain
   */
  private async startNextRound(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Get current price for start price
      const startPrice = await this.getCurrentPrice();
      const startPriceBN = new BN(Math.floor(startPrice * 1e8)); // 8 decimal places

      // Derive round and pool PDAs
      const roundIdBN = new BN(this.currentRoundId);
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );

      console.log(`[OnChainRoundManager] Starting round ${this.currentRoundId} @ $${startPrice.toFixed(2)}`);

      // Start round on-chain
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

      const roundInfo: RoundInfo = {
        roundId: this.currentRoundId,
        startTime: Date.now(),
        lockTime: Date.now() + ROUND_DURATION_MS - LOCK_BUFFER_MS,
        endTime: Date.now() + ROUND_DURATION_MS,
        status: 'open',
        startPrice,
      };

      this.notifyListeners('round_started', roundInfo);
      console.log(`[OnChainRoundManager] Round ${this.currentRoundId} started: ${tx}`);

      // Schedule lock
      setTimeout(() => this.lockCurrentRound(), ROUND_DURATION_MS - LOCK_BUFFER_MS);

    } catch (error: any) {
      console.error('[OnChainRoundManager] Error starting round:', error.message);
      // Retry after a delay
      this.roundTimer = setTimeout(() => this.startNextRound(), 5000);
    }
  }

  /**
   * Lock the current round with Pyth oracle price
   */
  private async lockCurrentRound(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const roundIdBN = new BN(this.currentRoundId);
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );

      // Get Pyth price feed account
      const priceFeedAccount = await this.getPythPriceFeedAccount();

      console.log(`[OnChainRoundManager] Locking round ${this.currentRoundId}...`);

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

      this.notifyListeners('round_locked', { roundId: this.currentRoundId });
      console.log(`[OnChainRoundManager] Round ${this.currentRoundId} locked: ${tx}`);

      // Schedule settle
      setTimeout(() => this.settleCurrentRound(), LOCK_BUFFER_MS + SETTLE_DELAY_MS);

    } catch (error: any) {
      console.error('[OnChainRoundManager] Error locking round:', error.message);
      // Try to settle anyway after delay
      setTimeout(() => this.settleCurrentRound(), LOCK_BUFFER_MS + SETTLE_DELAY_MS);
    }
  }

  /**
   * Settle the current round
   */
  private async settleCurrentRound(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const roundIdBN = new BN(this.currentRoundId);
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
        SESSION_BETTING_PROGRAM_ID
      );

      console.log(`[OnChainRoundManager] Settling round ${this.currentRoundId}...`);

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

      // Track for closing later
      this.settledRounds.push({
        roundId: this.currentRoundId,
        settledAt: Date.now(),
        closeAt: Date.now() + CLOSE_GRACE_PERIOD_MS,
      });

      this.notifyListeners('round_settled', { roundId: this.currentRoundId });
      console.log(`[OnChainRoundManager] Round ${this.currentRoundId} settled: ${tx}`);

      // Move to next round
      this.currentRoundId++;

      // Start next round after gap
      this.roundTimer = setTimeout(() => this.startNextRound(), ROUND_GAP_MS);

    } catch (error: any) {
      console.error('[OnChainRoundManager] Error settling round:', error.message);
      // Move to next round anyway
      this.currentRoundId++;
      this.roundTimer = setTimeout(() => this.startNextRound(), ROUND_GAP_MS);
    }
  }

  /**
   * Check and close rounds that are past their grace period
   */
  private async checkAndCloseRounds(): Promise<void> {
    const now = Date.now();
    const toClose = this.settledRounds.filter(r => r.closeAt <= now);

    for (const round of toClose) {
      try {
        await this.closeRound(round.roundId);
        // Remove from tracking
        this.settledRounds = this.settledRounds.filter(r => r.roundId !== round.roundId);
      } catch (error: any) {
        console.error(`[OnChainRoundManager] Error closing round ${round.roundId}:`, error.message);
      }
    }
  }

  /**
   * Close a round and reclaim rent
   */
  private async closeRound(roundId: number): Promise<string> {
    const roundIdBN = new BN(roundId);
    const [roundPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('round'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
      SESSION_BETTING_PROGRAM_ID
    );
    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), roundIdBN.toArrayLike(Buffer, 'le', 8)],
      SESSION_BETTING_PROGRAM_ID
    );

    console.log(`[OnChainRoundManager] Closing round ${roundId}...`);

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

    this.notifyListeners('round_closed', { roundId });
    console.log(`[OnChainRoundManager] Round ${roundId} closed (rent reclaimed): ${tx}`);

    return tx;
  }

  /**
   * Get current price from Pyth (simplified - in production use Pyth SDK)
   */
  private async getCurrentPrice(): Promise<number> {
    // For now, use a simple price fetch
    // In production, read from Pyth price feed account
    try {
      const priceFeedAccount = await this.getPythPriceFeedAccount();
      const accountInfo = await this.connection.getAccountInfo(priceFeedAccount);

      if (!accountInfo) {
        throw new Error('Price feed account not found');
      }

      // Parse Pyth price data (simplified)
      // In production, use pyth-sdk-solana
      // For now, return a placeholder that should be replaced with actual Pyth parsing
      console.warn('[OnChainRoundManager] Using placeholder price - implement Pyth parsing');
      return 50000; // Placeholder BTC price
    } catch (error) {
      console.error('[OnChainRoundManager] Error fetching price:', error);
      return 50000; // Fallback
    }
  }

  /**
   * Get Pyth price feed account for the configured asset
   */
  private async getPythPriceFeedAccount(): Promise<PublicKey> {
    // Pyth price feed accounts on mainnet
    // These are the actual Pyth price account addresses
    const PYTH_PRICE_ACCOUNTS: Record<string, string> = {
      'BTC': 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU', // BTC/USD
      'SOL': 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG', // SOL/USD
      'ETH': 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB', // ETH/USD
    };

    const accountStr = PYTH_PRICE_ACCOUNTS[this.asset];
    if (!accountStr) {
      throw new Error(`No Pyth price account configured for asset: ${this.asset}`);
    }

    return new PublicKey(accountStr);
  }

  /**
   * Subscribe to round events
   */
  subscribe(listener: (event: string, data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('[OnChainRoundManager] Listener error:', error);
      }
    });
  }

  /**
   * Get current round info
   */
  getCurrentRoundId(): number {
    return this.currentRoundId;
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Factory function to create manager
export function createOnChainRoundManager(
  rpcUrl: string,
  authorityPrivateKey: string,
  asset: string = 'BTC'
): OnChainRoundManager {
  const connection = new Connection(rpcUrl, 'confirmed');
  const authorityKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(authorityPrivateKey))
  );

  return new OnChainRoundManager(connection, authorityKeypair, asset);
}
