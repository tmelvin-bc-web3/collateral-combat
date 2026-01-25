'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { LiveBattle } from '@/types';
import { BattleFeed } from './BattleFeed';
import { BACKEND_URL } from '@/config/api';
import { QuickBetStrip } from '@/components/spectate/QuickBetStrip';
import { PostConnectFeedback } from '@/components/onboarding';

interface WatchViewerProps {
  onSelectBattle?: (battle: LiveBattle) => void;
}

/**
 * WatchViewer - Full-screen portrait-only battle viewer wrapper
 * Mobile-optimized watch experience (MOB-01, MOB-04, MOB-05, MOB-06)
 *
 * Features:
 * - Fetches live battles from socket
 * - Manages battle list state
 * - Handles refresh logic
 * - Provides walletAddress from useWallet
 * - Renders BattleFeed with data
 * - Includes QuickBetStrip overlay
 */
export function WatchViewer({ onSelectBattle }: WatchViewerProps) {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const [liveBattles, setLiveBattles] = useState<LiveBattle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBattle, setActiveBattle] = useState<LiveBattle | null>(null);

  // Track "just connected" state for PostConnectFeedback (ONB-08)
  const [showPostConnect, setShowPostConnect] = useState(false);
  const wasConnectedRef = useRef(connected);

  // Detect wallet connection transition (false -> true)
  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      // Just connected - show feedback
      setShowPostConnect(true);
    }
    wasConnectedRef.current = connected;
  }, [connected]);

  // Fetch live battles and subscribe to updates
  useEffect(() => {
    const socket = getSocket();

    const fetchLiveBattles = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/battles/live`);
        if (res.ok) {
          const battles = await res.json();
          setLiveBattles(battles);
          // Set first battle as active if none selected
          if (battles.length > 0 && !activeBattle) {
            setActiveBattle(battles[0]);
          }
        }
      } catch {
        // Silently fail - socket will provide data
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveBattles();
    socket.emit('subscribe_live_battles');

    socket.on('live_battles', (battles: LiveBattle[]) => {
      setLiveBattles(battles);
      setIsLoading(false);
      // Update active battle if it exists in new list
      if (activeBattle) {
        const updated = battles.find((b) => b.id === activeBattle.id);
        if (updated) {
          setActiveBattle(updated);
        }
      } else if (battles.length > 0) {
        setActiveBattle(battles[0]);
      }
    });

    socket.on('spectator_battle_update', (battle: LiveBattle) => {
      setLiveBattles((prev) =>
        prev.map((b) => (b.id === battle.id ? battle : b))
      );
      if (activeBattle?.id === battle.id) {
        setActiveBattle(battle);
      }
    });

    return () => {
      socket.emit('unsubscribe_live_battles');
      socket.off('live_battles');
      socket.off('spectator_battle_update');
    };
  }, [activeBattle]);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/battles/live`);
      if (res.ok) {
        const battles = await res.json();
        setLiveBattles(battles);
        if (battles.length > 0 && !activeBattle) {
          setActiveBattle(battles[0]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeBattle]);

  const handleBetPlaced = useCallback(() => {
    // Could trigger analytics or other side effects
  }, []);

  // Loading state
  if (isLoading && liveBattles.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-white/50">Loading battles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-bg-primary">
      {/* BattleFeed includes FloatingConnectPill (ONB-02) */}
      <BattleFeed
        battles={liveBattles}
        onRefresh={handleRefresh}
        walletAddress={walletAddress}
        onBetPlaced={handleBetPlaced}
      />

      {/* Post-connect feedback toast (ONB-08, z-50 above everything) */}
      <PostConnectFeedback
        show={showPostConnect}
        onDismiss={() => setShowPostConnect(false)}
      />

      {/* QuickBetStrip overlay at bottom (z-40) */}
      {activeBattle && (
        <div className="absolute bottom-0 left-0 right-0 z-40">
          <QuickBetStrip
            battle={activeBattle}
            odds={activeBattle.odds || null}
            walletAddress={walletAddress}
          />
        </div>
      )}
    </div>
  );
}
