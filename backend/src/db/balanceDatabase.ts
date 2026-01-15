// Balance Database - Tracks pending balance transactions
// Used by the backend to manage in-flight debits/credits while interacting with PDA balances

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const BALANCE_FILE = path.join(DATA_DIR, 'pending_balance.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type GameMode = 'oracle' | 'battle' | 'draft' | 'spectator';
export type TransactionType = 'debit' | 'credit';
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled';

export interface PendingTransaction {
  id: string;
  walletAddress: string;
  amountLamports: number;
  transactionType: TransactionType;
  gameType: GameMode;
  gameId: string;
  status: TransactionStatus;
  createdAt: number;
  confirmedAt?: number;
}

interface BalanceData {
  transactions: Record<string, PendingTransaction>;
  // Index by wallet for fast lookups
  walletIndex: Record<string, string[]>;
}

function loadBalanceData(): BalanceData {
  try {
    if (fs.existsSync(BALANCE_FILE)) {
      const data = fs.readFileSync(BALANCE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[BalanceDB] Error loading balance data:', error);
  }
  return { transactions: {}, walletIndex: {} };
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
export function confirmTransaction(transactionId: string): boolean {
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
  txn.confirmedAt = Date.now();
  saveBalanceData(data);

  console.log(`[BalanceDB] Confirmed transaction: ${transactionId}`);
  return true;
}

/**
 * Cancel a pending transaction (e.g., game was cancelled)
 */
export function cancelTransaction(transactionId: string): boolean {
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
  txn.confirmedAt = Date.now();
  saveBalanceData(data);

  console.log(`[BalanceDB] Cancelled transaction: ${transactionId}`);
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
