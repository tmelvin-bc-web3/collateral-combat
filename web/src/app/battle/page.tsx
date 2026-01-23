'use client';

import { useState, useEffect, Suspense } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSearchParams } from 'next/navigation';
import { BattleProvider, useBattleContext } from '@/contexts/BattleContext';
import { BattleLobby } from '@/components/BattleLobby';
import { BattleArena } from '@/components/BattleArena';
import { PageLoading } from '@/components/ui/skeleton';
import { PageErrorBoundary } from '@/components/error-boundaries/PageErrorBoundary';
import { NextMatchBanner, UpcomingMatches } from '@/components/UpcomingMatches';
import { useChallenges } from '@/hooks/useChallenges';

function BattleContent() {
  const { battle } = useBattleContext();
  const { connected, publicKey } = useWallet();
  const searchParams = useSearchParams();
  const challengeCode = searchParams.get('challenge');
  const wallet = publicKey?.toBase58();

  const { acceptChallenge } = useChallenges();
  const [acceptingChallenge, setAcceptingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  // Handle challenge code from URL query param
  useEffect(() => {
    if (challengeCode && wallet && connected && !acceptingChallenge && !battle) {
      setAcceptingChallenge(true);
      setChallengeError(null);

      console.log(`[BattlePage] Accepting challenge with code: ${challengeCode}`);

      acceptChallenge(challengeCode, wallet)
        .then((result) => {
          console.log(`[BattlePage] Challenge accepted, battle ID: ${result.battleId}`);
          // The battle context will pick up the new battle via WebSocket
          // Clear the URL param to prevent re-acceptance on refresh
          window.history.replaceState({}, '', '/battle');
        })
        .catch((err) => {
          console.error('[BattlePage] Failed to accept challenge:', err);
          setChallengeError(err.message || 'Failed to accept challenge');
        })
        .finally(() => {
          setAcceptingChallenge(false);
        });
    }
  }, [challengeCode, wallet, connected, acceptChallenge, acceptingChallenge, battle]);

  console.log('[BattlePage] Rendering, battle:', battle?.id, 'status:', battle?.status);

  // Show loading state while accepting challenge
  if (acceptingChallenge) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-warning mb-4" />
        <p className="text-white/60">Accepting challenge...</p>
      </div>
    );
  }

  // Show error if challenge acceptance failed
  if (challengeError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-danger/20 border border-danger/40 rounded-xl p-6 max-w-md text-center">
          <p className="text-danger font-bold mb-2">Challenge Error</p>
          <p className="text-white/60 mb-4">{challengeError}</p>
          <button
            onClick={() => {
              setChallengeError(null);
              window.history.replaceState({}, '', '/battle');
            }}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

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
      <Suspense fallback={<PageLoading message="Loading battle..." />}>
        <BattleContent />
      </Suspense>
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
