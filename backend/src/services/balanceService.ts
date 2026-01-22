// Balance Service - Manages user PDA balances for all game modes
// Verifies on-chain PDA balance and tracks pending debits for in-flight transactions

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import * as idl from '../idl/session_betting.json';
import {
  createPendingTransaction,
  confirmTransaction,
  cancelTransaction,
  getTotalPendingDebits,
  getPendingDebits,
  cleanupOldTransactions,
  recordGameModeLock,
  recordGameModePayout,
  recordGameModeRefund,
  canPayoutFromGameMode,
  getGameModeBalance,
  getAllGameModeBalances,
  GameMode,
  PendingTransaction,
  GameModeBalance,
} from '../db/balanceDatabase';
import { createBalanceError } from '../utils/errors';
import { BalanceErrorCode } from '../types/errors';
import { alertService } from './alertService';

const SESSION_BETTING_PROGRAM_ID = new PublicKey('4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA');

// PDA Seeds
const BALANCE_SEED = Buffer.from('balance');
const VAULT_SEED = Buffer.from('vault');
const GLOBAL_VAULT_SEED = Buffer.from('global_vault');
const GAME_SEED = Buffer.from('game');

// Game type mapping for on-chain calls
enum GameType {
  Oracle = 0,
  Battle = 1,
  Draft = 2,
  Spectator = 3,
  LDS = 4,
  TokenWars = 5,
}

const GAME_MODE_TO_TYPE: Record<GameMode, GameType> = {
  oracle: GameType.Oracle,
  battle: GameType.Battle,
  draft: GameType.Draft,
  spectator: GameType.Spectator,
  lds: GameType.LDS,
  token_wars: GameType.TokenWars,
};

