'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { LiveBattle, SpectatorBet } from '@/types';
import { LiveBattleCard } from '@/components/LiveBattleCard';
import { SpectatorView } from '@/components/SpectatorView';

type Tab = 'live' | 'my-bets';

export default function SpectatePage() {
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [liveBattles, setLiveBattles] = useState<LiveBattle[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<LiveBattle | null>(null);
  const [myBets, setMyBets] = useState<SpectatorBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const socket = getSocket();

    // Fetch initial data via REST API as fallback
    const fetchLiveBattles = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/battles/live`);
        if (res.ok) {
          const battles = await res.json();
          setLiveBattles(battles);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch live battles:', err);
        setIsLoading(false);
      }
    };

    fetchLiveBattles();

    // Also subscribe via WebSocket for real-time updates
    socket.emit('subscribe_live_battles');

    socket.on('live_battles', (battles) => {
      setLiveBattles(battles);
      setIsLoading(false);
    });

    socket.on('spectator_battle_update', (battle) => {
      setLiveBattles(prev =>
        prev.map(b => b.id === battle.id ? battle : b)
      );
      if (selectedBattle?.id === battle.id) {
        setSelectedBattle(battle);
      }
    });

    // Refresh every 5 seconds as backup
    const interval = setInterval(fetchLiveBattles, 5000);

    return () => {
      clearInterval(interval);
      socket.emit('unsubscribe_live_battles');
      socket.off('live_battles');
      socket.off('spectator_battle_update');
    };
  }, [selectedBattle?.id]);

  const handleSelectBattle = (battle: LiveBattle) => {
    setSelectedBattle(battle);
    const socket = getSocket();
    socket.emit('spectate_battle', battle.id);
  };

  const handleBackToList = () => {
    if (selectedBattle) {
      const socket = getSocket();
      socket.emit('leave_spectate', selectedBattle.id);
    }
    setSelectedBattle(null);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 spinner" />
      </div>
    );
  }

  if (selectedBattle) {
    return (
      <SpectatorView
        battle={selectedBattle}
        onBack={handleBackToList}
        walletAddress={publicKey?.toBase58()}
      />
    );
  }

  const featuredBattle = liveBattles.find(b => b.featured) || liveBattles[0];
  const otherBattles = liveBattles.filter(b => b.id !== featuredBattle?.id);

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="mb-8 mt-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Live Battles</h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 border border-danger/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
            </span>
            <span className="text-xs font-bold text-danger uppercase tracking-wider">{liveBattles.length} Live</span>
          </div>
        </div>
        <p className="text-text-secondary">Watch traders compete head-to-head and bet on the winner</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'live'
              ? 'bg-accent text-bg-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Live Now
        </button>
        <button
          onClick={() => setActiveTab('my-bets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'my-bets'
              ? 'bg-accent text-bg-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Bets
        </button>
      </div>

      {activeTab === 'live' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 spinner" />
            </div>
          ) : liveBattles.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-bg-tertiary flex items-center justify-center">
                <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">No Live Battles</h3>
              <p className="text-text-secondary text-sm">Check back soon or start your own battle</p>
            </div>
          ) : (
            <>
              {/* Featured Battle */}
              {featuredBattle && (
                <div className="mb-6">
                  <div className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">Featured Battle</div>
                  <LiveBattleCard
                    battle={featuredBattle}
                    featured
                    onWatch={() => handleSelectBattle(featuredBattle)}
                  />
                </div>
              )}

              {/* Other Battles */}
              {otherBattles.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-text-tertiary uppercase tracking-wide mb-3">All Battles</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {otherBattles.map((battle) => (
                      <LiveBattleCard
                        key={battle.id}
                        battle={battle}
                        onWatch={() => handleSelectBattle(battle)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'my-bets' && (
        <div className="card">
          {!publicKey ? (
            <div className="text-center py-8">
              <p className="text-text-secondary text-sm">Connect wallet to see your bets</p>
            </div>
          ) : myBets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary text-sm">No bets placed yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBets.map((bet) => (
                <div key={bet.id} className="p-4 rounded-lg bg-bg-tertiary">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium">Backed: </span>
                      <span className="text-sm font-mono">{bet.backedPlayer.slice(0, 4)}...{bet.backedPlayer.slice(-4)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      bet.status === 'won' ? 'bg-success-muted text-success' :
                      bet.status === 'lost' ? 'bg-danger-muted text-danger' :
                      'bg-bg-hover text-text-secondary'
                    }`}>
                      {bet.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{bet.amount} SOL @ {bet.odds.toFixed(2)}x</span>
                    <span className={bet.status === 'won' ? 'text-success' : 'text-text-secondary'}>
                      {bet.status === 'won' ? `+${bet.potentialPayout.toFixed(2)}` : bet.potentialPayout.toFixed(2)} SOL
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
