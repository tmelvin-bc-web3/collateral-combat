// Prediction Program Client
// Provides functions to interact with the on-chain prediction game

import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  PREDICTION_PROGRAM_ID,
  GameState,
  PredictionRound,
  PlayerPosition,
  BetSide,
  RoundStatus,
  WinnerSide,
  lamportsToSol,
  solToLamports,
  scaledToPrice,
} from './types';
import idlJson from './prediction_program.json';

// Cast IDL to proper type
const idl = idlJson as Idl;

// PDA Seeds
const GAME_SEED = Buffer.from('game');
const ROUND_SEED = Buffer.from('round');
const POSITION_SEED = Buffer.from('position');
const ESCROW_SEED = Buffer.from('escrow');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

export class PredictionClient {
  private program: AnyProgram;
  private connection: Connection;
  private wallet: WalletContextState;

  constructor(connection: Connection, wallet: WalletContextState) {
    this.connection = connection;
    this.wallet = wallet;

    // Create provider
    const provider = new AnchorProvider(
      connection,
      wallet as unknown as AnchorProvider['wallet'],
      { commitment: 'confirmed' }
    );

    // Initialize program with IDL
    this.program = new Program(idl, provider);
  }

  // ============================================
  // PDA Derivation
  // ============================================

  getGameStatePDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([GAME_SEED], PREDICTION_PROGRAM_ID);
  }

  getRoundPDA(roundId: BN | number): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [ROUND_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      PREDICTION_PROGRAM_ID
    );
  }

  getEscrowPDA(roundId: BN | number): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [ESCROW_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      PREDICTION_PROGRAM_ID
    );
  }

  getPositionPDA(roundId: BN | number, player: PublicKey): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [POSITION_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      PREDICTION_PROGRAM_ID
    );
  }

  // ============================================
  // Account Fetching
  // ============================================

  async getGameState(): Promise<GameState | null> {
    try {
      const [gameStatePDA] = this.getGameStatePDA();
      // Access account namespace with type assertion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.gameState.fetch(gameStatePDA);
      return this.parseGameState(account);
    } catch {
      return null;
    }
  }

  async getRound(roundId: BN | number): Promise<PredictionRound | null> {
    try {
      const [roundPDA] = this.getRoundPDA(roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.predictionRound.fetch(roundPDA);
      return this.parseRound(account);
    } catch {
      return null;
    }
  }

  async getCurrentRound(): Promise<PredictionRound | null> {
    const gameState = await this.getGameState();
    if (!gameState) return null;

    // Current round is the one being played (currentRound - 1 since we increment after init)
    const currentRoundId = gameState.currentRound.toNumber();
    if (currentRoundId === 0) return null;

    return this.getRound(currentRoundId - 1);
  }

  async getPosition(roundId: BN | number, player: PublicKey): Promise<PlayerPosition | null> {
    try {
      const [positionPDA] = this.getPositionPDA(roundId, player);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.playerPosition.fetch(positionPDA);
      return this.parsePosition(account);
    } catch {
      return null;
    }
  }

  async getMyPosition(roundId: BN | number): Promise<PlayerPosition | null> {
    if (!this.wallet.publicKey) return null;
    return this.getPosition(roundId, this.wallet.publicKey);
  }

  // ============================================
  // Instructions
  // ============================================

  async initializeGame(): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [gameStatePDA] = this.getGameStatePDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .initializeGame()
      .accounts({
        gameState: gameStatePDA,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async placeBet(roundId: BN | number, side: 'up' | 'down', amountSol: number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    const [roundPDA] = this.getRoundPDA(roundIdBN);
    const [positionPDA] = this.getPositionPDA(roundIdBN, this.wallet.publicKey);
    const [escrowPDA] = this.getEscrowPDA(roundIdBN);

    const betSide = side === 'up' ? { up: {} } : { down: {} };
    const amount = solToLamports(amountSol);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .placeBet(betSide, amount)
      .accounts({
        round: roundPDA,
        position: positionPDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async claimWinnings(roundId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    const [roundPDA] = this.getRoundPDA(roundIdBN);
    const [positionPDA] = this.getPositionPDA(roundIdBN, this.wallet.publicKey);
    const [escrowPDA] = this.getEscrowPDA(roundIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimWinnings()
      .accounts({
        round: roundPDA,
        position: positionPDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  // ============================================
  // Parsing Helpers
  // ============================================

  private parseGameState(account: unknown): GameState {
    const acc = account as {
      authority: PublicKey;
      currentRound: BN;
      totalVolume: BN;
      totalFeesCollected: BN;
      bump: number;
    };
    return {
      authority: acc.authority,
      currentRound: acc.currentRound,
      totalVolume: acc.totalVolume,
      totalFeesCollected: acc.totalFeesCollected,
      bump: acc.bump,
    };
  }

  private parseRound(account: unknown): PredictionRound {
    const acc = account as {
      roundId: BN;
      startTime: BN;
      lockTime: BN;
      startPrice: BN;
      endPrice: BN;
      upPool: BN;
      downPool: BN;
      totalPool: BN;
      status: { betting?: object; locked?: object; settled?: object };
      winner: { none?: object; up?: object; down?: object; draw?: object };
      bump: number;
    };

    let status = RoundStatus.Betting;
    if (acc.status.locked) status = RoundStatus.Locked;
    else if (acc.status.settled) status = RoundStatus.Settled;

    let winner = WinnerSide.None;
    if (acc.winner.up) winner = WinnerSide.Up;
    else if (acc.winner.down) winner = WinnerSide.Down;
    else if (acc.winner.draw) winner = WinnerSide.Draw;

    return {
      roundId: acc.roundId,
      startTime: acc.startTime,
      lockTime: acc.lockTime,
      startPrice: acc.startPrice,
      endPrice: acc.endPrice,
      upPool: acc.upPool,
      downPool: acc.downPool,
      totalPool: acc.totalPool,
      status,
      winner,
      bump: acc.bump,
    };
  }

  private parsePosition(account: unknown): PlayerPosition {
    const acc = account as {
      player: PublicKey;
      roundId: BN;
      side: { up?: object; down?: object };
      amount: BN;
      claimed: boolean;
      bump: number;
    };

    const side = acc.side.up ? BetSide.Up : BetSide.Down;

    return {
      player: acc.player,
      roundId: acc.roundId,
      side,
      amount: acc.amount,
      claimed: acc.claimed,
      bump: acc.bump,
    };
  }
}

// Export utility functions
export { lamportsToSol, solToLamports, scaledToPrice };
