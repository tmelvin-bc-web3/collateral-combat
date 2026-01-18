'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { DraftProvider, useDraftContext } from '@/contexts/DraftContext';
import { DraftTournamentTier, DraftTournament } from '@/types';
import { PageLoading } from '@/components/ui/skeleton';
import {
  WarPartyHero,
  UserStatusBar,
  TierCard,
  LeaderboardSection,
  HotTokensSection,
  InfoSections,
  WarPartyStats,
  TierData,
  UserEnrollment,
  LeaderboardEntry,
  HotToken,
  PastWinner,
  WarPartyPhase,
} from '@/components/war-party';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

// Mock past winners (TODO: fetch from API when available)
const MOCK_PAST_WINNERS: PastWinner[] = [
  { week: 11, name: 'DegenKing', tier: 'Warlord', performance: 45.2, prize: 4.5 },
  { week: 11, name: 'MemeHunter', tier: 'Raider', performance: 38.1, prize: 2.3 },
  { week: 10, name: 'SolWarrior', tier: 'Warlord', performance: 52.7, prize: 5.1 },
  { week: 10, name: 'CryptoChad', tier: 'Scavenger', performance: 29.4, prize: 0.5 },
];

// Mock hot tokens (TODO: calculate from leaderboard picks)
const MOCK_HOT_TOKENS: HotToken[] = [
  { symbol: 'WIF', name: 'dogwifhat', logo: '/tokens/wif.png', change: 34.2, pickCount: 45 },
  { symbol: 'BONK', name: 'Bonk', logo: '/tokens/bonk.png', change: 28.5, pickCount: 52 },
  { symbol: 'POPCAT', name: 'Popcat', logo: '/tokens/popcat.png', change: 22.1, pickCount: 38 },
  { symbol: 'FWOG', name: 'Fwog', logo: '/tokens/fwog.png', change: -15.3, pickCount: 22 },
  { symbol: 'GOAT', name: 'Goatseus Maximus', logo: '/tokens/goat.png', change: -18.7, pickCount: 18 },
];

