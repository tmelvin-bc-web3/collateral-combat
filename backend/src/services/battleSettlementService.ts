import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import bs58 from 'bs58';
import * as idl from '../idl/battle_program.json';

const BATTLE_PROGRAM_ID = new PublicKey('GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9');

// PDA Seeds
const CONFIG_SEED = Buffer.from('config');
const BATTLE_SEED = Buffer.from('battle');

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
}

// Singleton instance
export const battleSettlementService = new BattleSettlementService();
