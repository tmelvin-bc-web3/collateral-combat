// Types for the Prediction Program

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Program ID
export const PREDICTION_PROGRAM_ID = new PublicKey('9fDpLYmAR1WtaVwSczxz1BZqQGiSRavT6kAMLSCAh1dF');

// Constants from the smart contract
export const ROUND_DURATION = 30; // 30 seconds
export const PLATFORM_FEE_BPS = 1000; // 10%
export const MIN_BET_LAMPORTS = 10_000_000; // 0.01 SOL
export const DRAW_THRESHOLD_BPS = 10; // 0.1%
export const LOCK_REWARD_LAMPORTS = 1_000_000; // 0.001 SOL
export const SETTLE_REWARD_LAMPORTS = 2_000_000; // 0.002 SOL

// Enums
export enum RoundStatus {
  Betting = 'Betting',
  Locked = 'Locked',
  Settled = 'Settled',
}

export enum BetSide {
  Up = 'Up',
  Down = 'Down',
}

export enum WinnerSide {
  None = 'None',
  Up = 'Up',
  Down = 'Down',
  Draw = 'Draw',
}

// Account structures
export interface GameState {
  authority: PublicKey;
  currentRound: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  bump: number;
}

export interface PredictionRound {
  roundId: BN;
  startTime: BN;
  lockTime: BN;
  startPrice: BN;
  endPrice: BN;
  upPool: BN;
  downPool: BN;
  totalPool: BN;
  status: RoundStatus;
  winner: WinnerSide;
  bump: number;
}

export interface PlayerPosition {
  player: PublicKey;
  roundId: BN;
  side: BetSide;
  amount: BN;
  claimed: boolean;
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

// Helper to convert price to scaled format (x10^8)
export const priceToScaled = (price: number): BN => {
  return new BN(Math.floor(price * 100_000_000));
};

// Helper to convert scaled price back to USD
export const scaledToPrice = (scaled: BN | number): number => {
  const value = typeof scaled === 'number' ? scaled : scaled.toNumber();
  return value / 100_000_000;
};
