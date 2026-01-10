'use client';

import { useMemo, ReactNode, useState, useCallback, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ClientOnly } from './ClientOnly';

import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Check if we're on localhost
const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
  return rpc.includes('127.0.0.1') || rpc.includes('localhost');
};

// Local wallet context for testing
interface LocalWalletContextType {
  keypair: Keypair | null;
  publicKey: string | null;
  balance: number;
  refreshBalance: () => Promise<void>;
  airdrop: (amount: number) => Promise<void>;
  isLocal: boolean;
}

import { createContext, useContext } from 'react';

const LocalWalletContext = createContext<LocalWalletContextType>({
  keypair: null,
  publicKey: null,
  balance: 0,
  refreshBalance: async () => {},
  airdrop: async () => {},
  isLocal: false,
});

export const useLocalWallet = () => useContext(LocalWalletContext);

function LocalWalletProviderInner({ children }: Props) {
  const endpoint = useMemo(() => {
    const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (customRpc) {
      return customRpc;
    }
    return clusterApiUrl('devnet');
  }, []);

  const isLocal = isLocalhost();

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Generate or restore local test keypair
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!isLocal) return;

    // Try to restore from localStorage
    const stored = localStorage.getItem('local_test_keypair');
    if (stored) {
      try {
        const secretKey = new Uint8Array(JSON.parse(stored));
        setKeypair(Keypair.fromSecretKey(secretKey));
      } catch {
        // Generate new keypair
        const newKeypair = Keypair.generate();
        localStorage.setItem('local_test_keypair', JSON.stringify(Array.from(newKeypair.secretKey)));
        setKeypair(newKeypair);
      }
    } else {
      // Generate new keypair
      const newKeypair = Keypair.generate();
      localStorage.setItem('local_test_keypair', JSON.stringify(Array.from(newKeypair.secretKey)));
      setKeypair(newKeypair);
    }
  }, [isLocal]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={!isLocal}>
        <WalletModalProvider>
          {isLocal && keypair ? (
            <LocalWalletContextProvider keypair={keypair} balance={balance} setBalance={setBalance}>
              {children}
            </LocalWalletContextProvider>
          ) : (
            children
          )}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

function LocalWalletContextProvider({
  children,
  keypair,
  balance,
  setBalance
}: {
  children: ReactNode;
  keypair: Keypair;
  balance: number;
  setBalance: (b: number) => void;
}) {
  const { connection } = useConnection();

  const refreshBalance = useCallback(async () => {
    if (!keypair) return;
    try {
      const bal = await connection.getBalance(keypair.publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [connection, keypair, setBalance]);

  const airdrop = useCallback(async (amount: number) => {
    if (!keypair) return;
    try {
      const signature = await connection.requestAirdrop(
        keypair.publicKey,
        amount * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      await refreshBalance();
    } catch (err) {
      console.error('Airdrop failed:', err);
      throw err;
    }
  }, [connection, keypair, refreshBalance]);

  // Fetch balance on mount
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const value: LocalWalletContextType = {
    keypair,
    publicKey: keypair?.publicKey.toBase58() || null,
    balance,
    refreshBalance,
    airdrop,
    isLocal: true,
  };

  return (
    <LocalWalletContext.Provider value={value}>
      {children}
    </LocalWalletContext.Provider>
  );
}

export function LocalWalletProvider({ children }: Props) {
  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen bg-bg-primary">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      }
    >
      <LocalWalletProviderInner>{children}</LocalWalletProviderInner>
    </ClientOnly>
  );
}
