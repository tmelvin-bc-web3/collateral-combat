'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BattleProvider, useBattleContext } from '@/contexts/BattleContext';
import { BattleLobby } from '@/components/BattleLobby';
import { BattleArena } from '@/components/BattleArena';
import { PageLoading } from '@/components/ui/skeleton';
import { PageErrorBoundary } from '@/components/error-boundaries/PageErrorBoundary';
import { NextMatchBanner, UpcomingMatches } from '@/components/UpcomingMatches';

function BattleContent() {
  const { battle } = useBattleContext();
  const { connected } = useWallet();

  console.log('[BattlePage] Rendering, battle:', battle?.id, 'status:', battle?.status);

  // If in an active or completed battle, show the arena
  if (battle && (battle.status === 'active' || battle.status === 'completed')) {
    console.log('[BattlePage] Showing BattleArena');
    return <BattleArena battle={battle} />;
  }

  // Otherwise show lobby with scheduled matches (when connected)
  console.log('[BattlePage] Showing BattleLobby');
  return (
    <div className="space-y-8">
      {/* Scheduled matches section - only show when wallet connected */}
      {connected && (
        <section id="scheduled">
          <h2 className="text-2xl font-bold mb-4 text-warning">Scheduled Battles</h2>
          <p className="text-gray-400 mb-4">
            Join a scheduled match for guaranteed opponents. Registration opens 30 minutes before each battle.
          </p>
          <UpcomingMatches limit={3} showHeader={false} />
        </section>
      )}

      {/* Divider - only when showing scheduled section */}
      {connected && (
        <div className="border-t border-white/10" />
      )}

      {/* Instant matchmaking section */}
      <section>
        {connected && (
          <>
            <h2 className="text-2xl font-bold mb-4">Quick Match</h2>
            <p className="text-gray-400 mb-4">
              Find an opponent now with instant matchmaking.
            </p>
          </>
        )}
        <BattleLobby />
      </section>
    </div>
  );
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
        <NextMatchBanner />
        <BattleWithWallet />
      </div>
    </PageErrorBoundary>
  );
}
