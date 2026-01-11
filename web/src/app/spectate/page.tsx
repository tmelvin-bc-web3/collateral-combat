'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { LiveBattle, SpectatorBet } from '@/types';
import { LiveBattleCard } from '@/components/LiveBattleCard';
import { SpectatorView } from '@/components/SpectatorView';
import { SkeletonBattleCard, PageLoading } from '@/components/ui/skeleton';

type Tab = 'live' | 'my-wagers';

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
      } catch {
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
    return <PageLoading message="Entering the stands..." />;
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
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-danger/10 border border-danger/30 text-danger text-sm font-bold uppercase tracking-wider mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
          </span>
          {liveBattles.length} Live Battles
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
          THE <span className="text-danger">STANDS</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6">
          Witness the carnage from above. Watch degens battle for glory and back your champion to claim a share of the spoils.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 justify-center">
        <button
          onClick={() => setActiveTab('live')}
          className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'live'
              ? 'bg-danger text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          Live Now
        </button>
        <button
          onClick={() => setActiveTab('my-wagers')}
          className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'my-wagers'
              ? 'bg-danger text-white'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border-primary'
          }`}
        >
          My Wagers
        </button>
      </div>

      {activeTab === 'live' && (
        <>
          {isLoading ? (
            <div className="space-y-6">
              <div className="text-xs font-bold text-danger uppercase tracking-wider mb-3">Featured Combat</div>
              <SkeletonBattleCard className="mb-8" />
              <div className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">All Battles</div>
              <div className="grid md:grid-cols-2 gap-4">
                <SkeletonBattleCard />
                <SkeletonBattleCard />
              </div>
            </div>
          ) : liveBattles.length === 0 ? (
            <div className="card text-center py-12 border border-danger/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-danger/10 flex items-center justify-center border border-danger/30">
                <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2 uppercase">The Arena is Empty</h3>
              <p className="text-text-secondary text-sm">No warriors are fighting right now. Check back soon or enter the cage yourself.</p>
            </div>
          ) : (
            <>
              {/* Featured Battle */}
              {featuredBattle && (
                <div className="mb-8">
                  <div className="text-xs font-bold text-danger uppercase tracking-wider mb-3">Featured Combat</div>
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
                  <div className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-3">All Battles</div>
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

      {activeTab === 'my-wagers' && (
        <div className="card border border-danger/20">
          {!publicKey ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-danger/10 flex items-center justify-center border border-danger/30">
                <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2 uppercase">Identity Required</h3>
              <p className="text-text-secondary text-sm">Connect your wallet to view your wager history</p>
            </div>
          ) : myBets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-bg-tertiary flex items-center justify-center border border-border-primary">
                <svg className="w-8 h-8 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold mb-2 uppercase">No Wagers Yet</h3>
              <p className="text-text-secondary text-sm">You haven&apos;t backed any warriors yet. Watch a battle and place your first wager!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBets.map((bet) => (
                <div key={bet.id} className="p-4 rounded-lg bg-bg-tertiary border border-border-primary">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium uppercase tracking-wider">Backed: </span>
                      <span className="text-sm font-mono">{bet.backedPlayer.slice(0, 4)}...{bet.backedPlayer.slice(-4)}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                      bet.status === 'won' ? 'bg-success/20 text-success border border-success/30' :
                      bet.status === 'lost' ? 'bg-danger/20 text-danger border border-danger/30' :
                      'bg-warning/20 text-warning border border-warning/30'
                    }`}>
                      {bet.status === 'won' ? 'Victory' : bet.status === 'lost' ? 'Defeat' : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">{bet.amount} SOL @ {bet.odds.toFixed(2)}x</span>
                    <span className={bet.status === 'won' ? 'text-success font-bold' : 'text-text-secondary'}>
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
