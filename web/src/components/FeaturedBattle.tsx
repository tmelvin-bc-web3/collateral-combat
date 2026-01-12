'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';
import { LiveBattle } from '@/types';
import { UserAvatar } from './UserAvatar';
import { Card } from './ui/Card';

export function FeaturedBattle() {
  const [featuredBattle, setFeaturedBattle] = useState<LiveBattle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    const socket = getSocket();

    // Fetch initial data via REST API
    const fetchFeaturedBattle = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/battles/live`);
        if (res.ok) {
          const battles = await res.json();
          const featured = battles.find((b: LiveBattle) => b.featured) || battles[0] || null;
          setFeaturedBattle(featured);
        }
      } catch {
        // Failed to fetch featured battle
      }
    };

    fetchFeaturedBattle();

    socket.emit('subscribe_live_battles');

    socket.on('live_battles', (battles) => {
      const featured = battles.find((b: LiveBattle) => b.featured) || battles[0] || null;
      setFeaturedBattle(featured);
    });

    socket.on('spectator_battle_update', (battle) => {
      if (featuredBattle?.id === battle.id) {
        setFeaturedBattle(battle);
      }
    });

    // Refresh every 5 seconds
    const interval = setInterval(fetchFeaturedBattle, 5000);

    return () => {
      clearInterval(interval);
      socket.emit('unsubscribe_live_battles');
      socket.off('live_battles');
      socket.off('spectator_battle_update');
    };
  }, [featuredBattle?.id]);

  useEffect(() => {
    if (!featuredBattle?.startedAt) return;

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - featuredBattle.startedAt!) / 1000);
      const remaining = Math.max(0, featuredBattle.config.duration - elapsed);
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [featuredBattle?.startedAt, featuredBattle?.config.duration]);

  if (!featuredBattle) {
    return (
      <Card className="border border-border-primary mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-text-tertiary" />
            <span className="text-sm font-medium text-text-secondary">Live Battle</span>
          </div>
        </div>

        <div className="py-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-bg-tertiary flex items-center justify-center">
            <svg className="w-7 h-7 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-1 text-text-secondary">No Live Battles</h3>
          <p className="text-sm text-text-tertiary mb-4">Be the first to start a battle and others can watch!</p>
        </div>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const player1 = featuredBattle.players[0];
  const player2 = featuredBattle.players[1];

  const player1Pnl = player1?.account.totalPnlPercent || 0;
  const player2Pnl = player2?.account.totalPnlPercent || 0;

  const formatWallet = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Determine who's winning
  const p1Winning = player1Pnl > player2Pnl;
  const p2Winning = player2Pnl > player1Pnl;

  return (
    <Card className="border border-accent/20 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">Live Battle</span>
          <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent">Featured</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono">{formatTime(timeRemaining)}</span>
          <span className="text-text-tertiary">{featuredBattle.spectatorCount || 0} watching</span>
        </div>
      </div>

      {/* Battle Display */}
      <div className="grid grid-cols-7 gap-4 items-center">
        {/* Player 1 */}
        <div className={`col-span-3 p-4 rounded-lg ${p1Winning ? 'bg-success/5 border border-success/20' : 'bg-bg-tertiary'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {player1 && <UserAvatar walletAddress={player1.walletAddress} size="sm" />}
              <span className="font-mono text-sm">{player1 ? formatWallet(player1.walletAddress) : '---'}</span>
            </div>
            {p1Winning && <span className="text-xs text-success">Leading</span>}
          </div>
          <div className={`text-2xl font-bold ${player1Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {player1Pnl >= 0 ? '+' : ''}{player1Pnl.toFixed(2)}%
          </div>
          {player1?.account.positions.length ? (
            <div className="mt-2 text-xs text-text-tertiary">
              {player1.account.positions.length} open position{player1.account.positions.length > 1 ? 's' : ''}
            </div>
          ) : null}
        </div>

        {/* VS */}
        <div className="col-span-1 text-center">
          <div className="text-text-tertiary font-medium text-lg">VS</div>
          <div className="text-xs text-text-tertiary mt-1">{featuredBattle.prizePool.toFixed(2)} SOL</div>
        </div>

        {/* Player 2 */}
        <div className={`col-span-3 p-4 rounded-lg ${p2Winning ? 'bg-success/5 border border-success/20' : 'bg-bg-tertiary'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {player2 && <UserAvatar walletAddress={player2.walletAddress} size="sm" />}
              <span className="font-mono text-sm">{player2 ? formatWallet(player2.walletAddress) : '---'}</span>
            </div>
            {p2Winning && <span className="text-xs text-success">Leading</span>}
          </div>
          <div className={`text-2xl font-bold ${player2Pnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {player2Pnl >= 0 ? '+' : ''}{player2Pnl.toFixed(2)}%
          </div>
          {player2?.account.positions.length ? (
            <div className="mt-2 text-xs text-text-tertiary">
              {player2.account.positions.length} open position{player2.account.positions.length > 1 ? 's' : ''}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-primary">
        <div className="text-sm text-text-secondary">
          Watch live and place wagers on the winner
        </div>
        <Link href={`/spectate`} className="btn btn-primary">
          Watch & Wager
        </Link>
      </div>
    </Card>
  );
}
