'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DraftProvider, useDraftContext } from '@/contexts/DraftContext';
import { DraftTournamentTier, DraftTournament } from '@/types';
import { PageLoading } from '@/components/ui/skeleton';
import Link from 'next/link';

const TIER_CONFIG: Record<DraftTournamentTier, {
  name: string;
  description: string;
  iconBg: string;
  iconText: string;
  priceText: string;
  hoverBorder: string;
  hoverShadow: string;
  solAmount: number;
}> = {
  '0.1 SOL': {
    name: 'Scavenger',
    description: 'Low stakes, high hopes. Perfect for fresh blood.',
    iconBg: 'bg-accent/10',
    iconText: 'text-accent',
    priceText: 'text-accent',
    hoverBorder: 'hover:border-accent/30',
    hoverShadow: 'hover:shadow-accent/10',
    solAmount: 0.1,
  },
  '0.5 SOL': {
    name: 'Raider',
    description: 'Prove your worth in the mid-tier wasteland.',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
    priceText: 'text-success',
    hoverBorder: 'hover:border-success/30',
    hoverShadow: 'hover:shadow-success/10',
    solAmount: 0.5,
  },
  '1 SOL': {
    name: 'Warlord',
    description: 'Only the ruthless survive at this level.',
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
    priceText: 'text-warning',
    hoverBorder: 'hover:border-warning/30',
    hoverShadow: 'hover:shadow-warning/10',
    solAmount: 1,
  },
};

function TierCard({
  tier,
  tournament,
  onSelect,
  hasEntry,
}: {
  tier: DraftTournamentTier;
  tournament: DraftTournament | null;
  onSelect: () => void;
  hasEntry: boolean;
}) {
  const config = TIER_CONFIG[tier];
  const prizePool = tournament?.prizePoolUsd || 0;
  const entries = tournament?.totalEntries || 0;

  return (
    <button
      onClick={onSelect}
      className={`relative card border-2 border-transparent ${config.hoverBorder} transition-all duration-300 hover:shadow-lg ${config.hoverShadow} text-left w-full h-full`}
    >
      {hasEntry && (
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded-full bg-success/20 border border-success/30 text-success text-xs font-bold uppercase tracking-wider">
            Enlisted
          </div>
        </div>
      )}

      <div className={`w-14 h-14 rounded-xl ${config.iconBg} flex items-center justify-center ${config.iconText} mb-4`}>
        <span className="text-lg font-black">{config.solAmount}</span>
      </div>

      <h3 className="text-xl font-bold mb-1 uppercase tracking-wide">{config.name}</h3>
      <p className="text-xs text-text-tertiary mb-2">{tier} Entry</p>
      <p className="text-sm text-text-secondary mb-4">
        {config.description}
      </p>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-primary">
        <div>
          <div className="text-xs text-text-tertiary uppercase tracking-wider">War Chest</div>
          <div className="font-bold text-lg">{prizePool.toFixed(1)} SOL</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary uppercase tracking-wider">Warriors</div>
          <div className="font-bold text-lg">{entries}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary">
        <div className="text-xs text-text-tertiary mb-1 uppercase tracking-wider">Blood Price</div>
        <div className={`text-2xl font-black ${config.priceText}`}>{tier}</div>
      </div>
    </button>
  );
}

