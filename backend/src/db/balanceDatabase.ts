// Balance Database - Tracks pending balance transactions
// Used by the backend to manage in-flight debits/credits while interacting with PDA balances

import fs from 'fs';
import path from 'path';
import { createDatabaseError } from '../utils/errors';
import { DatabaseErrorCode } from '../types/errors';

const DATA_DIR = path.join(__dirname, '../../data');
const BALANCE_FILE = path.join(DATA_DIR, 'pending_balance.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator' | 'lds' | 'token_wars' | 'tournament';
export type TransactionType = 'debit' | 'credit';
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled';
export type TransactionState = TransactionStatus | 'failed';

export interface PendingTransaction {
  id: string;
  walletAddress: string;
  amountLamports: number;
  transactionType: TransactionType;
  gameType: GameMode;
  gameId: string;
  status: TransactionStatus;
  state: TransactionState;
  createdAt: number;
  confirmedAt?: number;
  txSignature?: string;
  error?: string;
}

// Per-game mode balance tracking for solvency checks
export interface GameModeBalance {
  totalLocked: number;    // Total lamports locked from all users
  totalPaidOut: number;   // Total lamports paid out to winners
  activeGames: number;    // Number of in-progress games
}

interface BalanceData {
  transactions: Record<string, PendingTransaction>;
  // Index by wallet for fast lookups
  walletIndex: Record<string, string[]>;
  // Per-game mode accounting
  gameModeBalances: Record<GameMode, GameModeBalance>;
}

const DEFAULT_GAME_MODE_BALANCE: GameModeBalance = {
  totalLocked: 0,
  totalPaidOut: 0,
  activeGames: 0,
};

function createDefaultGameModeBalances(): Record<GameMode, GameModeBalance> {
  return {
    oracle: { ...DEFAULT_GAME_MODE_BALANCE },
    battle: { ...DEFAULT_GAME_MODE_BALANCE },
    draft: { ...DEFAULT_GAME_MODE_BALANCE },
    spectator: { ...DEFAULT_GAME_MODE_BALANCE },
    lds: { ...DEFAULT_GAME_MODE_BALANCE },
    token_wars: { ...DEFAULT_GAME_MODE_BALANCE },
    tournament: { ...DEFAULT_GAME_MODE_BALANCE },
  };
}

function loadBalanceData(): BalanceData {
  try {
    if (fs.existsSync(BALANCE_FILE)) {
      const data = fs.readFileSync(BALANCE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Ensure gameModeBalances exists (migration for existing data)
      if (!parsed.gameModeBalances) {
        parsed.gameModeBalances = createDefaultGameModeBalances();
      }
      return parsed;
    }
  } catch (error) {
    console.error('[BalanceDB] Error loading balance data:', error);
  }
  return {
    transactions: {},
    walletIndex: {},
    gameModeBalances: createDefaultGameModeBalances(),
  };
}

function saveBalanceData(data: BalanceData): void {
  try {
    fs.writeFileSync(BALANCE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[BalanceDB] Error saving balance data:', error);
  }
}

function generateId(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new pending transaction
 */
export function createPendingTransaction(
  walletAddress: string,
  amountLamports: number,
  transactionType: TransactionType,
  gameType: GameMode,
  gameId: string
): PendingTransaction {
  const data = loadBalanceData();

  const transaction: PendingTransaction = {
    id: generateId(),
    walletAddress,
    amountLamports,
    transactionType,
    gameType,
    gameId,
    status: 'pending',
    state: 'pending',
    createdAt: Date.now(),
  };

  // Save transaction
  data.transactions[transaction.id] = transaction;

  // Update wallet index
  if (!data.walletIndex[walletAddress]) {
    data.walletIndex[walletAddress] = [];
  }
  data.walletIndex[walletAddress].push(transaction.id);

  saveBalanceData(data);

  console.log(`[BalanceDB] Created pending ${transactionType}: ${transaction.id} for ${walletAddress}, ${amountLamports} lamports`);
  return transaction;
}

/**
 * Get all pending debits for a wallet
 */
export function getPendingDebits(walletAddress: string): PendingTransaction[] {
  const data = loadBalanceData();
  const txnIds = data.walletIndex[walletAddress] || [];

  return txnIds
    .map(id => data.transactions[id])
    .filter(txn => txn && txn.transactionType === 'debit' && txn.status === 'pending');
}

/**
 * Get total pending debit amount for a wallet
 */
export function getTotalPendingDebits(walletAddress: string): number {
  const pendingDebits = getPendingDebits(walletAddress);
  return pendingDebits.reduce((total, txn) => total + txn.amountLamports, 0);
}

/**
 * Confirm a pending transaction
 */
export function confirmTransaction(transactionId: string, txSignature?: string): boolean {
  const data = loadBalanceData();
  const txn = data.transactions[transactionId];

  if (!txn) {
    console.warn(`[BalanceDB] Transaction not found: ${transactionId}`);
    return false;
  }

  if (txn.status !== 'pending') {
    console.warn(`[BalanceDB] Transaction not pending: ${transactionId} (${txn.status})`);
    return false;
  }

  txn.status = 'confirmed';
  txn.state = 'confirmed';
  txn.confirmedAt = Date.now();
  if (txSignature) {
    txn.txSignature = txSignature;
  }
  saveBalanceData(data);

  console.log(`[BalanceDB] Confirmed transaction: ${transactionId}${txSignature ? ` (TX: ${txSignature})` : ''}`);
  return true;
}

/**
 * Cancel a pending transaction (e.g., game was cancelled)
 */
export function cancelTransaction(transactionId: string, error?: string): boolean {
  const data = loadBalanceData();
  const txn = data.transactions[transactionId];

  if (!txn) {
    console.warn(`[BalanceDB] Transaction not found: ${transactionId}`);
    return false;
  }

  if (txn.status !== 'pending') {
    console.warn(`[BalanceDB] Transaction not pending: ${transactionId} (${txn.status})`);
    return false;
  }

  txn.status = 'cancelled';
  txn.state = 'cancelled';
  txn.confirmedAt = Date.now();
  if (error) {
    txn.error = error;
  }
  saveBalanceData(data);

  console.log(`[BalanceDB] Cancelled transaction: ${transactionId}${error ? ` (${error})` : ''}`);
  return true;
}

/**
 * Get transaction by ID
 */
export function getTransaction(transactionId: string): PendingTransaction | null {
  const data = loadBalanceData();
  return data.transactions[transactionId] || null;
}

/**
 * Get all transactions for a wallet
 */
export function getWalletTransactions(walletAddress: string): PendingTransaction[] {
  const data = loadBalanceData();
  const txnIds = data.walletIndex[walletAddress] || [];

  return txnIds
    .map(id => data.transactions[id])
    .filter((txn): txn is PendingTransaction => txn !== undefined)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get transactions by game
 */
export function getGameTransactions(gameType: GameMode, gameId: string): PendingTransaction[] {
  const data = loadBalanceData();

  return Object.values(data.transactions)
    .filter(txn => txn.gameType === gameType && txn.gameId === gameId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Mark stale pending transactions as failed (pending for more than 1 minute)
 */
const PENDING_TX_TIMEOUT_MS = 60 * 1000; // 1 minute timeout

export function cleanupStalePendingTransactions(): number {
  const data = loadBalanceData();
  const now = Date.now();
  let failedCount = 0;

  for (const [id, txn] of Object.entries(data.transactions)) {
    if (txn.status === 'pending' && now - txn.createdAt > PENDING_TX_TIMEOUT_MS) {
      txn.status = 'cancelled';
      txn.state = 'failed';
      txn.error = 'Transaction timed out';
      txn.confirmedAt = now;
      failedCount++;
    }
  }

  if (failedCount > 0) {
    saveBalanceData(data);
    console.log(`[BalanceDB] Marked ${failedCount} stale pending transactions as failed`);
  }

  return failedCount;
}

/**
 * Clean up old confirmed/cancelled transactions (older than 24 hours)
 */
export function cleanupOldTransactions(): number {
  const data = loadBalanceData();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  let cleanedCount = 0;

  for (const [id, txn] of Object.entries(data.transactions)) {
    if (txn.status !== 'pending' && txn.confirmedAt && txn.confirmedAt < cutoff) {
      // Remove from wallet index
      const walletTxns = data.walletIndex[txn.walletAddress];
      if (walletTxns) {
        data.walletIndex[txn.walletAddress] = walletTxns.filter(tid => tid !== id);
      }

      // Remove transaction
      delete data.transactions[id];
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    saveBalanceData(data);
    console.log(`[BalanceDB] Cleaned up ${cleanedCount} old transactions`);
  }

  return cleanedCount;
}

// ============================================
// Per-Game Mode Accounting (Solvency Tracking)
// ============================================

/**
 * Record funds locked for a game mode
 * Called when a user's funds are transferred to global vault
 */
export function recordGameModeLock(gameType: GameMode, amountLamports: number): void {
  const data = loadBalanceData();
  data.gameModeBalances[gameType].totalLocked += amountLamports;
  saveBalanceData(data);
  console.log(`[BalanceDB] Recorded lock: ${gameType} += ${amountLamports} lamports (total: ${data.gameModeBalances[gameType].totalLocked})`);
}

/**
 * Record funds paid out for a game mode
 * Called when winnings are credited to a user
 */
export function recordGameModePayout(gameType: GameMode, amountLamports: number): void {
  const data = loadBalanceData();
  data.gameModeBalances[gameType].totalPaidOut += amountLamports;
  saveBalanceData(data);
  console.log(`[BalanceDB] Recorded payout: ${gameType} -= ${amountLamports} lamports (total paid: ${data.gameModeBalances[gameType].totalPaidOut})`);
}

/**
 * Record a refund (funds returned from global vault to user)
 * Called when a game is cancelled and entry fees are returned
 */
export function recordGameModeRefund(gameType: GameMode, amountLamports: number): void {
  const data = loadBalanceData();
  // Refund reduces the locked amount since it goes back to user
  data.gameModeBalances[gameType].totalLocked = Math.max(0, data.gameModeBalances[gameType].totalLocked - amountLamports);
  saveBalanceData(data);
  console.log(`[BalanceDB] Recorded refund: ${gameType} -= ${amountLamports} lamports (total locked: ${data.gameModeBalances[gameType].totalLocked})`);
}

/**
 * Increment active game count for a game mode
 */
export function incrementActiveGames(gameType: GameMode): void {
  const data = loadBalanceData();
  data.gameModeBalances[gameType].activeGames++;
  saveBalanceData(data);
}

/**
 * Decrement active game count for a game mode
 */
export function decrementActiveGames(gameType: GameMode): void {
  const data = loadBalanceData();
  data.gameModeBalances[gameType].activeGames = Math.max(0, data.gameModeBalances[gameType].activeGames - 1);
  saveBalanceData(data);
}

/**
 * Get the balance for a specific game mode
 */
export function getGameModeBalance(gameType: GameMode): GameModeBalance {
  const data = loadBalanceData();
  return { ...data.gameModeBalances[gameType] };
}

/**
 * Get the available (unpaid) balance for a game mode
 * This is what can still be paid out to winners
 */
export function getGameModeAvailable(gameType: GameMode): number {
  const data = loadBalanceData();
  const balance = data.gameModeBalances[gameType];
  return Math.max(0, balance.totalLocked - balance.totalPaidOut);
}

/**
 * Check if a payout amount is within the game mode's available funds
 * CRITICAL: This prevents one game mode from draining another's funds
 */
export function canPayoutFromGameMode(gameType: GameMode, amountLamports: number): boolean {
  const available = getGameModeAvailable(gameType);
  const canPayout = available >= amountLamports;
  if (!canPayout) {
    console.error(`[BalanceDB] SOLVENCY CHECK FAILED: ${gameType} tried to pay ${amountLamports} but only ${available} available`);
  }
  return canPayout;
}

/**
 * Get all game mode balances for monitoring/debugging
 */
export function getAllGameModeBalances(): Record<GameMode, GameModeBalance> {
  const data = loadBalanceData();
  return {
    oracle: { ...data.gameModeBalances.oracle },
    battle: { ...data.gameModeBalances.battle },
    draft: { ...data.gameModeBalances.draft },
    spectator: { ...data.gameModeBalances.spectator },
    lds: { ...data.gameModeBalances.lds },
    token_wars: { ...data.gameModeBalances.token_wars },
    tournament: { ...data.gameModeBalances.tournament || DEFAULT_GAME_MODE_BALANCE },
  };
}
