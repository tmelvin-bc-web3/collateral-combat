// Battle Program Client
// Provides functions to interact with the on-chain battle game

import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  BATTLE_PROGRAM_ID,
  Config,
  Battle,
  SpectatorBet,
  TradeLog,
  Trade,
  BattleStatus,
  PlayerSide,
  lamportsToSol,
  solToLamports,
} from './types';
import idlJson from './battle_program.json';

// Cast IDL to proper type
const idl = idlJson as Idl;

// PDA Seeds
const CONFIG_SEED = Buffer.from('config');
const BATTLE_SEED = Buffer.from('battle');
const ESCROW_SEED = Buffer.from('escrow');
const SPECTATOR_BET_SEED = Buffer.from('spectator_bet');
const TRADE_LOG_SEED = Buffer.from('trade_log');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

export class BattleClient {
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

  getConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync([CONFIG_SEED], BATTLE_PROGRAM_ID);
  }

  getBattlePDA(battleId: BN | number): [PublicKey, number] {
    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    return PublicKey.findProgramAddressSync(
      [BATTLE_SEED, battleIdBN.toArrayLike(Buffer, 'le', 8)],
      BATTLE_PROGRAM_ID
    );
  }

  getEscrowPDA(battleId: BN | number): [PublicKey, number] {
    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    return PublicKey.findProgramAddressSync(
      [ESCROW_SEED, battleIdBN.toArrayLike(Buffer, 'le', 8)],
      BATTLE_PROGRAM_ID
    );
  }

  getSpectatorBetPDA(battleId: BN | number, bettor: PublicKey): [PublicKey, number] {
    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    return PublicKey.findProgramAddressSync(
      [SPECTATOR_BET_SEED, battleIdBN.toArrayLike(Buffer, 'le', 8), bettor.toBuffer()],
      BATTLE_PROGRAM_ID
    );
  }

  getTradeLogPDA(battleId: BN | number, player: PublicKey): [PublicKey, number] {
    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    return PublicKey.findProgramAddressSync(
      [TRADE_LOG_SEED, battleIdBN.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      BATTLE_PROGRAM_ID
    );
  }

  // ============================================
  // Account Fetching
  // ============================================

  async getConfig(): Promise<Config | null> {
    try {
      const [configPDA] = this.getConfigPDA();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.config.fetch(configPDA);
      return this.parseConfig(account);
    } catch {
      return null;
    }
  }

  async getBattle(battleId: BN | number): Promise<Battle | null> {
    try {
      const [battlePDA] = this.getBattlePDA(battleId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.battle.fetch(battlePDA);
      return this.parseBattle(account);
    } catch {
      return null;
    }
  }

  async getSpectatorBet(battleId: BN | number, bettor: PublicKey): Promise<SpectatorBet | null> {
    try {
      const [betPDA] = this.getSpectatorBetPDA(battleId, bettor);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.spectatorBet.fetch(betPDA);
      return this.parseSpectatorBet(account);
    } catch {
      return null;
    }
  }

  async getMySpectatorBet(battleId: BN | number): Promise<SpectatorBet | null> {
    if (!this.wallet.publicKey) return null;
    return this.getSpectatorBet(battleId, this.wallet.publicKey);
  }

  async getTradeLog(battleId: BN | number, player: PublicKey): Promise<TradeLog | null> {
    try {
      const [tradeLogPDA] = this.getTradeLogPDA(battleId, player);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.tradeLog.fetch(tradeLogPDA);
      return this.parseTradeLog(account);
    } catch {
      return null;
    }
  }

  async getOpenBattles(): Promise<Battle[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const allBattles = await accounts.battle.all();
      return allBattles
        .map((b: { account: unknown }) => this.parseBattle(b.account))
        .filter((b: Battle) => b.status === BattleStatus.Waiting);
    } catch {
      return [];
    }
  }

  async getActiveBattles(): Promise<Battle[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const allBattles = await accounts.battle.all();
      return allBattles
        .map((b: { account: unknown }) => this.parseBattle(b.account))
        .filter((b: Battle) => b.status === BattleStatus.Active);
    } catch {
      return [];
    }
  }

  // ============================================
  // Instructions
  // ============================================

  async initialize(): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [configPDA] = this.getConfigPDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .initialize()
      .accounts({
        config: configPDA,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async createBattle(entryFeeSol: number): Promise<{ tx: string; battleId: BN } | null> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const config = await this.getConfig();
    if (!config) {
      console.warn('[BattleClient] Config not initialized - on-chain battles not available');
      return null;
    }

    const battleId = config.totalBattles;
    const [configPDA] = this.getConfigPDA();
    const [battlePDA] = this.getBattlePDA(battleId);
    const [escrowPDA] = this.getEscrowPDA(battleId);

    const entryFee = solToLamports(entryFeeSol);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .createBattle(entryFee)
      .accounts({
        config: configPDA,
        battle: battlePDA,
        escrow: escrowPDA,
        creator: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, battleId };
  }

  async joinBattle(battleId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);
    const [escrowPDA] = this.getEscrowPDA(battleIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .joinBattle()
      .accounts({
        battle: battlePDA,
        escrow: escrowPDA,
        opponent: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async placeSpectatorBet(battleId: BN | number, side: PlayerSide, amountSol: number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);
    const [escrowPDA] = this.getEscrowPDA(battleIdBN);
    const [spectatorBetPDA] = this.getSpectatorBetPDA(battleIdBN, this.wallet.publicKey);

    const backedPlayer = side === PlayerSide.Creator ? { creator: {} } : { opponent: {} };
    const amount = solToLamports(amountSol);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .placeSpectatorBet(backedPlayer, amount)
      .accounts({
        battle: battlePDA,
        spectatorBet: spectatorBetPDA,
        escrow: escrowPDA,
        bettor: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async lockBetting(battleId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .lockBetting()
      .accounts({
        battle: battlePDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async settleBattle(battleId: BN | number, winner: PlayerSide): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [configPDA] = this.getConfigPDA();
    const [battlePDA] = this.getBattlePDA(battleIdBN);

    const winnerSide = winner === PlayerSide.Creator ? { creator: {} } : { opponent: {} };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .settleBattle(winnerSide)
      .accounts({
        config: configPDA,
        battle: battlePDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async claimPlayerPrize(battleId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);
    const [escrowPDA] = this.getEscrowPDA(battleIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimPlayerPrize()
      .accounts({
        battle: battlePDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async claimSpectatorWinnings(battleId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);
    const [escrowPDA] = this.getEscrowPDA(battleIdBN);
    const [spectatorBetPDA] = this.getSpectatorBetPDA(battleIdBN, this.wallet.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimSpectatorWinnings()
      .accounts({
        battle: battlePDA,
        spectatorBet: spectatorBetPDA,
        escrow: escrowPDA,
        bettor: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async cancelBattle(battleId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const battleIdBN = typeof battleId === 'number' ? new BN(battleId) : battleId;
    const [battlePDA] = this.getBattlePDA(battleIdBN);
    const [escrowPDA] = this.getEscrowPDA(battleIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .cancelBattle()
      .accounts({
        battle: battlePDA,
        escrow: escrowPDA,
        creator: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ============================================
  // Parsing Helpers
  // ============================================

  private parseConfig(account: unknown): Config {
    const acc = account as {
      authority: PublicKey;
      totalBattles: BN;
      totalVolume: BN;
      totalFeesCollected: BN;
      bump: number;
    };
    return {
      authority: acc.authority,
      totalBattles: acc.totalBattles,
      totalVolume: acc.totalVolume,
      totalFeesCollected: acc.totalFeesCollected,
      bump: acc.bump,
    };
  }

  private parseBattle(account: unknown): Battle {
    const acc = account as {
      id: BN;
      creator: PublicKey;
      opponent: PublicKey;
      entryFee: BN;
      status: { waiting?: object; active?: object; settled?: object; cancelled?: object };
      winner: PublicKey;
      playerPool: BN;
      spectatorPoolCreator: BN;
      spectatorPoolOpponent: BN;
      bettingLocked: boolean;
      createdAt: BN;
      startedAt: BN;
      endsAt: BN;
      bump: number;
    };

    let status = BattleStatus.Waiting;
    if (acc.status.active) status = BattleStatus.Active;
    else if (acc.status.settled) status = BattleStatus.Settled;
    else if (acc.status.cancelled) status = BattleStatus.Cancelled;

    return {
      id: acc.id,
      creator: acc.creator,
      opponent: acc.opponent,
      entryFee: acc.entryFee,
      status,
      winner: acc.winner,
      playerPool: acc.playerPool,
      spectatorPoolCreator: acc.spectatorPoolCreator,
      spectatorPoolOpponent: acc.spectatorPoolOpponent,
      bettingLocked: acc.bettingLocked,
      createdAt: acc.createdAt,
      startedAt: acc.startedAt,
      endsAt: acc.endsAt,
      bump: acc.bump,
    };
  }

  private parseSpectatorBet(account: unknown): SpectatorBet {
    const acc = account as {
      bettor: PublicKey;
      battleId: BN;
      backedPlayer: { creator?: object; opponent?: object };
      amount: BN;
      claimed: boolean;
      bump: number;
    };

    const backedPlayer = acc.backedPlayer.creator ? PlayerSide.Creator : PlayerSide.Opponent;

    return {
      bettor: acc.bettor,
      battleId: acc.battleId,
      backedPlayer,
      amount: acc.amount,
      claimed: acc.claimed,
      bump: acc.bump,
    };
  }

  private parseTradeLog(account: unknown): TradeLog {
    const acc = account as {
      battleId: BN;
      player: PublicKey;
      trades: {
        asset: number;
        isLong: boolean;
        leverage: number;
        size: BN;
        entryPrice: BN;
        exitPrice: BN;
        timestamp: BN;
        nonce: number;
        signature: number[];
      }[];
      finalPnl: BN;
      verified: boolean;
      bump: number;
    };

    return {
      battleId: acc.battleId,
      player: acc.player,
      trades: acc.trades.map(t => ({
        asset: t.asset,
        isLong: t.isLong,
        leverage: t.leverage,
        size: t.size,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        timestamp: t.timestamp,
        nonce: t.nonce,
        signature: t.signature,
      })),
      finalPnl: acc.finalPnl,
      verified: acc.verified,
      bump: acc.bump,
    };
  }
}

// Export utility functions
export { lamportsToSol, solToLamports };