function WeekCountdown({ weekEndUtc }: { weekEndUtc: number }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      const diff = weekEndUtc - now;

      if (diff <= 0) {
        setTimeLeft('Tournament ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [weekEndUtc]);

  return <span>{timeLeft}</span>;
}

function DraftLobbyContent() {
  const { publicKey } = useWallet();
  const {
    tournaments,
    myEntries,
    fetchTournaments,
    isLoading,
  } = useDraftContext();

  const [selectedTier, setSelectedTier] = useState<DraftTournamentTier | null>(null);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const walletAddress = publicKey?.toBase58();

  // Check if user has entry for each tier
  const hasEntryForTier = (tier: DraftTournamentTier) => {
    const tournament = tournaments[tier];
    if (!tournament) return false;
    return myEntries.some(e => e.tournamentId === tournament.id);
  };

  const getEntryForTier = (tier: DraftTournamentTier) => {
    const tournament = tournaments[tier];
    if (!tournament) return null;
    return myEntries.find(e => e.tournamentId === tournament.id) || null;
  };

  // Get any active tournament for countdown
  const anyTournament = tournaments['0.1 SOL'] || tournaments['0.5 SOL'] || tournaments['1 SOL'];

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 border border-warning/30 text-warning text-sm font-bold uppercase tracking-wider mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger"></span>
          </span>
          Weekly War
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 uppercase" style={{ fontFamily: 'Impact, sans-serif' }}>
          WAR <span className="text-warning">PARTY</span>
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6">
          Assemble your squad of 6 memecoins. Best gains over the week claims the throne.
          Use power-ups to dominate the wasteland!
        </p>

        {anyTournament && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-secondary border border-border-primary">
            <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-text-secondary">Ends in:</span>
            <span className="font-bold">
              <WeekCountdown weekEndUtc={anyTournament.weekEndUtc} />
            </span>
          </div>
        )}
      </div>

      {/* Tier Selection */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {(['0.1 SOL', '0.5 SOL', '1 SOL'] as DraftTournamentTier[]).map((tier) => {
          const tournament = tournaments[tier];
          const hasEntry = hasEntryForTier(tier);
          const entry = getEntryForTier(tier);

          return (
            <div key={tier}>
              {hasEntry && entry ? (
                <Link
                  href={`/draft/entry/${entry.id}`}
                  className="block"
                >
                  <TierCard
                    tier={tier}
                    tournament={tournament}
                    onSelect={() => {}}
                    hasEntry={true}
                  />
                </Link>
              ) : (
                <TierCard
                  tier={tier}
                  tournament={tournament}
                  onSelect={() => setSelectedTier(tier)}
                  hasEntry={false}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Entry Modal */}
      {selectedTier && (
        <EntryModal
          tier={selectedTier}
          tournament={tournaments[selectedTier]}
          walletAddress={walletAddress}
          onClose={() => setSelectedTier(null)}
        />
      )}

      {/* How It Works */}
      <div className="card mb-12 border border-warning/20">
        <h2 className="text-xl font-bold mb-6 text-center uppercase tracking-wider text-warning">Rules of War</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xl font-black mx-auto mb-3 border border-warning/30">
              1
            </div>
            <h3 className="font-bold mb-1 uppercase">Pay the Blood Price</h3>
            <p className="text-sm text-text-secondary">Choose your tier and pay the entry fee to join the war.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xl font-black mx-auto mb-3 border border-warning/30">
              2
            </div>
            <h3 className="font-bold mb-1 uppercase">Assemble Your Squad</h3>
            <p className="text-sm text-text-secondary">Draft 6 memecoins for your war party from random options.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xl font-black mx-auto mb-3 border border-warning/30">
              3
            </div>
            <h3 className="font-bold mb-1 uppercase">Deploy Power-ups</h3>
            <p className="text-sm text-text-secondary">Swap, boost, or freeze your picks strategically.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-warning/20 text-warning flex items-center justify-center text-xl font-black mx-auto mb-3 border border-warning/30">
              4
            </div>
            <h3 className="font-bold mb-1 uppercase">Claim the Spoils</h3>
            <p className="text-sm text-text-secondary">Top 10% of warriors split the war chest.</p>
          </div>
        </div>
      </div>

      {/* Power-ups Explanation */}
      <div className="card border border-accent/20">
        <h2 className="text-xl font-bold mb-6 text-center uppercase tracking-wider text-accent">Wasteland Weapons</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-bg-tertiary border border-warning/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center border border-warning/30">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="font-bold uppercase">Swap</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Exile a weak warrior and recruit a new one from 3 random options. One use per war.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-bg-tertiary border border-success/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center border border-success/30">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="font-bold uppercase">2x Rage</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Unleash fury on your champion. Double the score from your strongest warrior!
            </p>
          </div>
          <div className="p-4 rounded-xl bg-bg-tertiary border border-accent/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/30">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h3 className="font-bold uppercase">Freeze</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Lock in current gains. Protected from the wasteland&apos;s harsh winds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntryModal({
  tier,
  tournament,
  walletAddress,
  onClose,
}: {
  tier: DraftTournamentTier;
  tournament: DraftTournament | null;
  walletAddress: string | undefined;
  onClose: () => void;
}) {
  const { enterTournament, isLoading, error } = useDraftContext();
  const [entering, setEntering] = useState(false);

  const handleEnter = async () => {
    if (!tournament || !walletAddress) return;

    setEntering(true);
    try {
      const entry = await enterTournament(tournament.id);
      // Redirect to draft page
      window.location.href = `/draft/entry/${entry.id}`;
    } catch (err) {
      // Error handled by context
    } finally {
      setEntering(false);
    }
  };

  const config = TIER_CONFIG[tier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-warning/30 rounded-2xl p-6 max-w-md w-full animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">Join the {config.name} War</h2>
        <p className="text-sm text-text-tertiary mb-4">{tier} Entry Tier</p>

        {!walletAddress ? (
          <div className="text-center py-6">
            <p className="text-text-secondary mb-4">Connect your wallet to enter the war</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <span className="text-text-secondary text-sm uppercase tracking-wider">Blood Price</span>
                <span className="font-bold">{tier}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <span className="text-text-secondary text-sm uppercase tracking-wider">War Chest</span>
                <span className="font-bold">{(tournament?.prizePoolUsd || 0).toFixed(1)} SOL</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <span className="text-text-secondary text-sm uppercase tracking-wider">Warriors Enlisted</span>
                <span className="font-bold">{tournament?.totalEntries || 0}</span>
              </div>
            </div>

            <p className="text-sm text-text-tertiary mb-6">
              After enlisting, you&apos;ll draft 6 memecoins for your war party. Your score is the total % change
              of your picks over the week. Top 10% of warriors claim the spoils!
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/20 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleEnter}
              disabled={entering || isLoading}
              className="w-full py-3 px-6 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #ff6b00 0%, #ff4500 50%, #ff3131 100%)',
                boxShadow: '0 0 20px rgba(255, 107, 0, 0.3)',
              }}
            >
              {entering ? 'Enlisting...' : `Pay ${tier} & Enlist`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DraftLobbyWithWallet() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <DraftProvider walletAddress={walletAddress}>
      <DraftLobbyContent />
    </DraftProvider>
  );
}

export default function DraftPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <PageLoading message="Loading Draft Tournaments..." />;
  }

  return <DraftLobbyWithWallet />;
}
