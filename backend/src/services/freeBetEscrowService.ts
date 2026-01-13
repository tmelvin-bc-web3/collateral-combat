/**
 * FreeBetEscrowService
 *
 * Places bets on behalf of users using platform escrow wallet.
 * - Load escrow keypair from ESCROW_WALLET_PRIVATE_KEY env
 * - Place bets on-chain (escrow owns the position)
 * - Claim winnings from contract
 * - Transfer winnings to user (minus original stake)
 * - Background job to process settled rounds
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl, Wallet } from '@coral-xyz/anchor';
import { progressionService } from './progressionService';
import {
  createFreeBetPosition,
  getFreeBetPositionsByStatusType,
  getFreeBetPositionsForWallet,
  updateFreeBetPositionToPlaced,
  updateFreeBetPositionToClaimed,
  updateFreeBetPositionToSettled,
  updateFreeBetPositionStatusOnly,
  FreeBetPosition,
  FreeBetPositionStatus,
} from '../db/progressionDatabase';

// Program ID from the prediction program
const PREDICTION_PROGRAM_ID = new PublicKey('9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF');

// PDA Seeds
const ROUND_SEED = Buffer.from('round');
const POSITION_SEED = Buffer.from('position');
const ESCROW_SEED = Buffer.from('escrow');

// Constants
const FREE_BET_AMOUNT_LAMPORTS = 10_000_000; // 0.01 SOL (MIN_BET_LAMPORTS)
const PROCESS_INTERVAL_MS = 10_000; // 10 seconds

// Type for bet side - maps to database 'long'/'short' and contract 'up'/'down'
type FreeBetSide = 'long' | 'short';

// Map database side to contract side
function sideToContract(side: FreeBetSide): 'up' | 'down' {
  return side === 'long' ? 'up' : 'down';
}

// Map contract winner to database-compatible check
function checkWinner(winner: string, side: FreeBetSide): boolean {
  if (winner === 'Up' && side === 'long') return true;
  if (winner === 'Down' && side === 'short') return true;
  return false;
}

// IDL for the prediction program - loaded from the same JSON as frontend
// Using 'any' type to avoid IDL version compatibility issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PREDICTION_IDL: any = {
  address: '9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF',
  metadata: {
    name: 'prediction_program',
    version: '0.1.0',
    spec: '0.1.0',
  },
  instructions: [
    {
      name: 'place_bet',
      discriminator: [222, 62, 67, 220, 63, 166, 126, 33],
      accounts: [
        { name: 'round', writable: true },
        { name: 'position', writable: true },
        { name: 'escrow', writable: true },
        { name: 'player', writable: true, signer: true },
        { name: 'system_program' },
      ],
      args: [
        { name: 'side', type: { defined: { name: 'BetSide' } } },
        { name: 'amount', type: 'u64' },
      ],
    },
    {
      name: 'claim_winnings',
      discriminator: [161, 215, 24, 59, 14, 236, 242, 221],
      accounts: [
        { name: 'round' },
        { name: 'position', writable: true },
        { name: 'escrow', writable: true },
        { name: 'player', writable: true, signer: true },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: 'PredictionRound',
      discriminator: [201, 208, 139, 53, 9, 173, 81, 178],
    },
    {
      name: 'PlayerPosition',
      discriminator: [46, 228, 129, 16, 91, 214, 62, 124],
    },
  ],
  types: [
    {
      name: 'BetSide',
      type: {
        kind: 'enum',
        variants: [{ name: 'Up' }, { name: 'Down' }],
      },
    },
    {
      name: 'PredictionRound',
      type: {
        kind: 'struct',
        fields: [
          { name: 'round_id', type: 'u64' },
          { name: 'start_time', type: 'i64' },
          { name: 'lock_time', type: 'i64' },
          { name: 'start_price', type: 'u64' },
          { name: 'end_price', type: 'u64' },
          { name: 'up_pool', type: 'u64' },
          { name: 'down_pool', type: 'u64' },
          { name: 'total_pool', type: 'u64' },
          { name: 'status', type: { defined: { name: 'RoundStatus' } } },
          { name: 'winner', type: { defined: { name: 'WinnerSide' } } },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
    {
      name: 'RoundStatus',
      type: {
        kind: 'enum',
        variants: [{ name: 'Open' }, { name: 'Locked' }, { name: 'Settled' }],
      },
    },
    {
      name: 'WinnerSide',
      type: {
        kind: 'enum',
        variants: [{ name: 'None' }, { name: 'Up' }, { name: 'Down' }, { name: 'Draw' }],
      },
    },
    {
      name: 'PlayerPosition',
      type: {
        kind: 'struct',
        fields: [
          { name: 'player', type: 'pubkey' },
          { name: 'round_id', type: 'u64' },
          { name: 'side', type: { defined: { name: 'BetSide' } } },
          { name: 'amount', type: 'u64' },
          { name: 'claimed', type: 'bool' },
          { name: 'bump', type: 'u8' },
        ],
      },
    },
  ],
  errors: [],
};

// Helper to parse RoundStatus from account data
function parseRoundStatus(status: { open?: object; locked?: object; settled?: object }): string {
  if (status.settled) return 'Settled';
  if (status.locked) return 'Locked';
  return 'Open';
}

// Helper to parse WinnerSide from account data
function parseWinnerSide(winner: { none?: object; up?: object; down?: object; draw?: object }): string {
  if (winner.up) return 'Up';
  if (winner.down) return 'Down';
  if (winner.draw) return 'Draw';
  return 'None';
}

class FreeBetEscrowService {
  private connection: Connection | null = null;
  private escrowKeypair: Keypair | null = null;
  private program: Program | null = null;
  private processInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private listeners: Set<(event: string, data: unknown) => void> = new Set();

  constructor() {
    // Initialization happens in init()
  }

  /**
   * Initialize the service with Solana connection and escrow wallet
   */
  async init(): Promise<boolean> {
    try {
      // Get RPC URL from environment
      const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      this.connection = new Connection(rpcUrl, 'confirmed');

      // Load escrow keypair from environment
      const escrowPrivateKey = process.env.ESCROW_WALLET_PRIVATE_KEY;
      if (!escrowPrivateKey) {
        console.warn('[FreeBetEscrow] ESCROW_WALLET_PRIVATE_KEY not set. Service will be disabled.');
        return false;
      }

      // Parse the private key (base58 or JSON array format)
      try {
        if (escrowPrivateKey.startsWith('[')) {
          // JSON array format
          const secretKey = Uint8Array.from(JSON.parse(escrowPrivateKey));
          this.escrowKeypair = Keypair.fromSecretKey(secretKey);
        } else {
          // Base58 format - decode manually
          const bs58 = await import('bs58');
          const secretKey = bs58.default.decode(escrowPrivateKey);
          this.escrowKeypair = Keypair.fromSecretKey(secretKey);
        }
      } catch (parseError) {
        console.error('[FreeBetEscrow] Failed to parse escrow private key:', parseError);
        return false;
      }

      console.log(`[FreeBetEscrow] Escrow wallet: ${this.escrowKeypair.publicKey.toBase58()}`);

      // Create Anchor wallet wrapper
      const wallet = new Wallet(this.escrowKeypair);

      // Create provider and program
      const provider = new AnchorProvider(this.connection, wallet, {
        commitment: 'confirmed',
        skipPreflight: true,
      });

      try {
        this.program = new Program(PREDICTION_IDL, provider);
      } catch (programError) {
        console.warn('[FreeBetEscrow] Program init warning (non-fatal):', programError);
        // Program can still work - the error is likely from account validation
        this.program = new Program(PREDICTION_IDL, provider);
      }

      this.isInitialized = true;
      console.log('[FreeBetEscrow] Service initialized successfully');

      // Start background processing
      this.startProcessing();

      return true;
    } catch (error) {
      console.error('[FreeBetEscrow] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Check if the service is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.escrowKeypair !== null && this.program !== null;
  }

  /**
   * Get PDA for round account
   */
  private getRoundPDA(roundId: number): [PublicKey, number] {
    const roundIdBN = new BN(roundId);
    return PublicKey.findProgramAddressSync(
      [ROUND_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      PREDICTION_PROGRAM_ID
    );
  }

  /**
   * Get PDA for escrow account (contract escrow, not our service escrow)
   */
  private getContractEscrowPDA(roundId: number): [PublicKey, number] {
    const roundIdBN = new BN(roundId);
    return PublicKey.findProgramAddressSync(
      [ESCROW_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      PREDICTION_PROGRAM_ID
    );
  }

  /**
   * Get PDA for player position
   */
  private getPositionPDA(roundId: number, player: PublicKey): [PublicKey, number] {
    const roundIdBN = new BN(roundId);
    return PublicKey.findProgramAddressSync(
      [POSITION_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      PREDICTION_PROGRAM_ID
    );
  }

  /**
   * Place a free bet on behalf of a user
   * The escrow wallet places the bet on-chain, user receives winnings only (not stake)
   */
  async placeFreeBet(
    userWallet: string,
    roundId: number,
    side: FreeBetSide
  ): Promise<{ success: boolean; position?: FreeBetPosition; error?: string; txSignature?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Deduct free bet credit from user's balance
      const deductResult = progressionService.useFreeBetCredit(userWallet, 'oracle', `Free bet on round ${roundId}`);
      if (!deductResult.success) {
        return { success: false, error: 'No free bets available' };
      }

      // Create position record in database
      const position = createFreeBetPosition(userWallet, roundId, side, FREE_BET_AMOUNT_LAMPORTS);

      // Place the bet on-chain using escrow wallet
      const [roundPDA] = this.getRoundPDA(roundId);
      const [positionPDA] = this.getPositionPDA(roundId, this.escrowKeypair!.publicKey);
      const [contractEscrowPDA] = this.getContractEscrowPDA(roundId);

      const contractSide = sideToContract(side);
      const betSide = contractSide === 'up' ? { up: {} } : { down: {} };
      const amount = new BN(FREE_BET_AMOUNT_LAMPORTS);

      // Build and send transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const methods = this.program!.methods as any;
      const txSignature = await methods
        .placeBet(betSide, amount)
        .accounts({
          round: roundPDA,
          position: positionPDA,
          escrow: contractEscrowPDA,
          player: this.escrowKeypair!.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Update position with transaction signature (status: 'placed')
      updateFreeBetPositionToPlaced(position.id, txSignature);

      console.log(`[FreeBetEscrow] Placed free bet for ${userWallet} on round ${roundId} (${side}). TX: ${txSignature}`);

      this.notifyListeners('free_bet_placed', {
        userWallet,
        roundId,
        side,
        txSignature,
      });

      return {
        success: true,
        position: { ...position, status: 'placed' as FreeBetPositionStatus, txSignatureBet: txSignature },
        txSignature,
      };
    } catch (error) {
      console.error(`[FreeBetEscrow] Failed to place free bet:`, error);

      // Refund the free bet credit if on-chain bet failed
      progressionService.addFreeBetCredit(userWallet, 1, 'Refund: on-chain bet failed');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place bet on-chain',
      };
    }
  }

  /**
   * Claim winnings from the contract for a position
   */
  async claimEscrowWinnings(position: FreeBetPosition): Promise<{ success: boolean; txSignature?: string; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const [roundPDA] = this.getRoundPDA(position.roundId);
      const [positionPDA] = this.getPositionPDA(position.roundId, this.escrowKeypair!.publicKey);
      const [contractEscrowPDA] = this.getContractEscrowPDA(position.roundId);

      // Build and send claim transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const methods = this.program!.methods as any;
      const txSignature = await methods
        .claimWinnings()
        .accounts({
          round: roundPDA,
          position: positionPDA,
          escrow: contractEscrowPDA,
          player: this.escrowKeypair!.publicKey,
        })
        .rpc();

      // Update position status - mark as won/lost based on outcome (will be finalized in settleToUser)
      // For now just mark as 'won' since we're claiming (only winners can claim)
      updateFreeBetPositionToClaimed(position.id, 'won', 0, txSignature);

      console.log(`[FreeBetEscrow] Claimed winnings for position ${position.id}. TX: ${txSignature}`);

      return { success: true, txSignature };
    } catch (error) {
      console.error(`[FreeBetEscrow] Failed to claim winnings:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to claim winnings',
      };
    }
  }

  /**
   * Transfer winnings to user (profit only, not the stake)
   * Free bets are "winnings only" - user keeps profit but not original stake
   */
  async settleToUser(position: FreeBetPosition): Promise<{ success: boolean; txSignature?: string; error?: string }> {
    if (!this.isReady()) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Get the round data to calculate payout
      const [roundPDA] = this.getRoundPDA(position.roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program!.account as any;
      const roundAccount = await accounts.predictionRound.fetch(roundPDA);

      // Check if this position won
      const winner = parseWinnerSide(roundAccount.winner);

      if (winner === 'Draw') {
        // Draw - no payout, mark as settled
        updateFreeBetPositionStatusOnly(position.id, 'settled');
        console.log(`[FreeBetEscrow] Round ${position.roundId} was a draw. No payout for position ${position.id}`);
        return { success: true };
      }

      if (!checkWinner(winner, position.side)) {
        // Lost - no payout, mark as lost
        updateFreeBetPositionStatusOnly(position.id, 'lost');
        console.log(`[FreeBetEscrow] Position ${position.id} lost. No payout.`);
        return { success: true };
      }

      // Calculate winnings
      // Payout = (stake / winningPool) * losingPool * (1 - platformFee)
      const upPool = roundAccount.upPool.toNumber();
      const downPool = roundAccount.downPool.toNumber();
      const stake = position.amountLamports;

      const winningPool = position.side === 'long' ? upPool : downPool;
      const losingPool = position.side === 'long' ? downPool : upPool;

      // Platform fee is 5% (500 bps)
      const platformFeeBps = 500;
      const share = stake / winningPool;
      const grossWinnings = losingPool * share;
      const netWinnings = Math.floor(grossWinnings * (10000 - platformFeeBps) / 10000);

      // Only transfer winnings (profit), not the stake
      // Free bets are "winnings only"
      if (netWinnings <= 0) {
        updateFreeBetPositionStatusOnly(position.id, 'settled');
        console.log(`[FreeBetEscrow] No winnings to transfer for position ${position.id}`);
        return { success: true };
      }

      // Transfer winnings to user
      const userPubkey = new PublicKey(position.walletAddress);

      const transferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.escrowKeypair!.publicKey,
          toPubkey: userPubkey,
          lamports: netWinnings,
        })
      );

      const txSignature = await sendAndConfirmTransaction(this.connection!, transferTx, [this.escrowKeypair!]);

      // Update position with payout info - mark as settled with settlement tx
      updateFreeBetPositionToClaimed(position.id, 'won', netWinnings, position.txSignatureClaim || '');
      updateFreeBetPositionToSettled(position.id, txSignature);

      console.log(
        `[FreeBetEscrow] Settled position ${position.id}. ` +
          `Transferred ${netWinnings / LAMPORTS_PER_SOL} SOL to ${position.walletAddress}. TX: ${txSignature}`
      );

      this.notifyListeners('free_bet_settled', {
        userWallet: position.walletAddress,
        roundId: position.roundId,
        payoutLamports: netWinnings,
        txSignature,
      });

      return { success: true, txSignature };
    } catch (error) {
      console.error(`[FreeBetEscrow] Failed to settle to user:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to settle to user',
      };
    }
  }

  /**
   * Process all settled rounds - claim winnings and transfer to users
   */
  async processSettledRounds(): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      // Get all placed positions (bets placed, waiting for settlement)
      const placedPositions = getFreeBetPositionsByStatusType('placed');

      for (const position of placedPositions) {
        try {
          // Check if round is settled
          const [roundPDA] = this.getRoundPDA(position.roundId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const accounts = this.program!.account as any;
          const roundAccount = await accounts.predictionRound.fetch(roundPDA);

          const status = parseRoundStatus(roundAccount.status);
          if (status !== 'Settled') {
            continue; // Round not settled yet
          }

          // Check if this position won
          const winner = parseWinnerSide(roundAccount.winner);
          const isWinner = checkWinner(winner, position.side);

          if (!isWinner && winner !== 'Draw') {
            // Lost - mark as lost and skip
            updateFreeBetPositionStatusOnly(position.id, 'lost');
            console.log(`[FreeBetEscrow] Position ${position.id} lost. No payout.`);
            continue;
          }

          if (winner === 'Draw') {
            // Draw - mark as settled (no payout for free bet draws)
            updateFreeBetPositionStatusOnly(position.id, 'settled');
            console.log(`[FreeBetEscrow] Position ${position.id} was a draw. No payout.`);
            continue;
          }

          // Winner - claim winnings from contract
          const claimResult = await this.claimEscrowWinnings(position);
          if (!claimResult.success) {
            console.error(`[FreeBetEscrow] Failed to claim for position ${position.id}: ${claimResult.error}`);
            continue;
          }

          // Settle to user (transfer winnings)
          const updatedPosition = { ...position, status: 'won' as FreeBetPositionStatus, txSignatureClaim: claimResult.txSignature };
          await this.settleToUser(updatedPosition);
        } catch (positionError) {
          console.error(`[FreeBetEscrow] Error processing position ${position.id}:`, positionError);
        }
      }

      // Also process won positions that haven't been settled yet (claimed but not transferred)
      const wonPositions = getFreeBetPositionsByStatusType('won');

      for (const position of wonPositions) {
        try {
          await this.settleToUser(position);
        } catch (settleError) {
          console.error(`[FreeBetEscrow] Error settling position ${position.id}:`, settleError);
        }
      }
    } catch (error) {
      console.error('[FreeBetEscrow] Error in processSettledRounds:', error);
    }
  }

  /**
   * Start the background processing job
   */
  startProcessing(): void {
    if (this.processInterval) {
      return; // Already running
    }

    console.log(`[FreeBetEscrow] Starting background processing (every ${PROCESS_INTERVAL_MS / 1000}s)`);

    this.processInterval = setInterval(async () => {
      await this.processSettledRounds();
    }, PROCESS_INTERVAL_MS);
  }

  /**
   * Stop the background processing job
   */
  stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('[FreeBetEscrow] Stopped background processing');
    }
  }

  /**
   * Get user's free bet positions
   */
  getUserPositions(walletAddress: string, limit: number = 50): FreeBetPosition[] {
    return getFreeBetPositionsForWallet(walletAddress, limit);
  }

  /**
   * Subscribe to events
   */
  subscribe(listener: (event: string, data: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(event: string, data: unknown): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[FreeBetEscrow] Error in listener:', err);
      }
    });
  }
}

// Export singleton instance
export const freeBetEscrowService = new FreeBetEscrowService();
