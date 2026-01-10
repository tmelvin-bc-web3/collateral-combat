import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletConnectionError,
} from '@solana/wallet-adapter-base';
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SendOptions,
  Connection,
  TransactionSignature,
} from '@solana/web3.js';

export const LocalKeypairWalletName = 'Local Test Wallet' as WalletName<'Local Test Wallet'>;

/**
 * A wallet adapter that uses a locally generated keypair
 * Only for local testing - the private key is stored in localStorage
 */
export class LocalKeypairWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = LocalKeypairWalletName;
  url = 'https://localhost';
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAzNCAzNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIHJ4PSI4IiBmaWxsPSIjRkZEOTAwIi8+PHBhdGggZD0iTTE3IDdMMjQgMjdIMTBMMTcgN1oiIGZpbGw9IiMwMDAiLz48L3N2Zz4=';
  supportedTransactionVersions = new Set(['legacy', 0] as const);

  private _keypair: Keypair | null = null;
  private _publicKey: PublicKey | null = null;
  private _connecting = false;
  private _connected = false;

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return this._connected;
  }

  get readyState(): WalletReadyState {
    // Only ready on localhost
    if (typeof window === 'undefined') return WalletReadyState.Unsupported;
    const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
    if (rpc.includes('127.0.0.1') || rpc.includes('localhost')) {
      return WalletReadyState.Installed;
    }
    return WalletReadyState.NotDetected;
  }

  async connect(): Promise<void> {
    if (this._connected || this._connecting) return;

    this._connecting = true;

    try {
      // Try to restore from localStorage
      const stored = localStorage.getItem('local_test_keypair');
      if (stored) {
        try {
          const secretKey = new Uint8Array(JSON.parse(stored));
          this._keypair = Keypair.fromSecretKey(secretKey);
        } catch {
          // Generate new keypair
          this._keypair = Keypair.generate();
          localStorage.setItem('local_test_keypair', JSON.stringify(Array.from(this._keypair.secretKey)));
        }
      } else {
        // Generate new keypair
        this._keypair = Keypair.generate();
        localStorage.setItem('local_test_keypair', JSON.stringify(Array.from(this._keypair.secretKey)));
      }

      this._publicKey = this._keypair.publicKey;
      this._connected = true;

      this.emit('connect', this._publicKey);
    } catch (error) {
      const walletError = new WalletConnectionError((error as Error).message);
      this.emit('error', walletError);
      throw walletError;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._keypair = null;
    this._publicKey = null;
    this._connected = false;
    this.emit('disconnect');
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._keypair) throw new Error('Wallet not connected');

    if (transaction instanceof Transaction) {
      transaction.partialSign(this._keypair);
    } else {
      // VersionedTransaction
      transaction.sign([this._keypair]);
    }

    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    if (!this._keypair) throw new Error('Wallet not connected');

    for (const transaction of transactions) {
      if (transaction instanceof Transaction) {
        transaction.partialSign(this._keypair);
      } else {
        transaction.sign([this._keypair]);
      }
    }

    return transactions;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._keypair) throw new Error('Wallet not connected');

    // Use tweetnacl for signing
    const { sign } = await import('tweetnacl');
    return sign.detached(message, this._keypair.secretKey);
  }

  // Helper to get the keypair for direct signing (useful for some operations)
  getKeypair(): Keypair | null {
    return this._keypair;
  }
}
