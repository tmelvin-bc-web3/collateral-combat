/**
 * RakeRebateService
 *
 * Monitors on-chain claims and sends SOL rebates to eligible users.
 * - Load rebate keypair from REBATE_WALLET_PRIVATE_KEY env
 * - Poll Solana for claim transactions
 * - Check user's rake perk level
 * - Calculate and send rebates
 *
 * Rebate Formula: rebate = gross_winnings * (0.05 - effective_rate)
 *
 * Perk Rates:
 * - oracle_4_5: 4.5% effective (0.5% rebate)
 * - oracle_4: 4.0% effective (1.0% rebate)
 * - oracle_3_5: 3.5% effective (1.5% rebate)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { progressionService } from './progressionService';
import {
  createRakeRebate,
  getRakeRebateForWalletAndRound,
  getRakeRebatesByStatusType,
  updateRakeRebateStatusOnly,
  updateRakeRebateToSent,
  RakeRebate,
  RakeRebateSummary,
  getRakeRebateSummary,
  getRakeRebatesForWallet,
} from '../db/progressionDatabase';

// Program ID from the prediction program
const PREDICTION_PROGRAM_ID = new PublicKey('9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF');

// Escrow PDA seed
const ESCROW_SEED = Buffer.from('escrow');

// Constants
const POLL_INTERVAL_MS = 15_000; // Poll every 15 seconds
const BASELINE_FEE_BPS = 500; // 5% baseline fee in basis points
const MIN_REBATE_LAMPORTS = 100_000; // 0.0001 SOL minimum rebate

// Map perk types to effective fee BPS
const PERK_FEE_BPS: Record<string, number> = {
  oracle_4_5: 450, // 4.5%
  oracle_4: 400,   // 4.0%
  oracle_3_5: 350, // 3.5%
};

class RakeRebateService {
  private connection: Connection;
  private rebateKeypair: Keypair | null = null;
  private escrowPda: PublicKey | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSignature: string | null = null;
  private listeners: Set<(event: string, data: unknown) => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize the service with the rebate wallet
   */
  async initialize(): Promise<boolean> {
    try {
      // Load rebate keypair from environment
      const privateKeyBase58 = process.env.REBATE_WALLET_PRIVATE_KEY;
      if (!privateKeyBase58) {
        console.warn('[RakeRebate] REBATE_WALLET_PRIVATE_KEY not set, service disabled');
        return false;
      }

      const secretKey = bs58.decode(privateKeyBase58);
      this.rebateKeypair = Keypair.fromSecretKey(secretKey);
      console.log('[RakeRebate] Loaded rebate wallet:', this.rebateKeypair.publicKey.toBase58());

      // Derive escrow PDA
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [ESCROW_SEED],
        PREDICTION_PROGRAM_ID
      );
      this.escrowPda = escrowPda;
      console.log('[RakeRebate] Escrow PDA:', this.escrowPda.toBase58());

      // Check rebate wallet balance
      const balance = await this.connection.getBalance(this.rebateKeypair.publicKey);
      console.log('[RakeRebate] Rebate wallet balance:', balance / LAMPORTS_PER_SOL, 'SOL');

      this.isInitialized = true;
      return true;
    } catch (err) {
      console.error('[RakeRebate] Failed to initialize:', err);
      return false;
    }
  }

  /**
   * Poll for claim transactions on the escrow account
   */
  async pollForClaims(): Promise<void> {
    if (!this.isInitialized || !this.escrowPda) {
      return;
    }

    try {
      // Get recent signatures for the escrow account
      const options: { limit: number; until?: string } = { limit: 50 };
      if (this.lastSignature) {
        options.until = this.lastSignature;
      }

      const signatures = await this.connection.getSignaturesForAddress(
        this.escrowPda,
        options
      );

      if (signatures.length === 0) {
        return;
      }

      // Update last signature to most recent
      this.lastSignature = signatures[0].signature;

      // Process each signature (oldest first)
      for (const sigInfo of signatures.reverse()) {
        if (sigInfo.err) continue; // Skip failed transactions

        await this.processTransaction(sigInfo);
      }
    } catch (err) {
      console.error('[RakeRebate] Error polling for claims:', err);
    }
  }

  /**
   * Process a single transaction to detect claims
   */
  private async processTransaction(sigInfo: ConfirmedSignatureInfo): Promise<void> {
    try {
      const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) return;

      // Look for claimWinnings instruction
      const claimInfo = this.extractClaimInfo(tx, sigInfo.signature);
      if (!claimInfo) return;

      const { walletAddress, roundId, payoutLamports } = claimInfo;

      // Check if we already processed this claim
      const existingRebate = getRakeRebateForWalletAndRound(walletAddress, roundId);
      if (existingRebate) {
        return; // Already processed
      }

      // Process the claim
      await this.processClaimTransaction(sigInfo.signature, walletAddress, roundId, payoutLamports);
    } catch (err) {
      console.error('[RakeRebate] Error processing transaction:', sigInfo.signature, err);
    }
  }

  /**
   * Extract claim information from a parsed transaction
   */
  private extractClaimInfo(
    tx: ParsedTransactionWithMeta,
    signature: string
  ): { walletAddress: string; roundId: number; payoutLamports: number } | null {
    try {
      // Find the player (claimer) from the transaction
      // The player should be a signer that receives SOL from the escrow
      const accountKeys = tx.transaction.message.accountKeys;
      const preBalances = tx.meta?.preBalances || [];
      const postBalances = tx.meta?.postBalances || [];

      // Find the account that received SOL (besides rent refunds)
      for (let i = 0; i < accountKeys.length; i++) {
        const account = accountKeys[i];
        if (!account.signer) continue;

        const balanceChange = postBalances[i] - preBalances[i];
        // If signer received significant SOL, they likely claimed winnings
        if (balanceChange > LAMPORTS_PER_SOL * 0.005) { // More than 0.005 SOL received
          const walletAddress = account.pubkey.toBase58();

          // Try to extract round ID from logs or instruction data
          const roundId = this.extractRoundIdFromLogs(tx.meta?.logMessages || []);
          if (roundId === null) {
            console.log('[RakeRebate] Could not extract round ID from tx:', signature);
            return null;
          }

          // Calculate gross winnings from payout (payout = gross * 0.95)
          const payoutLamports = balanceChange;

          return { walletAddress, roundId, payoutLamports };
        }
      }

      return null;
    } catch (err) {
      console.error('[RakeRebate] Error extracting claim info:', err);
      return null;
    }
  }

  /**
   * Extract round ID from transaction logs
   */
  private extractRoundIdFromLogs(logs: string[]): number | null {
    for (const log of logs) {
      // Look for patterns like "round: 123" or "roundId: 123"
      const match = log.match(/round[_\s]*(?:id)?[:\s]+(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }

  /**
   * Process a claim transaction and create rebate if eligible
   */
  async processClaimTransaction(
    txSignature: string,
    walletAddress: string,
    roundId: number,
    payoutLamports: number
  ): Promise<{ success: boolean; rebate?: RakeRebate; error?: string }> {
    try {
      // Get user's effective rake rate from progression service
      const effectiveRatePercent = progressionService.getActiveOracleRakeReduction(walletAddress);
      const effectiveFeeBps = Math.round(effectiveRatePercent * 100);

      // If user has no perk (5% rate), no rebate due
      if (effectiveFeeBps >= BASELINE_FEE_BPS) {
        console.log('[RakeRebate] No rebate for', walletAddress, '- baseline rate');
        return { success: true };
      }

      // Calculate rebate
      // gross_winnings = payout / 0.95 (since payout = gross * 0.95)
      // rebate = gross * (0.05 - effective_rate)
      const grossWinningsLamports = Math.floor(payoutLamports / 0.95);
      const rebateLamports = this.calculateRebate(grossWinningsLamports, effectiveFeeBps);

      if (rebateLamports < MIN_REBATE_LAMPORTS) {
        console.log('[RakeRebate] Rebate too small:', rebateLamports, 'lamports');
        return { success: true };
      }

      // Determine perk type from effective rate
      const perkType = this.getPerkTypeFromBps(effectiveFeeBps);

      // Create rebate record
      const rebate = createRakeRebate(
        walletAddress,
        roundId,
        grossWinningsLamports,
        effectiveFeeBps,
        rebateLamports,
        txSignature,
        perkType
      );

      console.log('[RakeRebate] Created rebate:', rebate.id, 'for', walletAddress, '-', rebateLamports / LAMPORTS_PER_SOL, 'SOL');

      // Notify listeners
      this.notifyListeners('rebate_created', { rebate, walletAddress });

      return { success: true, rebate };
    } catch (err) {
      console.error('[RakeRebate] Error processing claim:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Calculate rebate amount
   * Formula: rebate = gross_winnings * (baseline_fee - effective_fee)
   */
  calculateRebate(grossWinningsLamports: number, effectiveFeeBps: number): number {
    const rebateBps = BASELINE_FEE_BPS - effectiveFeeBps;
    if (rebateBps <= 0) return 0;

    // rebate = gross * (rebateBps / 10000)
    return Math.floor((grossWinningsLamports * rebateBps) / 10000);
  }

  /**
   * Get perk type from effective fee BPS
   */
  private getPerkTypeFromBps(effectiveFeeBps: number): string | undefined {
    for (const [perkType, bps] of Object.entries(PERK_FEE_BPS)) {
      if (bps === effectiveFeeBps) {
        return perkType;
      }
    }
    return undefined;
  }

  /**
   * Send rebate to user
   */
  async sendRebate(rebate: RakeRebate): Promise<{ success: boolean; txSignature?: string; error?: string }> {
    if (!this.rebateKeypair) {
      return { success: false, error: 'Rebate wallet not initialized' };
    }

    try {
      // Mark as processing
      updateRakeRebateStatusOnly(rebate.id, 'processing');

      // Check rebate wallet balance
      const balance = await this.connection.getBalance(this.rebateKeypair.publicKey);
      if (balance < rebate.rebateLamports + 5000) { // 5000 lamports for tx fee
        console.error('[RakeRebate] Insufficient balance for rebate:', rebate.id);
        updateRakeRebateStatusOnly(rebate.id, 'pending'); // Reset to pending
        return { success: false, error: 'Insufficient rebate wallet balance' };
      }

      // Create transfer transaction
      const userPubkey = new PublicKey(rebate.walletAddress);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.rebateKeypair.publicKey,
          toPubkey: userPubkey,
          lamports: rebate.rebateLamports,
        })
      );

      // Send transaction
      const txSignature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.rebateKeypair],
        { commitment: 'confirmed' }
      );

      // Update rebate as sent
      updateRakeRebateToSent(rebate.id, txSignature);

      console.log('[RakeRebate] Sent rebate:', rebate.id, 'tx:', txSignature);

      // Notify listeners
      this.notifyListeners('rebate_sent', {
        rebate: { ...rebate, status: 'sent', rebateTxSignature: txSignature },
        walletAddress: rebate.walletAddress,
        txSignature,
      });

      return { success: true, txSignature };
    } catch (err) {
      console.error('[RakeRebate] Error sending rebate:', err);
      updateRakeRebateStatusOnly(rebate.id, 'failed');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Process all pending rebates
   */
  async processPendingRebates(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      const pendingRebates = getRakeRebatesByStatusType('pending');

      for (const rebate of pendingRebates) {
        const result = await this.sendRebate(rebate);
        if (!result.success) {
          console.error('[RakeRebate] Failed to send rebate:', rebate.id, result.error);
        }

        // Small delay between sends to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('[RakeRebate] Error processing pending rebates:', err);
    }
  }

  /**
   * Start the background polling job
   */
  startPolling(): void {
    if (this.pollInterval) {
      console.warn('[RakeRebate] Polling already started');
      return;
    }

    if (!this.isInitialized) {
      console.warn('[RakeRebate] Cannot start polling - not initialized');
      return;
    }

    console.log('[RakeRebate] Starting background polling');

    // Initial poll
    this.pollForClaims();
    this.processPendingRebates();

    // Set up interval
    this.pollInterval = setInterval(async () => {
      await this.pollForClaims();
      await this.processPendingRebates();
    }, POLL_INTERVAL_MS);
  }

  /**
   * Stop the background polling job
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.log('[RakeRebate] Stopped background polling');
    }
  }

  /**
   * Get rebate summary for a wallet
   */
  getRebateSummary(walletAddress: string): RakeRebateSummary {
    return getRakeRebateSummary(walletAddress);
  }

  /**
   * Get rebate history for a wallet
   */
  getRebateHistory(walletAddress: string, limit: number = 50): RakeRebate[] {
    return getRakeRebatesForWallet(walletAddress, limit);
  }

  /**
   * Get user's effective rake rate
   */
  getEffectiveRatePercent(walletAddress: string): number {
    return progressionService.getActiveOracleRakeReduction(walletAddress);
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
        console.error('[RakeRebate] Error in listener:', err);
      }
    });
  }
}

// Export singleton instance
export const rakeRebateService = new RakeRebateService();
