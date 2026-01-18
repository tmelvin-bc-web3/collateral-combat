'use client';

import { useMemo, ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ClientOnly } from './ClientOnly';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

function WalletProviderInner({ children }: Props) {
  // Use Carbium RPC for better reliability
  const endpoint = useMemo(() =>
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://rpc-service.carbium.io/?apiKey=9c6c818b-067b',
  []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export function WalletProvider({ children }: Props) {
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
      <WalletProviderInner>{children}</WalletProviderInner>
    </ClientOnly>
  );
}
