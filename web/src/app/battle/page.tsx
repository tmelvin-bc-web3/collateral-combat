'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BattleProvider, useBattleContext } from '@/contexts/BattleContext';
import { BattleLobby } from '@/components/BattleLobby';
import { BattleArena } from '@/components/BattleArena';
import { PageLoading } from '@/components/ui/skeleton';
import { PageErrorBoundary } from '@/components/error-boundaries/PageErrorBoundary';

function BattleContent() {
  const { battle } = useBattleContext();

  console.log('[BattlePage] Rendering, battle:', battle?.id, 'status:', battle?.status);

  // If in an active or completed battle, show the arena
  if (battle && (battle.status === 'active' || battle.status === 'completed')) {
    console.log('[BattlePage] Showing BattleArena');
    return <BattleArena battle={battle} />;
  }

  // Otherwise show the lobby
  console.log('[BattlePage] Showing BattleLobby');
  return <BattleLobby />;
}

function BattleWithWallet() {
  const { publicKey, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <BattleProvider walletAddress={walletAddress} signMessage={signMessage}>
      <BattleContent />
    </BattleProvider>
  );
}

export default function BattlePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageLoading message="Entering the Arena..." />;
  }

  return (
    <PageErrorBoundary pageName="Battle Arena">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <BattleWithWallet />
      </div>
    </PageErrorBoundary>
  );
}