function DraftLobbyContent() {
  const { publicKey } = useWallet();
  const {
    tournaments,
    myEntries,
    fetchTournaments,
  } = useDraftContext();

  const [selectedTier, setSelectedTier] = useState<DraftTournamentTier | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const walletAddress = publicKey?.toBase58();

  // Get any active tournament for stats
  const anyTournament = tournaments['0.1 SOL'] || tournaments['0.5 SOL'] || tournaments['1 SOL'];

  // Calculate total stats across all tiers
  const totalPrizePool = useMemo(() => {
    return Object.values(tournaments).reduce((sum, t) => sum + (t?.prizePoolUsd || 0), 0);
  }, [tournaments]);

  const totalWarriors = useMemo(() => {
    return Object.values(tournaments).reduce((sum, t) => sum + (t?.totalEntries || 0), 0);
  }, [tournaments]);

  // Calculate time remaining and phase
  const { timeRemaining, phase } = useMemo(() => {
    if (!anyTournament) {
      return { timeRemaining: 0, phase: 'enrollment' as WarPartyPhase };
    }

    const now = Date.now();
    const weekEnd = anyTournament.weekEndUtc;
    const weekStart = anyTournament.weekStartUtc;

    // If before week start, enrollment phase
    if (now < weekStart) {
      return {
        timeRemaining: weekStart - now,
        phase: 'enrollment' as WarPartyPhase,
      };
    }

    // If between start and end, active phase
    if (now < weekEnd) {
      return {
        timeRemaining: weekEnd - now,
        phase: 'active' as WarPartyPhase,
      };
    }

    // If past end, calculating
    return {
      timeRemaining: 0,
      phase: 'calculating' as WarPartyPhase,
    };
  }, [anyTournament]);

  // Calculate week number
  const weekNumber = useMemo(() => {
    if (!anyTournament) return 1;
    // Approximate week number since project start
    const projectStart = new Date('2024-01-01').getTime();
    const weeksSinceStart = Math.floor((Date.now() - projectStart) / (7 * 24 * 60 * 60 * 1000));
    return weeksSinceStart + 1;
  }, [anyTournament]);

  // Build stats for hero
  const stats: WarPartyStats = {
    week: weekNumber,
    phase,
    timeRemaining,
    totalPrizePool,
    totalWarriors,
  };

  // Check for user enrollment
  const userEnrollment: UserEnrollment | null = useMemo(() => {
    if (!myEntries.length) return null;

    const entry = myEntries[0]; // User can only have one entry
    const tournament = Object.values(tournaments).find(t => t?.id === entry.tournamentId);
    if (!tournament) return null;

    // Find tier name from tournament
    const tierKey = Object.entries(tournaments).find(
      ([, t]) => t?.id === tournament.id
    )?.[0] as DraftTournamentTier | undefined;

    const tierName = tierKey === '0.1 SOL' ? 'Scavenger' : tierKey === '0.5 SOL' ? 'Raider' : 'Warlord';

    return {
      tier: tierName,
      entryId: entry.id,
      position: entry.finalRank || 999,
      totalInTier: tournament.totalEntries,
      performance: entry.finalScore || 0,
      estimatedPayout: entry.finalRank && entry.finalRank <= Math.ceil(tournament.totalEntries * 0.1)
        ? (tournament.prizePoolUsd * 0.95) / Math.ceil(tournament.totalEntries * 0.1)
        : 0,
      isInMoney: entry.finalRank ? entry.finalRank <= Math.ceil(tournament.totalEntries * 0.1) : false,
    };
  }, [myEntries, tournaments]);

  // Fetch leaderboard for active tournament
  const fetchLeaderboard = useCallback(async () => {
    if (!anyTournament) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/draft/tournaments/${anyTournament.id}/leaderboard`);
      if (!res.ok) return;

      const data = await res.json();
      const entries: LeaderboardEntry[] = data.leaderboard?.map((e: { walletAddress: string; displayName: string; tier: string; score: number }, idx: number) => ({
        rank: idx + 1,
        wallet: e.walletAddress,
        displayName: e.displayName || `${e.walletAddress.slice(0, 4)}...${e.walletAddress.slice(-4)}`,
        tier: e.tier || 'Scavenger',
        performance: e.score || 0,
        isUser: e.walletAddress === walletAddress,
      })) || [];

      setLeaderboard(entries);
    } catch {
      // Silently fail
    }
  }, [anyTournament, walletAddress]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Convert tournaments to TierData format
  const getTierData = (tier: DraftTournamentTier): TierData => {
    const tournament = tournaments[tier];
    const tierConfig = {
      '0.1 SOL': { name: 'Scavenger', tagline: 'Low stakes, high hopes. Perfect for fresh blood.' },
      '0.5 SOL': { name: 'Raider', tagline: 'Prove your worth in the mid-tier wasteland.' },
      '1 SOL': { name: 'Warlord', tagline: 'Only the ruthless survive at this level.' },
    };

    return {
      id: tournament?.id || tier,
      name: tierConfig[tier].name,
      entryFee: parseFloat(tier),
      tagline: tierConfig[tier].tagline,
      warriors: tournament?.totalEntries || 0,
      prizePool: tournament?.prizePoolUsd || 0,
      tournamentId: tournament?.id || null,
    };
  };

  // Check if user has entry for specific tier
  const hasEntryForTier = (tier: DraftTournamentTier): boolean => {
    const tournament = tournaments[tier];
    if (!tournament) return false;
    return myEntries.some(e => e.tournamentId === tournament.id);
  };

  // Check if user has any enrollment (for "already enlisted" state)
  const hasAnyEnrollment = myEntries.length > 0;

  // Get entry ID for a tier
  const getEntryIdForTier = (tier: DraftTournamentTier): string | null => {
    const tournament = tournaments[tier];
    if (!tournament) return null;
    const entry = myEntries.find(e => e.tournamentId === tournament.id);
    return entry?.id || null;
  };

  // User position in leaderboard
  const userLeaderboardEntry = leaderboard.find(e => e.isUser);
  const userPosition = userLeaderboardEntry?.rank;

  return (
    <div className="max-w-5xl mx-auto px-4 animate-fadeIn">
      {/* Hero Section */}
      <WarPartyHero stats={stats} />

      {/* User Status Bar (if enrolled) */}
      {userEnrollment && <UserStatusBar enrollment={userEnrollment} />}

      {/* Tier Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {(['0.1 SOL', '0.5 SOL', '1 SOL'] as DraftTournamentTier[]).map((tier) => {
          const tierData = getTierData(tier);
          const isEnrolled = hasEntryForTier(tier);
          const entryId = getEntryIdForTier(tier);

          return (
            <TierCard
              key={tier}
              tier={tierData}
              tierKey={tier}
              phase={phase}
              userEntryId={entryId}
              isEnrolled={isEnrolled}
              hasOtherEnrollment={hasAnyEnrollment && !isEnrolled}
              onJoin={() => setSelectedTier(tier)}
            />
          );
        })}
      </div>

      {/* Leaderboard + Hot Tokens */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <LeaderboardSection
          entries={leaderboard}
          userPosition={userPosition}
          userEntry={userLeaderboardEntry}
        />
        <HotTokensSection tokens={MOCK_HOT_TOKENS} />
      </div>

      {/* Collapsible Info Sections */}
      <InfoSections pastWinners={MOCK_PAST_WINNERS} />

      {/* Entry Modal */}
      {selectedTier && (
        <EntryModal
          tier={selectedTier}
          tournament={tournaments[selectedTier]}
          walletAddress={walletAddress}
          onClose={() => setSelectedTier(null)}
        />
      )}
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
      window.location.href = `/draft/entry/${entry.id}`;
    } catch {
      // Error handled by context
    } finally {
      setEntering(false);
    }
  };

  const tierConfig = {
    '0.1 SOL': { name: 'Scavenger', color: 'accent' },
    '0.5 SOL': { name: 'Raider', color: 'success' },
    '1 SOL': { name: 'Warlord', color: 'warning' },
  };
  const config = tierConfig[tier];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a1a] border border-warning/30 rounded-2xl p-6 max-w-md w-full animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-2 uppercase tracking-wide">Join the {config.name} War</h2>
        <p className="text-sm text-white/40 mb-4">{tier} Entry Tier</p>

        {!walletAddress ? (
          <div className="text-center py-6">
            <p className="text-white/60 mb-4">Connect your wallet to enter the war</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/[0.06]">
                <span className="text-white/50 text-sm uppercase tracking-wider">Blood Price</span>
                <span className="font-bold">{tier}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/[0.06]">
                <span className="text-white/50 text-sm uppercase tracking-wider">War Chest</span>
                <span className="font-bold text-success">{(tournament?.prizePoolUsd || 0).toFixed(1)} SOL</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/[0.06]">
                <span className="text-white/50 text-sm uppercase tracking-wider">Warriors Enlisted</span>
                <span className="font-bold">{tournament?.totalEntries || 0}</span>
              </div>
            </div>

            <p className="text-sm text-white/40 mb-6">
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
    return <PageLoading message="Loading War Party..." />;
  }

  return <DraftLobbyWithWallet />;
}
