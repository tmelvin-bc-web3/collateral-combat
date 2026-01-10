// Types for the Draft Program

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Program ID
export const DRAFT_PROGRAM_ID = new PublicKey('7s485zYhL2U1xAPvpEygkNMNm9UFwXJ4HAinM1BXP81z');

// Constants from the smart contract
export const RAKE_BPS = 1000; // 10% rake
export const MIN_ENTRY_LAMPORTS = 50_000_000; // 0.05 SOL minimum entry
export const MIN_PLAYERS = 3; // Minimum players to start
export const MAX_PLAYERS = 100; // Maximum players per draft
export const MAX_PICKS = 5; // Maximum picks per player
export const DRAFT_DURATION_SECS = 300; // 5 minute drafts

// Payout structure (basis points of total pool after rake)
// Position 1: 50%, Position 2: 30%, Position 3: 20%
export const PAYOUT_BPS = [5000, 3000, 2000];

// Enums
export enum DraftStatus {
  Open = 'Open',
  Active = 'Active',
  Locked = 'Locked',
  Settled = 'Settled',
  Cancelled = 'Cancelled',
}

// Account structures
export interface Config {
  authority: PublicKey;
  totalDrafts: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  bump: number;
}

export interface Draft {
  id: BN;
  creator: PublicKey;
  entryFee: BN;
  maxPlayers: number;
  numPicks: number;
  currentPlayers: number;
  totalPool: BN;
  status: DraftStatus;
  createdAt: BN;
  startedAt: BN;
  endsAt: BN;
  firstPlace: PublicKey;
  secondPlace: PublicKey;
  thirdPlace: PublicKey;
  bump: number;
}

export interface DraftEntry {
  player: PublicKey;
  draftId: BN;
  picks: string[];
  score: BN;
  finalRank: number;
  claimed: boolean;
  joinedAt: BN;
  bump: number;
}

// Helper to convert lamports to SOL
export const lamportsToSol = (lamports: BN | number): number => {
  const value = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return value / 1_000_000_000;
};

// Helper to convert SOL to lamports
export const solToLamports = (sol: number): BN => {
  return new BN(Math.floor(sol * 1_000_000_000));
};

// Calculate time remaining for a draft
export const getTimeRemaining = (endsAt: BN | number): number => {
  const endTime = typeof endsAt === 'number' ? endsAt : endsAt.toNumber();
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, endTime - now);
};

// Calculate payout for a given rank
export const calculatePayout = (totalPool: BN, rank: number): number => {
  if (rank < 1 || rank > 3) return 0;
  const poolAfterRake = (totalPool.toNumber() * (10000 - RAKE_BPS)) / 10000;
  return (poolAfterRake * PAYOUT_BPS[rank - 1]) / 10000;
};
