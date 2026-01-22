import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import * as idl from '../idl/battle_program.json';
import { SignedTrade, Battle } from '../types';
import { alertService } from './alertService';

const BATTLE_PROGRAM_ID = new PublicKey('GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9');

// PDA Seeds
const CONFIG_SEED = Buffer.from('config');
const BATTLE_SEED = Buffer.from('battle');
const TRADE_LOG_SEED = Buffer.from('trade_log');

// Asset mapping
const ASSET_INDEX: Record<string, number> = {
  'SOL': 0,
  'BTC': 1,
  'ETH': 2,
  'WIF': 3,
  'BONK': 4,
  'JUP': 5,
  'RAY': 6,
  'JTO': 7,
};

// Winner options matching the Anchor enum
type WinnerOption = { creator: {} } | { opponent: {} } | { draw: {} };

class BattleSettlementService {
  private connection: Connection;
  private authority: Keypair | null = null;
  private program: Program | null = null;
  private initialized = false;

  constructor() {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Initialize the service with the settlement authority keypair
   * Must be called before settling battles
   */
  initialize(): boolean {
    try {
      const privateKeyBase58 = process.env.BATTLE_AUTHORITY_PRIVATE_KEY;
      if (!privateKeyBase58) {
        console.warn('[Settlement] BATTLE_AUTHORITY_PRIVATE_KEY not set - on-chain settlement disabled');
        return false;
      }

      // Decode the private key (could be base58 or JSON array)
      let secretKey: Uint8Array;
      if (privateKeyBase58.startsWith('[')) {
        // JSON array format
        secretKey = Uint8Array.from(JSON.parse(privateKeyBase58));
      } else {
        // Base58 format
        secretKey = bs58.decode(privateKeyBase58);
      }

      this.authority = Keypair.fromSecretKey(secretKey);
      console.log(`[Settlement] Authority wallet: ${this.authority.publicKey.toBase58()}`);

      // Create Anchor provider and program
      const wallet = new Wallet(this.authority);
      const provider = new AnchorProvider(this.connection, wallet, { commitment: 'confirmed' });
      this.program = new Program(idl as any, provider);

      this.initialized = true;
      console.log('[Settlement] Service initialized successfully');
      return true;
    } catch (error) {
      console.error('[Settlement] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Check if the service is ready to settle battles
   */
  isReady(): boolean {
    return this.initialized && this.authority !== null && this.program !== null;
  }

  /**
   * Get the config PDA
   */
  private getConfigPDA(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync([CONFIG_SEED], BATTLE_PROGRAM_ID);
    return pda;
  }

  /**
   * Get the battle PDA from on-chain battle ID
   */
  private getBattlePDA(battleId: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [BATTLE_SEED, battleId.toArrayLike(Buffer, 'le', 8)],
      BATTLE_PROGRAM_ID
    );
    return pda;
  }

  /**
   * Get the trade log PDA for a player in a battle
   */
  private getTradeLogPDA(battleId: BN, playerPubkey: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [TRADE_LOG_SEED, battleId.toArrayLike(Buffer, 'le', 8), playerPubkey.toBuffer()],
      BATTLE_PROGRAM_ID
    );
    return pda;
  }

  /**
   * Settle a battle on-chain
   * @param onChainBattleId The on-chain battle account pubkey (as string)
   * @param winnerWallet The wallet address of the winner
   * @param isCreator Whether the winner is the creator (true) or opponent (false)
   * @returns Transaction signature or null if failed
   */
  async settleBattle(
    onChainBattleId: string,
    winnerWallet: string,
    isCreator: boolean = true  // For solo practice, creator is always winner
  ): Promise<string | null> {
    if (!this.isReady()) {
      console.warn('[Settlement] Service not initialized - skipping on-chain settlement');
      return null;
    }

    try {
      const battlePDA = new PublicKey(onChainBattleId);
      const configPDA = this.getConfigPDA();

      // Determine winner based on if they're creator or opponent
      const winner: WinnerOption = isCreator ? { creator: {} } : { opponent: {} };

      console.log(`[Settlement] Settling battle ${onChainBattleId}`);
      console.log(`  Winner: ${winnerWallet} (${isCreator ? 'creator' : 'opponent'})`);

      const tx = await (this.program!.methods as any)
        .settleBattle(winner)
        .accounts({
          config: configPDA,
          battle: battlePDA,
          caller: this.authority!.publicKey,
        })
        .signers([this.authority!])
        .rpc();

      console.log(`[Settlement] Battle settled! Tx: ${tx}`);
      return tx;
    } catch (error: any) {
      console.error('[Settlement] Failed to settle battle:', error.message);
      if (error.logs) {
        console.error('[Settlement] Logs:', error.logs.slice(-5).join('\n'));
      }
      await alertService.sendCriticalAlert(
        'Settlement Failed',
        `Battle settlement failed for: ${onChainBattleId.substring(0, 16)}...`,
        'SETTLEMENT_FAILED',
        {
          battleId: onChainBattleId.substring(0, 16),
          winner: winnerWallet.substring(0, 8),
          phase: 'settlement',
          errorMessage: error.message?.substring(0, 200)
        }
      );
      return null;
    }
  }

  /**
   * Check if a battle has been settled on-chain
   */
  async isBattleSettled(onChainBattleId: string): Promise<boolean> {
    if (!this.program) return false;

    try {
      const battlePDA = new PublicKey(onChainBattleId);
      const battle = await (this.program.account as any).battle.fetch(battlePDA);

      // Check if status is 'settled' (the enum variant)
      const status = Object.keys(battle.status)[0];
      return status === 'settled';
    } catch (error) {
      console.error('[Settlement] Failed to check battle status:', error);
      return false;
    }
  }

  /**
   * Get battle data from on-chain
   */
  async getBattleData(onChainBattleId: string): Promise<any | null> {
    if (!this.program) return null;

    try {
      const battlePDA = new PublicKey(onChainBattleId);
      return await (this.program.account as any).battle.fetch(battlePDA);
    } catch (error) {
      console.error('[Settlement] Failed to fetch battle data:', error);
      return null;
    }
  }

  /**
   * Convert signed trade to TradeInput format for the contract
   */
  private signedTradeToInput(trade: SignedTrade): any {
    // Parse the signed message to get trade details
    const message = JSON.parse(trade.signedMessage);

    return {
      asset: ASSET_INDEX[trade.asset] ?? 0,
      isLong: trade.side === 'long',
      isOpen: trade.type === 'open',
      leverage: trade.leverage,
      size: new BN(Math.round(trade.size * 100)), // Convert to cents
      entryPrice: new BN(Math.round(trade.entryPrice * 1_000_000)), // 6 decimal precision
      exitPrice: trade.exitPrice ? new BN(Math.round(trade.exitPrice * 1_000_000)) : new BN(0),
      timestamp: new BN(message.timestamp),
      nonce: message.nonce,
      signature: Array.from(bs58.decode(trade.signature)),
    };
  }

  /**
   * Submit signed trades for a player to the on-chain trade log
   * @param onChainBattleId The on-chain battle ID (number)
   * @param playerWallet The player's wallet address
   * @param trades The signed trades to submit
   * @returns Transaction signature or null if failed
   */
  async submitTrades(
    onChainBattleId: number,
    playerWallet: string,
    trades: SignedTrade[]
  ): Promise<string | null> {
    if (!this.isReady()) {
      console.warn('[Settlement] Service not initialized - cannot submit trades');
      return null;
    }

    if (trades.length === 0) {
      console.log('[Settlement] No trades to submit');
      return null;
    }

    try {
      const battleIdBN = new BN(onChainBattleId);
      const battlePDA = this.getBattlePDA(battleIdBN);
      const playerPubkey = new PublicKey(playerWallet);
      const tradeLogPDA = this.getTradeLogPDA(battleIdBN, playerPubkey);

      // Convert trades to contract input format
      const tradeInputs = trades.map(t => this.signedTradeToInput(t));

      console.log(`[Settlement] Submitting ${trades.length} trades for player ${playerWallet}`);

      const tx = await (this.program!.methods as any)
        .submitTrades(tradeInputs)
        .accounts({
          battle: battlePDA,
          tradeLog: tradeLogPDA,
          player: playerPubkey,
          authority: this.authority!.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.authority!])
        .rpc();

      console.log(`[Settlement] Trades submitted! Tx: ${tx}`);
      return tx;
    } catch (error: any) {
      console.error('[Settlement] Failed to submit trades:', error.message);
      if (error.logs) {
        console.error('[Settlement] Logs:', error.logs.slice(-5).join('\n'));
      }
      return null;
    }
  }

  /**
   * Settle a battle using verified trades (trustless settlement)
   * This calculates P&L on-chain and determines the winner
   * @param battle The battle object with signed trades
   * @returns Transaction signature or null if failed
   */
  async settleBattleVerified(battle: Battle): Promise<string | null> {
    if (!this.isReady()) {
      console.warn('[Settlement] Service not initialized - cannot settle verified');
      return null;
    }

    if (!battle.onChainBattleId) {
      console.warn('[Settlement] Battle has no on-chain ID');
      return null;
    }

    const signedTrades = battle.signedTrades || [];
    if (signedTrades.length === 0) {
      console.warn('[Settlement] No signed trades for battle - falling back to legacy settlement');
      return null;
    }

    try {
      // Parse the on-chain battle ID (it's stored as a pubkey string)
      const onChainBattleData = await this.getBattleData(battle.onChainBattleId);
      if (!onChainBattleData) {
        console.error('[Settlement] Could not fetch on-chain battle data');
        return null;
      }

      const battleIdBN = onChainBattleData.id as BN;
      const configPDA = this.getConfigPDA();
      const battlePDA = new PublicKey(battle.onChainBattleId);

      // Get player wallet addresses
      const creatorWallet = battle.players[0]?.walletAddress;
      const opponentWallet = battle.players[1]?.walletAddress;

      if (!creatorWallet) {
        console.error('[Settlement] No creator wallet found');
        return null;
      }

      // Filter trades by player
      const creatorTrades = signedTrades.filter(t => t.walletAddress === creatorWallet);
      const opponentTrades = opponentWallet
        ? signedTrades.filter(t => t.walletAddress === opponentWallet)
        : [];

      console.log(`[Settlement] Verified settlement for battle ${battle.id}`);
      console.log(`  Creator trades: ${creatorTrades.length}`);
      console.log(`  Opponent trades: ${opponentTrades.length}`);

      // Submit creator trades if any
      if (creatorTrades.length > 0) {
        const submitTx = await this.submitTrades(battleIdBN.toNumber(), creatorWallet, creatorTrades);
        if (!submitTx) {
          console.warn('[Settlement] Failed to submit creator trades');
        }
      }

      // Submit opponent trades if any
      if (opponentTrades.length > 0 && opponentWallet) {
        const submitTx = await this.submitTrades(battleIdBN.toNumber(), opponentWallet, opponentTrades);
        if (!submitTx) {
          console.warn('[Settlement] Failed to submit opponent trades');
        }
      }

      // Get trade log PDAs
      const creatorPubkey = new PublicKey(creatorWallet);
      const creatorTradeLogPDA = this.getTradeLogPDA(battleIdBN, creatorPubkey);

      // For solo battles, use creator's trade log for both
      const opponentPubkey = opponentWallet ? new PublicKey(opponentWallet) : creatorPubkey;
      const opponentTradeLogPDA = this.getTradeLogPDA(battleIdBN, opponentPubkey);

      console.log('[Settlement] Calling settle_battle_verified...');

      const tx = await (this.program!.methods as any)
        .settleBattleVerified()
        .accounts({
          config: configPDA,
          battle: battlePDA,
          creatorTradeLog: creatorTradeLogPDA,
          opponentTradeLog: opponentTradeLogPDA,
          authority: this.authority!.publicKey,
        })
        .signers([this.authority!])
        .rpc();

      console.log(`[Settlement] Battle settled (verified)! Tx: ${tx}`);
      return tx;
    } catch (error: any) {
      console.error('[Settlement] Failed to settle battle verified:', error.message);
      if (error.logs) {
        console.error('[Settlement] Logs:', error.logs.slice(-5).join('\n'));
      }
      await alertService.sendCriticalAlert(
        'Settlement Failed',
        `Verified battle settlement failed: ${battle.id}`,
        'SETTLEMENT_FAILED',
        {
          battleId: battle.id,
          phase: 'verified_settlement',
          tradesCount: battle.signedTrades?.length || 0,
          errorMessage: error.message?.substring(0, 200)
        }
      );
      return null;
    }
  }
}

// Singleton instance
export const battleSettlementService = new BattleSettlementService();