class BalanceService {
  private connection: Connection;
  private authority: Keypair | null = null;
  private program: Program | null = null;
  private initialized = false;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Schedule cleanup every hour
    setInterval(() => {
      cleanupOldTransactions();
    }, 60 * 60 * 1000);
  }

  /**
   * Initialize the service with the authority keypair
   */
  initialize(): boolean {
    try {
      const privateKeyBase58 = process.env.SESSION_BETTING_AUTHORITY_PRIVATE_KEY;
      if (!privateKeyBase58) {
        console.warn('[BalanceService] SESSION_BETTING_AUTHORITY_PRIVATE_KEY not set - on-chain operations disabled');
        return false;
      }

      // Decode the private key
      let secretKey: Uint8Array;
      if (privateKeyBase58.startsWith('[')) {
        secretKey = Uint8Array.from(JSON.parse(privateKeyBase58));
      } else {
        secretKey = bs58.decode(privateKeyBase58);
      }

      this.authority = Keypair.fromSecretKey(secretKey);
      console.log(`[BalanceService] Authority wallet: ${this.authority.publicKey.toBase58()}`);

      // Create Anchor provider and program
      const wallet = new Wallet(this.authority);
      const provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });
      this.program = new Program(idl as any, provider);

      this.initialized = true;
      console.log('[BalanceService] Service initialized successfully');
      return true;
    } catch (error) {
      console.error('[BalanceService] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.initialized && this.authority !== null && this.program !== null;
  }

  // ============================================
  // PDA Derivation
  // ============================================

  private getBalancePDA(wallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [BALANCE_SEED, wallet.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
    return pda;
  }

  private getVaultPDA(wallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, wallet.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
    return pda;
  }

  private getGlobalVaultPDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [GLOBAL_VAULT_SEED],
      SESSION_BETTING_PROGRAM_ID
    );
    return pda;
  }

  private getGameStatePDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [GAME_SEED],
      SESSION_BETTING_PROGRAM_ID
    );
    return pda;
  }

  // ============================================
  // On-Chain Balance Queries
  // ============================================

  /**
   * Get the on-chain PDA balance for a user
   */
  async getOnChainBalance(walletAddress: string): Promise<number> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const balancePDA = this.getBalancePDA(walletPubkey);

      const accountInfo = await this.connection.getAccountInfo(balancePDA);
      if (!accountInfo) {
        return 0; // No balance account yet
      }

      // Decode the balance account
      // The balance field is at offset 40 (8 discriminator + 32 owner pubkey)
      // It's a u64 (8 bytes)
      const balanceBytes = accountInfo.data.slice(40, 48);
      const balance = new BN(balanceBytes, 'le').toNumber();

      return balance;
    } catch (error) {
      console.error(`[BalanceService] Error getting on-chain balance for ${walletAddress}:`, error);
      return 0;
    }
  }

  /**
   * Get available balance (on-chain minus pending debits)
   */
  async getAvailableBalance(walletAddress: string): Promise<number> {
    const onChainBalance = await this.getOnChainBalance(walletAddress);
    const pendingDebits = getTotalPendingDebits(walletAddress);
    return Math.max(0, onChainBalance - pendingDebits);
  }

  /**
   * Check if user has sufficient balance for an action
   * @deprecated Use verifyAndLockBalance() instead. This method has a race condition.
   * Checking balance without locking allows withdraw between check and bet placement.
   */
  async hasSufficientBalance(walletAddress: string, amountLamports: number): Promise<boolean> {
    console.warn('[DEPRECATED] hasSufficientBalance called - use verifyAndLockBalance instead');
    const available = await this.getAvailableBalance(walletAddress);
    return available >= amountLamports;
  }

  /**
   * Verify user has sufficient balance AND lock funds atomically on-chain.
   * Returns transaction ID on success, throws on failure.
   *
   * SECURITY: This is the ONLY way to verify balance for wagering.
   * Do NOT use getBalance() followed by a separate lock - that creates a race condition.
   */
  async verifyAndLockBalance(
    walletAddress: string,
    amount: number,
    gameMode: GameMode,
    gameId: string
  ): Promise<{ txId: string; newBalance: number }> {
    // 1. Create pending transaction in database (optimistic lock)
    const pendingTx = createPendingTransaction(walletAddress, amount, 'debit', gameMode, gameId);

    try {
      // 2. Execute on-chain transfer_to_global_vault (atomic balance check + debit)
      const txId = await this.transferToGlobalVault(walletAddress, amount, gameMode);

      if (!txId) {
        throw createBalanceError(
          BalanceErrorCode.TRANSFER_FAILED,
          'Failed to lock funds on-chain',
          { wallet: walletAddress, amount, gameMode, gameId }
        );
      }

      // 3. Confirm the pending transaction
      confirmTransaction(pendingTx.id);

      // 4. Return success
      const newBalance = await this.getOnChainBalance(walletAddress);
      return { txId, newBalance };
    } catch (error) {
      // 5. Cancel pending transaction on failure
      cancelTransaction(pendingTx.id);

      // Check if it's an insufficient balance error from the contract
      if (this.isInsufficientBalanceError(error)) {
        throw createBalanceError(
          BalanceErrorCode.INSUFFICIENT_BALANCE,
          'Insufficient balance for this wager',
          { wallet: walletAddress, requested: amount }
        );
      }
      throw error;
    }
  }

  /**
   * Check if a wager amount would be possible (for UI display only).
   * WARNING: This is NOT a guarantee - use verifyAndLockBalance for actual wagers.
   */
  async canPlaceWager(walletAddress: string, amount: number): Promise<boolean> {
    const available = await this.getAvailableBalance(walletAddress);
    return available >= amount;
  }

  /**
   * Helper to check for insufficient balance errors from Anchor
   */
  private isInsufficientBalanceError(error: unknown): boolean {
    const errorStr = String(error);
    return errorStr.includes('InsufficientBalance') ||
           errorStr.includes('6016') ||  // Error code from contract
           errorStr.includes('Low balance');
  }

  /**
   * Get the global vault balance
   */
  async getGlobalVaultBalance(): Promise<number> {
    try {
      const globalVaultPDA = this.getGlobalVaultPDA();
      const accountInfo = await this.connection.getAccountInfo(globalVaultPDA);
      return accountInfo?.lamports || 0;
    } catch (error) {
      console.error('[BalanceService] Error getting global vault balance:', error);
      return 0;
    }
  }

  // ============================================
  // Pending Transaction Management
  // ============================================

  /**
   * Create a pending debit (reserve balance for a game action)
   * Returns the pending transaction ID
   */
  async debitPending(
    walletAddress: string,
    amountLamports: number,
    gameType: GameMode,
    gameId: string
  ): Promise<string> {
    // Verify sufficient balance
    const available = await this.getAvailableBalance(walletAddress);
    if (available < amountLamports) {
      throw new Error(`Insufficient balance. Available: ${available}, Required: ${amountLamports}`);
    }

    // Create pending transaction
    const txn = createPendingTransaction(
      walletAddress,
      amountLamports,
      'debit',
      gameType,
      gameId
    );

    console.log(`[BalanceService] Created pending debit ${txn.id}: ${walletAddress} - ${amountLamports} lamports for ${gameType}/${gameId}`);
    return txn.id;
  }

  /**
   * Create a pending credit (winnings to be credited)
   */
  async creditPending(
    walletAddress: string,
    amountLamports: number,
    gameType: GameMode,
    gameId: string
  ): Promise<string> {
    const txn = createPendingTransaction(
      walletAddress,
      amountLamports,
      'credit',
      gameType,
      gameId
    );

    console.log(`[BalanceService] Created pending credit ${txn.id}: ${walletAddress} + ${amountLamports} lamports for ${gameType}/${gameId}`);
    return txn.id;
  }

  /**
   * Confirm a pending transaction (debit was processed)
   */
  confirmDebit(pendingId: string): void {
    confirmTransaction(pendingId);
  }

  /**
   * Cancel a pending transaction (game was cancelled, refund)
   */
  cancelDebit(pendingId: string): void {
    cancelTransaction(pendingId);
  }

  /**
   * Get all pending transactions for a wallet
   */
  getPendingDebits(walletAddress: string): PendingTransaction[] {
    return getPendingDebits(walletAddress);
  }

  // ============================================
  // On-Chain Settlement Operations (Authority Only)
  // ============================================

  /**
   * Transfer lamports from user's vault to global vault
   * Called when user enters a game (entry fee / bet)
   * Records the lock in per-game-mode accounting
   */
  async transferToGlobalVault(
    userWallet: string,
    amountLamports: number,
    gameType?: GameMode // Optional for backwards compatibility, but should be provided
  ): Promise<string | null> {
    if (!this.isReady() || !this.program || !this.authority) {
      console.error('[BalanceService] Service not ready for on-chain operations');
      return null;
    }

    try {
      const userPubkey = new PublicKey(userWallet);
      const gameStatePDA = this.getGameStatePDA();
      const userBalancePDA = this.getBalancePDA(userPubkey);
      const userVaultPDA = this.getVaultPDA(userPubkey);
      const globalVaultPDA = this.getGlobalVaultPDA();

      const tx = await (this.program.methods as any)
        .transferToGlobalVault(new BN(amountLamports))
        .accounts({
          gameState: gameStatePDA,
          authority: this.authority.publicKey,
          owner: userPubkey,
          userBalance: userBalancePDA,
          userVault: userVaultPDA,
          globalVault: globalVaultPDA,
        })
        .signers([this.authority])
        .rpc();

      console.log(`[BalanceService] Transferred ${amountLamports} lamports from ${userWallet} to global vault. TX: ${tx}`);

      // CRITICAL: Record this lock in per-game-mode accounting
      // This tracks how much each game mode has locked, for solvency checks
      if (gameType) {
        recordGameModeLock(gameType, amountLamports);
      }

      return tx;
    } catch (error: any) {
      console.error(`[BalanceService] Error transferring to global vault:`, error);
      await alertService.sendCriticalAlert(
        'Balance Transfer Failed',
        `Failed to lock funds for wallet: ${userWallet.substring(0, 8)}...`,
        'BALANCE_TRANSFER_FAILED',
        {
          wallet: userWallet.substring(0, 8),
          amount: amountLamports,
          gameType: gameType || 'unknown',
          errorType: error.name || 'Unknown'
        }
      );
      return null;
    }
  }

  /**
   * Credit winnings to user's balance
   * Called when user wins a game
   * INCLUDES SOLVENCY CHECK - prevents one game mode from draining another's funds
   */
  async creditWinnings(
    userWallet: string,
    amountLamports: number,
    gameType: GameMode,
    gameId: string
  ): Promise<string | null> {
    if (!this.isReady() || !this.program || !this.authority) {
      console.error('[BalanceService] Service not ready for on-chain operations');
      return null;
    }

    // CRITICAL SOLVENCY CHECK: Ensure this game mode has enough locked funds
    // This prevents a bug in one game from draining funds locked by another game
    if (!canPayoutFromGameMode(gameType, amountLamports)) {
      console.error(`[BalanceService] SOLVENCY CHECK FAILED: ${gameType} cannot pay ${amountLamports} lamports to ${userWallet}`);
      console.error(`[BalanceService] Game mode ${gameType} balance:`, getGameModeBalance(gameType));
      await alertService.sendCriticalAlert(
        'Balance Mismatch - Solvency Check Failed',
        `Game mode ${gameType} cannot pay ${amountLamports} lamports to wallet ${userWallet.substring(0, 8)}...`,
        'BALANCE_SOLVENCY_FAILED',
        {
          gameType,
          wallet: userWallet.substring(0, 8),
          requested: amountLamports,
          gameId: gameId.substring(0, 16)
        }
      );
      return null;
    }

    try {
      const userPubkey = new PublicKey(userWallet);
      const gameStatePDA = this.getGameStatePDA();
      const userBalancePDA = this.getBalancePDA(userPubkey);
      const userVaultPDA = this.getVaultPDA(userPubkey);
      const globalVaultPDA = this.getGlobalVaultPDA();

      // Convert gameId string to 32-byte array
      const gameIdBytes = new Uint8Array(32);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(gameId);
      gameIdBytes.set(encoded.slice(0, 32));

      const gameTypeEnum = GAME_MODE_TO_TYPE[gameType];
      const gameTypeArg = this.gameTypeToArg(gameTypeEnum);

      const tx = await (this.program.methods as any)
        .creditWinnings(new BN(amountLamports), gameTypeArg, Array.from(gameIdBytes))
        .accounts({
          gameState: gameStatePDA,
          authority: this.authority.publicKey,
          owner: userPubkey,
          userBalance: userBalancePDA,
          userVault: userVaultPDA,
          globalVault: globalVaultPDA,
        })
        .signers([this.authority])
        .rpc();

      console.log(`[BalanceService] Credited ${amountLamports} lamports to ${userWallet} for ${gameType}/${gameId}. TX: ${tx}`);

      // Record the payout in per-game-mode accounting
      recordGameModePayout(gameType, amountLamports);

      return tx;
    } catch (error: any) {
      console.error(`[BalanceService] Error crediting winnings:`, error);
      await alertService.sendCriticalAlert(
        'Payout Failed',
        `Failed to credit ${amountLamports} lamports to wallet: ${userWallet.substring(0, 8)}...`,
        'PAYOUT_FAILED',
        {
          wallet: userWallet.substring(0, 8),
          amount: amountLamports,
          gameType,
          gameId: gameId.substring(0, 16),
          errorType: error.name || 'Unknown'
        }
      );
      return null;
    }
  }

  /**
   * Refund funds from global vault back to user
   * Called when a game is cancelled
   */
  async refundFromGlobalVault(
    userWallet: string,
    amountLamports: number,
    gameType: GameMode,
    gameId: string
  ): Promise<string | null> {
    // For refunds, we use creditWinnings but also record it as a refund
    // (which reduces totalLocked rather than increasing totalPaidOut)
    if (!this.isReady() || !this.program || !this.authority) {
      console.error('[BalanceService] Service not ready for on-chain operations');
      return null;
    }

    try {
      const userPubkey = new PublicKey(userWallet);
      const gameStatePDA = this.getGameStatePDA();
      const userBalancePDA = this.getBalancePDA(userPubkey);
      const userVaultPDA = this.getVaultPDA(userPubkey);
      const globalVaultPDA = this.getGlobalVaultPDA();

      const gameIdBytes = new Uint8Array(32);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(gameId);
      gameIdBytes.set(encoded.slice(0, 32));

      const gameTypeEnum = GAME_MODE_TO_TYPE[gameType];
      const gameTypeArg = this.gameTypeToArg(gameTypeEnum);

      const tx = await (this.program.methods as any)
        .creditWinnings(new BN(amountLamports), gameTypeArg, Array.from(gameIdBytes))
        .accounts({
          gameState: gameStatePDA,
          authority: this.authority.publicKey,
          owner: userPubkey,
          userBalance: userBalancePDA,
          userVault: userVaultPDA,
          globalVault: globalVaultPDA,
        })
        .signers([this.authority])
        .rpc();

      console.log(`[BalanceService] Refunded ${amountLamports} lamports to ${userWallet} for cancelled ${gameType}/${gameId}. TX: ${tx}`);

      // Record as refund (reduces totalLocked, not increases totalPaidOut)
      recordGameModeRefund(gameType, amountLamports);

      return tx;
    } catch (error) {
      console.error(`[BalanceService] Error refunding from global vault:`, error);
      return null;
    }
  }

  /**
   * Release locked funds back to user's balance (for cancelled games).
   * Calls credit_winnings on-chain to return funds from global vault.
   */
  async releaseLockedBalance(
    walletAddress: string,
    amount: number,
    gameMode: GameMode,
    gameId: string,
    reason: 'cancelled' | 'refund' | 'timeout'
  ): Promise<{ txId: string; newBalance: number }> {
    if (!this.isReady() || !this.program || !this.authority) {
      throw createBalanceError(
        BalanceErrorCode.WITHDRAWAL_FAILED,
        'Balance service not ready',
        { wallet: walletAddress }
      );
    }

    try {
      const userPubkey = new PublicKey(walletAddress);
      const gameStatePDA = this.getGameStatePDA();
      const userBalancePDA = this.getBalancePDA(userPubkey);
      const userVaultPDA = this.getVaultPDA(userPubkey);
      const globalVaultPDA = this.getGlobalVaultPDA();

      const gameIdBytes = new Uint8Array(32);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(gameId);
      gameIdBytes.set(encoded.slice(0, 32));

      const gameTypeEnum = GAME_MODE_TO_TYPE[gameMode];
      const gameTypeArg = this.gameTypeToArg(gameTypeEnum);

      const txId = await (this.program.methods as any)
        .creditWinnings(new BN(amount), gameTypeArg, Array.from(gameIdBytes))
        .accounts({
          gameState: gameStatePDA,
          authority: this.authority.publicKey,
          owner: userPubkey,
          userBalance: userBalancePDA,
          userVault: userVaultPDA,
          globalVault: globalVaultPDA,
        })
        .signers([this.authority])
        .rpc();

      console.log(`[BalanceService] Released ${amount} lamports to ${walletAddress} for ${reason} ${gameMode}/${gameId}. TX: ${txId}`);

      // Record the refund in database
      recordGameModeRefund(gameMode, amount);

      const newBalance = await this.getOnChainBalance(walletAddress);
      return { txId, newBalance };
    } catch (error: any) {
      console.error(`[BalanceService] Error releasing locked balance:`, error);
      await alertService.sendCriticalAlert(
        'Refund Failed',
        `Failed to release ${amount} lamports for wallet: ${walletAddress.substring(0, 8)}...`,
        'REFUND_FAILED',
        {
          wallet: walletAddress.substring(0, 8),
          amount,
          gameMode,
          gameId: gameId.substring(0, 16),
          reason,
          errorType: error.name || 'Unknown'
        }
      );
      throw createBalanceError(
        BalanceErrorCode.WITHDRAWAL_FAILED,
        'Failed to release locked funds',
        { wallet: walletAddress, amount, gameMode, gameId, reason, error: String(error) }
      );
    }
  }

  /**
   * Fund the global vault (authority deposits for payouts)
   */
  async fundGlobalVault(amountLamports: number): Promise<string | null> {
    if (!this.isReady() || !this.program || !this.authority) {
      console.error('[BalanceService] Service not ready for on-chain operations');
      return null;
    }

    try {
      const gameStatePDA = this.getGameStatePDA();
      const globalVaultPDA = this.getGlobalVaultPDA();

      const tx = await (this.program.methods as any)
        .fundGlobalVault(new BN(amountLamports))
        .accounts({
          gameState: gameStatePDA,
          authority: this.authority.publicKey,
          globalVault: globalVaultPDA,
        })
        .signers([this.authority])
        .rpc();

      console.log(`[BalanceService] Funded global vault with ${amountLamports} lamports. TX: ${tx}`);
      return tx;
    } catch (error) {
      console.error(`[BalanceService] Error funding global vault:`, error);
      return null;
    }
  }

  // Helper to convert game type enum to Anchor arg format
  private gameTypeToArg(gameType: GameType): object {
    switch (gameType) {
      case GameType.Oracle: return { oracle: {} };
      case GameType.Battle: return { battle: {} };
      case GameType.Draft: return { draft: {} };
      case GameType.Spectator: return { spectator: {} };
      case GameType.LDS: return { lds: {} };
      case GameType.TokenWars: return { tokenWars: {} };
      default: return { oracle: {} }; // Fallback (should never hit)
    }
  }

  // ============================================
  // Per-Game Mode Accounting Getters
  // ============================================

  /**
   * Get the balance tracking for a specific game mode
   */
  getGameModeBalance(gameType: GameMode): GameModeBalance {
    return getGameModeBalance(gameType);
  }

  /**
   * Get all game mode balances (for monitoring/debugging)
   */
  getAllGameModeBalances(): Record<GameMode, GameModeBalance> {
    return getAllGameModeBalances();
  }

  /**
   * Check if a payout is possible from a game mode
   */
  canPayout(gameType: GameMode, amountLamports: number): boolean {
    return canPayoutFromGameMode(gameType, amountLamports);
  }
}

// Export singleton instance
export const balanceService = new BalanceService();

// Export types
export { GameMode, PendingTransaction, GameModeBalance };
