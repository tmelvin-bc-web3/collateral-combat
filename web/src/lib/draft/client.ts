// Draft Program Client
// Provides functions to interact with the on-chain draft tournament game

import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  DRAFT_PROGRAM_ID,
  Config,
  Draft,
  DraftEntry,
  DraftStatus,
  lamportsToSol,
  solToLamports,
} from './types';
import idlJson from './draft_program.json';

// Cast IDL to proper type
const idl = idlJson as Idl;

// PDA Seeds
const CONFIG_SEED = Buffer.from('config');
const DRAFT_SEED = Buffer.from('draft');
const ENTRY_SEED = Buffer.from('entry');
const ESCROW_SEED = Buffer.from('escrow');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

export class DraftClient {
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
    return PublicKey.findProgramAddressSync([CONFIG_SEED], DRAFT_PROGRAM_ID);
  }

  getDraftPDA(draftId: BN | number): [PublicKey, number] {
    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    return PublicKey.findProgramAddressSync(
      [DRAFT_SEED, draftIdBN.toArrayLike(Buffer, 'le', 8)],
      DRAFT_PROGRAM_ID
    );
  }

  getEntryPDA(draftId: BN | number, player: PublicKey): [PublicKey, number] {
    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    return PublicKey.findProgramAddressSync(
      [ENTRY_SEED, draftIdBN.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      DRAFT_PROGRAM_ID
    );
  }

  getEscrowPDA(draftId: BN | number): [PublicKey, number] {
    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    return PublicKey.findProgramAddressSync(
      [ESCROW_SEED, draftIdBN.toArrayLike(Buffer, 'le', 8)],
      DRAFT_PROGRAM_ID
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

  async getDraft(draftId: BN | number): Promise<Draft | null> {
    try {
      const [draftPDA] = this.getDraftPDA(draftId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.draft.fetch(draftPDA);
      return this.parseDraft(account);
    } catch {
      return null;
    }
  }

  async getEntry(draftId: BN | number, player: PublicKey): Promise<DraftEntry | null> {
    try {
      const [entryPDA] = this.getEntryPDA(draftId, player);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.draftEntry.fetch(entryPDA);
      return this.parseEntry(account);
    } catch {
      return null;
    }
  }

  async getMyEntry(draftId: BN | number): Promise<DraftEntry | null> {
    if (!this.wallet.publicKey) return null;
    return this.getEntry(draftId, this.wallet.publicKey);
  }

  async getOpenDrafts(): Promise<Draft[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const allDrafts = await accounts.draft.all();
      return allDrafts
        .map((d: { account: unknown }) => this.parseDraft(d.account))
        .filter((d: Draft) => d.status === DraftStatus.Open);
    } catch {
      return [];
    }
  }

  async getActiveDrafts(): Promise<Draft[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const allDrafts = await accounts.draft.all();
      return allDrafts
        .map((d: { account: unknown }) => this.parseDraft(d.account))
        .filter((d: Draft) => d.status === DraftStatus.Active);
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

  async createDraft(entryFeeSol: number, maxPlayers: number, numPicks: number): Promise<{ tx: string; draftId: BN }> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const config = await this.getConfig();
    if (!config) throw new Error('Config not initialized');

    const draftId = config.totalDrafts;
    const [configPDA] = this.getConfigPDA();
    const [draftPDA] = this.getDraftPDA(draftId);

    const entryFee = solToLamports(entryFeeSol);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .createDraft(entryFee, maxPlayers, numPicks)
      .accounts({
        config: configPDA,
        draft: draftPDA,
        creator: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, draftId };
  }

  async joinDraft(draftId: BN | number, picks: string[]): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);
    const [entryPDA] = this.getEntryPDA(draftIdBN, this.wallet.publicKey);
    const [escrowPDA] = this.getEscrowPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .joinDraft(picks)
      .accounts({
        draft: draftPDA,
        entry: entryPDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async startDraft(draftId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .startDraft()
      .accounts({
        draft: draftPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async lockDraft(draftId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .lockDraft()
      .accounts({
        draft: draftPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async submitScore(draftId: BN | number, playerPubkey: PublicKey, score: number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);
    const [entryPDA] = this.getEntryPDA(draftIdBN, playerPubkey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .submitScore(new BN(score))
      .accounts({
        draft: draftPDA,
        entry: entryPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async settleDraft(draftId: BN | number, rankings: PublicKey[]): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [configPDA] = this.getConfigPDA();
    const [draftPDA] = this.getDraftPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .settleDraft(rankings)
      .accounts({
        config: configPDA,
        draft: draftPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async updateRank(draftId: BN | number, playerPubkey: PublicKey, rank: number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);
    const [entryPDA] = this.getEntryPDA(draftIdBN, playerPubkey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .updateRank(rank)
      .accounts({
        draft: draftPDA,
        entry: entryPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async claimWinnings(draftId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);
    const [entryPDA] = this.getEntryPDA(draftIdBN, this.wallet.publicKey);
    const [escrowPDA] = this.getEscrowPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimWinnings()
      .accounts({
        draft: draftPDA,
        entry: entryPDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async cancelDraft(draftId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .cancelDraft()
      .accounts({
        draft: draftPDA,
        creator: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  async refundEntry(draftId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const draftIdBN = typeof draftId === 'number' ? new BN(draftId) : draftId;
    const [draftPDA] = this.getDraftPDA(draftIdBN);
    const [entryPDA] = this.getEntryPDA(draftIdBN, this.wallet.publicKey);
    const [escrowPDA] = this.getEscrowPDA(draftIdBN);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .refundEntry()
      .accounts({
        draft: draftPDA,
        entry: entryPDA,
        escrow: escrowPDA,
        player: this.wallet.publicKey,
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
      totalDrafts: BN;
      totalVolume: BN;
      totalFeesCollected: BN;
      bump: number;
    };
    return {
      authority: acc.authority,
      totalDrafts: acc.totalDrafts,
      totalVolume: acc.totalVolume,
      totalFeesCollected: acc.totalFeesCollected,
      bump: acc.bump,
    };
  }

  private parseDraft(account: unknown): Draft {
    const acc = account as {
      id: BN;
      creator: PublicKey;
      entryFee: BN;
      maxPlayers: number;
      numPicks: number;
      currentPlayers: number;
      totalPool: BN;
      status: { open?: object; active?: object; locked?: object; settled?: object; cancelled?: object };
      createdAt: BN;
      startedAt: BN;
      endsAt: BN;
      firstPlace: PublicKey;
      secondPlace: PublicKey;
      thirdPlace: PublicKey;
      bump: number;
    };

    let status = DraftStatus.Open;
    if (acc.status.active) status = DraftStatus.Active;
    else if (acc.status.locked) status = DraftStatus.Locked;
    else if (acc.status.settled) status = DraftStatus.Settled;
    else if (acc.status.cancelled) status = DraftStatus.Cancelled;

    return {
      id: acc.id,
      creator: acc.creator,
      entryFee: acc.entryFee,
      maxPlayers: acc.maxPlayers,
      numPicks: acc.numPicks,
      currentPlayers: acc.currentPlayers,
      totalPool: acc.totalPool,
      status,
      createdAt: acc.createdAt,
      startedAt: acc.startedAt,
      endsAt: acc.endsAt,
      firstPlace: acc.firstPlace,
      secondPlace: acc.secondPlace,
      thirdPlace: acc.thirdPlace,
      bump: acc.bump,
    };
  }

  private parseEntry(account: unknown): DraftEntry {
    const acc = account as {
      player: PublicKey;
      draftId: BN;
      picks: string[];
      score: BN;
      finalRank: number;
      claimed: boolean;
      joinedAt: BN;
      bump: number;
    };

    return {
      player: acc.player,
      draftId: acc.draftId,
      picks: acc.picks,
      score: acc.score,
      finalRank: acc.finalRank,
      claimed: acc.claimed,
      joinedAt: acc.joinedAt,
      bump: acc.bump,
    };
  }
}

// Export utility functions
export { lamportsToSol, solToLamports };
