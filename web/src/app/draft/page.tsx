'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DraftProvider, useDraftContext } from '@/contexts/DraftContext';
import { DraftTournamentTier, DraftTournament } from '@/types';
import Link from 'next/link';

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
  const entryFee = parseInt(tier.replace('$', ''));
  const prizePool = tournament?.prizePoolUsd || 0;
  const entries = tournament?.totalEntries || 0;

  const tierColors: Record<DraftTournamentTier, string> = {
    '$5': 'accent',
    '$25': 'success',
    '$100': 'warning',
  };

  const color = tierColors[tier];

  return (
    <button
      onClick={onSelect}
      className={`relative card border-2 border-transparent hover:border-${color}/30 transition-all duration-300 hover:shadow-lg hover:shadow-${color}/10 text-left w-full`}
    >
      {hasEntry && (
        <div className="absolute top-4 right-4">
          <div className="px-2 py-1 rounded-full bg-success/20 border border-success/30 text-success text-xs font-bold">
            Entered
          </div>
        </div>
      )}

      <div className={`w-14 h-14 rounded-xl bg-${color}/10 flex items-center justify-center text-${color} mb-4`}>
        <span className="text-2xl font-black">{tier}</span>
      </div>

      <h3 className="text-xl font-bold mb-2">{tier} Tournament</h3>
      <p className="text-sm text-text-secondary mb-4">
        Draft 6 memecoins and compete for the week. Top 10% win prizes!
      </p>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-primary">
        <div>
          <div className="text-xs text-text-tertiary">Prize Pool</div>
          <div className="font-bold text-lg">${prizePool.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs text-text-tertiary">Entries</div>
          <div className="font-bold text-lg">{entries}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary">
        <div className="text-xs text-text-tertiary mb-1">Entry Fee</div>
        <div className={`text-2xl font-black text-${color}`}>${entryFee}</div>
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
  const anyTournament = tournaments['$5'] || tournaments['$25'] || tournaments['$100'];

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          Weekly Tournament
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Memecoin Draft
        </h1>

        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-6">
          Build your team of 6 memecoins. Best performance over the week wins.
          Use power-ups to swap, boost, or freeze your picks!
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
        {(['$5', '$25', '$100'] as DraftTournamentTier[]).map((tier) => {
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
      <div className="card mb-12">
        <h2 className="text-xl font-bold mb-6 text-center">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-semibold mb-1">Enter Tournament</h3>
            <p className="text-sm text-text-secondary">Choose your entry tier and pay the fee</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-semibold mb-1">Draft Your Team</h3>
            <p className="text-sm text-text-secondary">Pick 6 memecoins from random options</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-semibold mb-1">Use Power-ups</h3>
            <p className="text-sm text-text-secondary">Swap, boost, or freeze your picks</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xl font-bold mx-auto mb-3">
              4
            </div>
            <h3 className="font-semibold mb-1">Win Prizes</h3>
            <p className="text-sm text-text-secondary">Top 10% split the prize pool</p>
          </div>
        </div>
      </div>

      {/* Power-ups Explanation */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6 text-center">Power-ups</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-bg-tertiary">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="font-bold">Swap</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Replace one underperforming coin with a new pick from 3 random options. Use once per tournament.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-bg-tertiary">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="font-bold">2x Boost</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Double the score contribution of one coin. Lock in your best performer!
            </p>
          </div>
          <div className="p-4 rounded-xl bg-bg-tertiary">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h3 className="font-bold">Freeze</h3>
            </div>
            <p className="text-sm text-text-secondary">
              Lock in current gains. The coin can't go negative from that point forward.
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

  const entryFee = parseInt(tier.replace('$', ''));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-secondary border border-border-primary rounded-2xl p-6 max-w-md w-full animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4">Enter {tier} Tournament</h2>

        {!walletAddress ? (
          <div className="text-center py-6">
            <p className="text-text-secondary mb-4">Connect your wallet to enter</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-text-secondary">Entry Fee</span>
                <span className="font-bold">${entryFee}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-text-secondary">Prize Pool</span>
                <span className="font-bold">${tournament?.prizePoolUsd || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-bg-tertiary">
                <span className="text-text-secondary">Current Entries</span>
                <span className="font-bold">{tournament?.totalEntries || 0}</span>
              </div>
            </div>

            <p className="text-sm text-text-tertiary mb-6">
              After entering, you'll draft 6 memecoins. Your score is the total % change
              of your picks over the week. Top 10% win!
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/20 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleEnter}
              disabled={entering || isLoading}
              className="w-full py-3 px-6 rounded-xl bg-accent text-bg-primary font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {entering ? 'Entering...' : `Pay $${entryFee} & Enter`}
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <DraftLobbyWithWallet />;
}
