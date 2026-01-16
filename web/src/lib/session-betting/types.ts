// Session Betting Types
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Program ID
export const SESSION_BETTING_PROGRAM_ID = new PublicKey('4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA');

// Constants (matching program)
export const MIN_BET_LAMPORTS = 10_000_000; // 0.01 SOL
export const MAX_BET_LAMPORTS = 100_000_000_000; // 100 SOL
export const PLATFORM_FEE_BPS = 500; // 5%
export const ROUND_DURATION_SECONDS = 30;
export const LOCK_BUFFER_SECONDS = 5;
export const MAX_SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const FALLBACK_LOCK_DELAY_SECONDS = 60; // 60 seconds after lock_time
export const CLAIM_GRACE_PERIOD_SECONDS = 60 * 60; // 1 hour before round can be closed

// Enums
export enum BetSide {
  Up = 'up',
  Down = 'down',
}

export enum RoundStatus {
  Open = 'open',
  Locked = 'locked',
  Settled = 'settled',
}

export enum WinnerSide {
  None = 'none',
  Up = 'up',
  Down = 'down',
  Draw = 'draw',
}

/// Game type for tracking winnings source
export enum GameType {
  Oracle = 0,     // Price prediction rounds
  Battle = 1,     // PvP trading battles
  Draft = 2,      // Draft tournaments
  Spectator = 3,  // Spectator wagering
}

// Convert game type to program format
export function gameTypeToProgram(gameType: GameType): object {
  switch (gameType) {
    case GameType.Oracle: return { oracle: {} };
    case GameType.Battle: return { battle: {} };
    case GameType.Draft: return { draft: {} };
    case GameType.Spectator: return { spectator: {} };
  }
}

// Account Types
export interface GameState {
  authority: PublicKey;
  /** Pending authority for two-step transfer (null if none) */
  pendingAuthority: PublicKey | null;
  /** Pyth price feed ID for oracle validation */
  priceFeedId: number[];
  currentRound: BN;
  totalVolume: BN;
  totalFeesCollected: BN;
  isPaused: boolean;
  bump: number;
}

export interface BettingRound {
  roundId: BN;
  startTime: BN;
  lockTime: BN;
  endTime: BN;
  /** Fallback time after which anyone can lock the round (decentralization) */
  lockTimeFallback: BN;
  startPrice: BN;
  endPrice: BN;
  status: RoundStatus;
  winner: WinnerSide;
  bump: number;
}

export interface BettingPool {
  roundId: BN;
  upPool: BN;
  downPool: BN;
  totalPool: BN;
  bump: number;
}

export interface UserBalance {
  owner: PublicKey;
  balance: BN;
  totalDeposited: BN;
  totalWithdrawn: BN;
  totalWinnings: BN;
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

export interface SessionToken {
  authority: PublicKey;
  sessionSigner: PublicKey;
  validUntil: BN;
  bump: number;
}

// Helper functions
export function lamportsToSol(lamports: BN | number): number {
  const value = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return value / 1_000_000_000;
}

export function solToLamports(sol: number): BN {
  return new BN(Math.floor(sol * 1_000_000_000));
}

// Parse raw status from program
export function parseRoundStatus(status: object): RoundStatus {
  if ('open' in status) return RoundStatus.Open;
  if ('locked' in status) return RoundStatus.Locked;
  if ('settled' in status) return RoundStatus.Settled;
  return RoundStatus.Open;
}

export function parseWinnerSide(winner: object): WinnerSide {
  if ('up' in winner) return WinnerSide.Up;
  if ('down' in winner) return WinnerSide.Down;
  if ('draw' in winner) return WinnerSide.Draw;
  return WinnerSide.None;
}

export function parseBetSide(side: object): BetSide {
  if ('up' in side) return BetSide.Up;
  return BetSide.Down;
}

// Convert bet side to program format
export function betSideToProgram(side: BetSide): object {
  return side === BetSide.Up ? { up: {} } : { down: {} };
}
