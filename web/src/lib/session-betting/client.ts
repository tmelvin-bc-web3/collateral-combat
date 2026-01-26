// Session Betting Program Client
// Provides functions to interact with the on-chain session betting game

import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Keypair } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  SESSION_BETTING_PROGRAM_ID,
  GameState,
  BettingRound,
  BettingPool,
  UserBalance,
  PlayerPosition,
  SessionToken,
  BetSide,
  GameType,
  parseRoundStatus,
  parseWinnerSide,
  parseBetSide,
  betSideToProgram,
  gameTypeToProgram,
} from './types';
import idlJson from './session_betting.json';

// Cast IDL to proper type
const idl = idlJson as Idl;

// PDA Seeds
const GAME_SEED = Buffer.from('game');
const ROUND_SEED = Buffer.from('round');
const POOL_SEED = Buffer.from('pool');
const BALANCE_SEED = Buffer.from('balance');
const VAULT_SEED = Buffer.from('vault');
const GLOBAL_VAULT_SEED = Buffer.from('global_vault');
const POSITION_SEED = Buffer.from('position');
const SESSION_SEED = Buffer.from('session');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program<any>;

export class SessionBettingClient {
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
    return PublicKey.findProgramAddressSync([GAME_SEED], SESSION_BETTING_PROGRAM_ID);
  }

  getRoundPDA(roundId: BN | number): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [ROUND_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getPoolPDA(roundId: BN | number): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [POOL_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8)],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getBalancePDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [BALANCE_SEED, owner.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getVaultPDA(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [VAULT_SEED, owner.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getPositionPDA(roundId: BN | number, player: PublicKey): [PublicKey, number] {
    const roundIdBN = typeof roundId === 'number' ? new BN(roundId) : roundId;
    return PublicKey.findProgramAddressSync(
      [POSITION_SEED, roundIdBN.toArrayLike(Buffer, 'le', 8), player.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getSessionPDA(authority: PublicKey, sessionSigner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [SESSION_SEED, authority.toBuffer(), sessionSigner.toBuffer()],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  getGlobalVaultPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [GLOBAL_VAULT_SEED],
      SESSION_BETTING_PROGRAM_ID
    );
  }

  // ============================================
  // Account Fetching
  // ============================================

  async getGameState(): Promise<GameState | null> {
    try {
      const [gameStatePDA] = this.getGameStatePDA();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.gameState.fetch(gameStatePDA);
      return this.parseGameState(account);
    } catch {
      return null;
    }
  }

  async getRound(roundId: BN | number): Promise<BettingRound | null> {
    try {
      const [roundPDA] = this.getRoundPDA(roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.bettingRound.fetch(roundPDA);
      return this.parseRound(account);
    } catch {
      return null;
    }
  }

  async getPool(roundId: BN | number): Promise<BettingPool | null> {
    try {
      const [poolPDA] = this.getPoolPDA(roundId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.bettingPool.fetch(poolPDA);
      return this.parsePool(account);
    } catch {
      return null;
    }
  }

  async getUserBalance(owner?: PublicKey): Promise<UserBalance | null> {
    try {
      const ownerKey = owner || this.wallet.publicKey;
      if (!ownerKey) return null;

      const [balancePDA] = this.getBalancePDA(ownerKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.userBalance.fetch(balancePDA);
      return this.parseUserBalance(account);
    } catch {
      return null;
    }
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

  async getSession(authority: PublicKey, sessionSigner: PublicKey): Promise<SessionToken | null> {
    try {
      const [sessionPDA] = this.getSessionPDA(authority, sessionSigner);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = this.program.account as any;
      const account = await accounts.sessionToken.fetch(sessionPDA);
      return this.parseSession(account);
    } catch {
      return null;
    }
  }

  async getCurrentRound(): Promise<BettingRound | null> {
    const gameState = await this.getGameState();
    if (!gameState) return null;

    const currentRoundId = gameState.currentRound.toNumber();
    if (currentRoundId === 0) return null;

    return this.getRound(currentRoundId - 1);
  }

  // ============================================
  // User Balance Instructions
  // ============================================

  /**
   * Deposit SOL into user's balance
   * Requires wallet signature
   */
  async deposit(amountLamports: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [userBalancePDA] = this.getBalancePDA(this.wallet.publicKey);
    const [vaultPDA] = this.getVaultPDA(this.wallet.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .deposit(amount)
      .accounts({
        userBalance: userBalancePDA,
        vault: vaultPDA,
        user: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Withdraw SOL from user's balance
   * Requires wallet signature - CANNOT use session key
   */
  async withdraw(amountLamports: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [userBalancePDA] = this.getBalancePDA(this.wallet.publicKey);
    const [vaultPDA] = this.getVaultPDA(this.wallet.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .withdraw(amount)
      .accounts({
        userBalance: userBalancePDA,
        vault: vaultPDA,
        user: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Create a new session key
   * Returns the session keypair that can be used for betting
   */
  async createSession(validUntilTimestamp: number): Promise<{ tx: string; sessionKeypair: Keypair }> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    // Generate a new session keypair
    const sessionKeypair = Keypair.generate();
    const [sessionPDA] = this.getSessionPDA(this.wallet.publicKey, sessionKeypair.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .createSession(new BN(validUntilTimestamp))
      .accounts({
        sessionToken: sessionPDA,
        authority: this.wallet.publicKey,
        sessionSigner: sessionKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { tx, sessionKeypair };
  }

  /**
   * Revoke an existing session
   */
  async revokeSession(sessionSigner: PublicKey): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [sessionPDA] = this.getSessionPDA(this.wallet.publicKey, sessionSigner);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .revokeSession()
      .accounts({
        sessionToken: sessionPDA,
        authority: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  // ============================================
  // Betting Instructions (Can use session key)
  // ============================================

  /**
   * Place a bet using wallet signature
   */
  async placeBet(roundId: BN | number, side: BetSide, amountLamports: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);
    const [userBalancePDA] = this.getBalancePDA(this.wallet.publicKey);
    const [positionPDA] = this.getPositionPDA(roundId, this.wallet.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .placeBet(betSideToProgram(side), amount)
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        userBalance: userBalancePDA,
        position: positionPDA,
        sessionToken: null, // Using wallet directly
        signer: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Place a bet using session key (no wallet popup)
   */
  async placeBetWithSession(
    roundId: BN | number,
    side: BetSide,
    amountLamports: BN | number,
    sessionKeypair: Keypair,
    ownerPubkey: PublicKey
  ): Promise<string> {
    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);
    const [userBalancePDA] = this.getBalancePDA(ownerPubkey);
    const [positionPDA] = this.getPositionPDA(roundId, ownerPubkey);
    const [sessionPDA] = this.getSessionPDA(ownerPubkey, sessionKeypair.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .placeBet(betSideToProgram(side), amount)
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        userBalance: userBalancePDA,
        position: positionPDA,
        sessionToken: sessionPDA,
        signer: sessionKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([sessionKeypair])
      .rpc();

    return tx;
  }

  /**
   * Claim winnings using wallet signature
   */
  async claimWinnings(roundId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);
    const [userBalancePDA] = this.getBalancePDA(this.wallet.publicKey);
    const [positionPDA] = this.getPositionPDA(roundId, this.wallet.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimWinnings()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        userBalance: userBalancePDA,
        position: positionPDA,
        sessionToken: null,
        signer: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim winnings using session key
   */
  async claimWinningsWithSession(
    roundId: BN | number,
    sessionKeypair: Keypair,
    ownerPubkey: PublicKey
  ): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);
    const [userBalancePDA] = this.getBalancePDA(ownerPubkey);
    const [positionPDA] = this.getPositionPDA(roundId, ownerPubkey);
    const [sessionPDA] = this.getSessionPDA(ownerPubkey, sessionKeypair.publicKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .claimWinnings()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        userBalance: userBalancePDA,
        position: positionPDA,
        sessionToken: sessionPDA,
        signer: sessionKeypair.publicKey,
      })
      .signers([sessionKeypair])
      .rpc();

    return tx;
  }

  // ============================================
  // Permissionless Instructions (Decentralization)
  // ============================================

  /**
   * Lock a round via permissionless fallback with Pyth oracle price
   * Anyone can call this after lockTimeFallback has passed
   * This prevents rounds from getting stuck if authority goes offline
   * SECURITY: Uses Pyth oracle for tamper-proof pricing
   * @param roundId The round to lock
   * @param priceFeedAccount The Pyth price feed account for the configured asset
   */
  async lockRoundFallback(roundId: BN | number, priceFeedAccount: PublicKey): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .lockRoundFallback()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        priceFeed: priceFeedAccount,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Lock a round with Pyth oracle price (authority only)
   * @param roundId The round to lock
   * @param priceFeedAccount The Pyth price feed account
   * @param authorityKeypair The authority keypair
   */
  async lockRound(
    roundId: BN | number,
    priceFeedAccount: PublicKey,
    authorityKeypair: Keypair
  ): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .lockRound()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        priceFeed: priceFeedAccount,
        authority: authorityKeypair.publicKey,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Settle a round (already permissionless)
   * Anyone can call after round is locked and end_time has passed
   */
  async settleRound(roundId: BN | number): Promise<string> {
    if (!this.wallet.publicKey) throw new Error('Wallet not connected');

    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .settleRound()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        caller: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Close a settled round and reclaim rent
   * AUTHORITY ONLY - can only be called after 1 hour grace period
   * Unclaimed winnings are forfeited to the protocol
   * @param roundId The round to close
   * @param authorityKeypair The authority keypair
   */
  async closeRound(
    roundId: BN | number,
    authorityKeypair: Keypair
  ): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();
    const [roundPDA] = this.getRoundPDA(roundId);
    const [poolPDA] = this.getPoolPDA(roundId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .closeRound()
      .accounts({
        gameState: gameStatePDA,
        round: roundPDA,
        pool: poolPDA,
        authority: authorityKeypair.publicKey,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  // ============================================
  // Authority-Only Game Settlement Instructions
  // These are called by the backend to settle games
  // ============================================

  /**
   * Transfer lamports from user's vault to global vault
   * AUTHORITY ONLY - used when user loses a game
   * @param userWallet The wallet address of the user whose balance to debit
   * @param amountLamports Amount to transfer in lamports
   * @param authorityKeypair The authority keypair (backend's keypair)
   * @param gameType The game type (defaults to Oracle)
   */
  async transferToGlobalVault(
    userWallet: PublicKey,
    amountLamports: BN | number,
    authorityKeypair: Keypair,
    gameType: GameType = GameType.Oracle
  ): Promise<string> {
    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [userBalancePDA] = this.getBalancePDA(userWallet);
    const [userVaultPDA] = this.getVaultPDA(userWallet);
    const [globalVaultPDA] = this.getGlobalVaultPDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .transferToGlobalVault(amount, gameTypeToProgram(gameType))
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
        owner: userWallet,
        userBalance: userBalancePDA,
        userVault: userVaultPDA,
        globalVault: globalVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Credit winnings to user's balance
   * AUTHORITY ONLY - used to pay out game winners
   * @param userWallet The wallet address of the user to credit
   * @param amountLamports Amount to credit in lamports
   * @param gameType Type of game (Oracle, Battle, Draft, Spectator)
   * @param gameId Unique game identifier (32 bytes)
   * @param authorityKeypair The authority keypair (backend's keypair)
   */
  async creditWinnings(
    userWallet: PublicKey,
    amountLamports: BN | number,
    gameType: GameType,
    gameId: Uint8Array,
    authorityKeypair: Keypair
  ): Promise<string> {
    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [userBalancePDA] = this.getBalancePDA(userWallet);
    const [userVaultPDA] = this.getVaultPDA(userWallet);
    const [globalVaultPDA] = this.getGlobalVaultPDA();

    // Ensure gameId is exactly 32 bytes
    const gameIdArray = Array.from(gameId.slice(0, 32));
    while (gameIdArray.length < 32) {
      gameIdArray.push(0);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .creditWinnings(amount, gameTypeToProgram(gameType), gameIdArray)
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
        owner: userWallet,
        userBalance: userBalancePDA,
        userVault: userVaultPDA,
        globalVault: globalVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Fund the global vault with SOL for payouts
   * AUTHORITY ONLY - authority deposits funds
   * @param amountLamports Amount to deposit in lamports
   * @param authorityKeypair The authority keypair (backend's keypair)
   */
  async fundGlobalVault(
    amountLamports: BN | number,
    authorityKeypair: Keypair
  ): Promise<string> {
    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [globalVaultPDA] = this.getGlobalVaultPDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .fundGlobalVault(amount)
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
        globalVault: globalVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Get the current balance in the global vault
   */
  async getGlobalVaultBalance(): Promise<number> {
    const [globalVaultPDA] = this.getGlobalVaultPDA();
    const accountInfo = await this.connection.getAccountInfo(globalVaultPDA);
    return accountInfo?.lamports || 0;
  }

  // ============================================
  // Authority Management (Two-Step Transfer)
  // ============================================

  /**
   * Propose a new authority (step 1 of 2-step transfer)
   * AUTHORITY ONLY - current authority proposes a new one
   * @param newAuthority The proposed new authority pubkey
   * @param authorityKeypair The current authority keypair
   */
  async proposeAuthorityTransfer(
    newAuthority: PublicKey,
    authorityKeypair: Keypair
  ): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .proposeAuthorityTransfer(newAuthority)
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Accept authority transfer (step 2 of 2-step transfer)
   * PENDING AUTHORITY ONLY - new authority accepts the transfer
   * @param newAuthorityKeypair The pending authority's keypair
   */
  async acceptAuthorityTransfer(newAuthorityKeypair: Keypair): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .acceptAuthorityTransfer()
      .accounts({
        gameState: gameStatePDA,
        newAuthority: newAuthorityKeypair.publicKey,
      })
      .signers([newAuthorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Cancel a pending authority transfer
   * AUTHORITY ONLY - current authority cancels the pending transfer
   * @param authorityKeypair The current authority keypair
   */
  async cancelAuthorityTransfer(authorityKeypair: Keypair): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .cancelAuthorityTransfer()
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  // ============================================
  // Fee Management
  // ============================================

  /**
   * Withdraw collected platform fees
   * AUTHORITY ONLY - withdraws fees to authority wallet
   * @param amountLamports Amount to withdraw in lamports
   * @param authorityKeypair The authority keypair
   */
  async withdrawFees(
    amountLamports: BN | number,
    authorityKeypair: Keypair
  ): Promise<string> {
    const amount = typeof amountLamports === 'number' ? new BN(amountLamports) : amountLamports;
    const [gameStatePDA] = this.getGameStatePDA();
    const [globalVaultPDA] = this.getGlobalVaultPDA();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .withdrawFees(amount)
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
        globalVault: globalVaultPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  /**
   * Set/update the Pyth price feed ID
   * AUTHORITY ONLY - changes the oracle price feed
   * @param priceFeedId New 32-byte price feed ID
   * @param authorityKeypair The authority keypair
   */
  async setPriceFeed(
    priceFeedId: number[] | Uint8Array,
    authorityKeypair: Keypair
  ): Promise<string> {
    const [gameStatePDA] = this.getGameStatePDA();

    // Ensure priceFeedId is exactly 32 bytes
    const feedIdArray = Array.from(priceFeedId).slice(0, 32);
    while (feedIdArray.length < 32) {
      feedIdArray.push(0);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const methods = this.program.methods as any;
    const tx = await methods
      .setPriceFeed(feedIdArray)
      .accounts({
        gameState: gameStatePDA,
        authority: authorityKeypair.publicKey,
      })
      .signers([authorityKeypair])
      .rpc();

    return tx;
  }

  // ============================================
  // Parsing Helpers
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseGameState(account: any): GameState {
    return {
      authority: account.authority,
      pendingAuthority: account.pendingAuthority || null,
      priceFeedId: account.priceFeedId || [],
      currentRound: account.currentRound,
      totalVolume: account.totalVolume,
      totalFeesCollected: account.totalFeesCollected,
      isPaused: account.isPaused,
      bump: account.bump,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseRound(account: any): BettingRound {
    return {
      roundId: account.roundId,
      startTime: account.startTime,
      lockTime: account.lockTime,
      endTime: account.endTime,
      lockTimeFallback: account.lockTimeFallback,
      startPrice: account.startPrice,
      endPrice: account.endPrice,
      status: parseRoundStatus(account.status),
      winner: parseWinnerSide(account.winner),
      bump: account.bump,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parsePool(account: any): BettingPool {
    return {
      roundId: account.roundId,
      upPool: account.upPool,
      downPool: account.downPool,
      totalPool: account.totalPool,
      bump: account.bump,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseUserBalance(account: any): UserBalance {
    return {
      owner: account.owner,
      balance: account.balance,
      totalDeposited: account.totalDeposited,
      totalWithdrawn: account.totalWithdrawn,
      totalWinnings: account.totalWinnings,
      bump: account.bump,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parsePosition(account: any): PlayerPosition {
    return {
      player: account.player,
      roundId: account.roundId,
      side: parseBetSide(account.side),
      amount: account.amount,
      claimed: account.claimed,
      bump: account.bump,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseSession(account: any): SessionToken {
    return {
      authority: account.authority,
      sessionSigner: account.sessionSigner,
      validUntil: account.validUntil,
      bump: account.bump,
    };
  }
}
