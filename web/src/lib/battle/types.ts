// Types for the Battle Program

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Program ID
export const BATTLE_PROGRAM_ID = new PublicKey('GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9');

// Constants from the smart contract
export const PLAYER_RAKE_BPS = 1000; // 10% rake on player prize
export const SPECTATOR_RAKE_BPS = 500; // 5% rake on spectator winnings
export const MIN_ENTRY_LAMPORTS = 100_000_000; // 0.1 SOL minimum
export const MIN_SPECTATOR_BET = 10_000_000; // 0.01 SOL minimum
export const BATTLE_DURATION_SECS = 1800; // 30 minutes
export const BETTING_LOCK_BEFORE_END = 30; // Lock betting 30s before end

// Enums
export enum BattleStatus {
  Waiting = 'Waiting',
  Active = 'Active',
  Settled = 'Settled',
  Cancelled = 'Cancelled',
}

export enum PlayerSide {
  Creator = 'Creator',
  Opponent = 'Opponent',
}

// Account structures
export interface Config {
  authority: PublicKey;
  totalBattles: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  bump: number;
}

export interface Battle {
  id: BN;
  creator: PublicKey;
  opponent: PublicKey;
  entryFee: BN;
  status: BattleStatus;
  winner: PublicKey;
  playerPool: BN;
  spectatorPoolCreator: BN;
  spectatorPoolOpponent: BN;
  bettingLocked: boolean;
  createdAt: BN;
  startedAt: BN;
  endsAt: BN;
  bump: number;
}

export interface SpectatorBet {
  bettor: PublicKey;
  battleId: BN;
  backedPlayer: PlayerSide;
  amount: BN;
  claimed: boolean;
  bump: number;
}

// Trade structure for trustless settlement
export interface Trade {
  asset: number;
  isLong: boolean;
  leverage: number;
  size: BN;
  entryPrice: BN;
  exitPrice: BN;
  timestamp: BN;
  nonce: number;
  signature: number[];
}

// Trade log for a player in a battle
export interface TradeLog {
  battleId: BN;
  player: PublicKey;
  trades: Trade[];
  finalPnl: BN;
  verified: boolean;
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

// Calculate time remaining for a battle
export const getTimeRemaining = (endsAt: BN | number): number => {
  const endTime = typeof endsAt === 'number' ? endsAt : endsAt.toNumber();
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, endTime - now);
};

// Check if betting is still open
export const isBettingOpen = (battle: Battle): boolean => {
  if (battle.status !== BattleStatus.Active) return false;
  if (battle.bettingLocked) return false;
  const now = Math.floor(Date.now() / 1000);
  return now < battle.endsAt.toNumber() - BETTING_LOCK_BEFORE_END;
};
