'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTournaments, type Tournament } from '@/hooks/useTournament';
import { EventCountdown } from '@/components/events/EventCountdown';
import {
  Trophy,
  Users,
  ChevronRight,
  Flame,
  Swords,
  Calendar,
  Crown,
} from 'lucide-react';

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'mock-1',
    name: 'Weekly Degen Cup',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 0.5e9,
    scheduledStartTime: Date.now() + 4 * 60 * 60 * 1000,
    registrationOpens: Date.now() - 24 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 3 * 60 * 60 * 1000,
    status: 'registration_open',
    prizePoolLamports: 7.6e9,
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'mock-2',
    name: 'Memecoin Madness',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 1e9,
    scheduledStartTime: Date.now() + 6 * 60 * 60 * 1000,
    registrationOpens: Date.now() - 12 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 5 * 60 * 60 * 1000,
    status: 'registration_open',
    prizePoolLamports: 15.2e9,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: 'mock-3',
    name: 'Friday Night Fights',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 0.25e9,
    scheduledStartTime: Date.now() + 12 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 6 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 11 * 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 3.8e9,
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
  },
  {
    id: 'mock-4',
    name: 'High Roller Invitational',
    format: 'single_elimination',
    size: 8,
    entryFeeLamports: 2e9,
    scheduledStartTime: Date.now() + 24 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 12 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 23 * 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 15.2e9,
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
  },
  {
    id: 'mock-5',
    name: 'Paper Hands Gauntlet',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 0.1e9,
    scheduledStartTime: Date.now() + 36 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 24 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 35 * 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 1.52e9,
    createdAt: Date.now() - 6 * 60 * 60 * 1000,
  },
  {
    id: 'mock-6',
    name: 'Whale Wars Championship',
    format: 'single_elimination',
    size: 8,
    entryFeeLamports: 5e9,
    scheduledStartTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 2 * 24 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 3 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 38e9,
    createdAt: Date.now() - 72 * 60 * 60 * 1000,
  },
  {
    id: 'mock-7',
    name: 'CT Legends Invitational',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 3e9,
    scheduledStartTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 4 * 24 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 5 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 45.6e9,
    createdAt: Date.now() - 96 * 60 * 60 * 1000,
  },
  {
    id: 'mock-8',
    name: 'Rookie Rumble',
    format: 'single_elimination',
    size: 16,
    entryFeeLamports: 0.1e9,
    scheduledStartTime: Date.now() + 48 * 60 * 60 * 1000,
    registrationOpens: Date.now() + 36 * 60 * 60 * 1000,
    registrationCloses: Date.now() + 47 * 60 * 60 * 1000,
    status: 'upcoming',
    prizePoolLamports: 1.52e9,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
  },
];

/* ── Helpers ─────────────────────────────────────────────── */

function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(2);
}

function groupTournaments(list: Tournament[]) {
  const live = list
    .filter((t) => t.status === 'in_progress')
    .sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
  const registrationOpen = list
    .filter((t) => t.status === 'registration_open')
    .sort((a, b) => a.registrationCloses - b.registrationCloses);
  const upcoming = list
    .filter((t) => t.status === 'upcoming')
    .sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
  return { live, registrationOpen, upcoming };
}

function getFeaturedTournament(list: Tournament[]): Tournament | null {
  // Highest-prize registration_open tournament
  const regOpen = list
    .filter((t) => t.status === 'registration_open')
    .sort((a, b) => b.prizePoolLamports - a.prizePoolLamports);
  if (regOpen.length > 0) return regOpen[0];

  // Soonest in_progress
  const inProgress = list
    .filter((t) => t.status === 'in_progress')
    .sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
  if (inProgress.length > 0) return inProgress[0];

  // Soonest upcoming
  const upcoming = list
    .filter((t) => t.status === 'upcoming')
    .sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
  if (upcoming.length > 0) return upcoming[0];

  return null;
}

/* ── Card variant helpers ────────────────────────────────── */

type CardVariant = 'hot' | 'live' | 'default';

function getCardVariant(t: Tournament): CardVariant {
  if (t.status === 'registration_open') return 'hot';
  if (t.status === 'in_progress') return 'live';
  return 'default';
}

function variantBorder(v: CardVariant) {
  if (v === 'hot') return 'border-fire/30';
  if (v === 'live') return 'border-danger/40';
  return 'border-white/10';
}

function variantGlow(v: CardVariant) {
  if (v === 'hot')
    return 'bg-gradient-to-r from-fire/5 via-transparent to-fire/5';
  if (v === 'live')
    return 'bg-gradient-to-r from-danger/5 via-transparent to-danger/5';
  return '';
}

function variantPrizeClass(v: CardVariant) {
  if (v === 'hot') return 'text-fire';
  return 'text-warning';
}

function variantCta(v: CardVariant) {
  if (v === 'hot') return 'Enter';
  if (v === 'live') return 'Watch';
  return 'View';
}

function variantIcon(v: CardVariant) {
  if (v === 'hot')
    return <Flame className="w-4 h-4 text-fire animate-pulse" />;
  if (v === 'live')
    return <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
    </span>;
  return <Calendar className="w-4 h-4 text-white/50" />;
}

/* ── Component ───────────────────────────────────────────── */

export default function TournamentsPage() {
  const { tournaments: liveTournaments, loading } = useTournaments();
  const tournaments = useMemo(
    () => (liveTournaments.length > 0 ? liveTournaments : MOCK_TOURNAMENTS),
    [liveTournaments],
  );

  const featured = useMemo(() => getFeaturedTournament(tournaments), [tournaments]);
  const groups = useMemo(() => groupTournaments(tournaments), [tournaments]);

  // Exclude featured from group listings
  const filteredGroups = useMemo(() => {
    if (!featured) return groups;
    const exclude = (list: Tournament[]) =>
      list.filter((t) => t.id !== featured.id);
    return {
      live: exclude(groups.live),
      registrationOpen: exclude(groups.registrationOpen),
      upcoming: exclude(groups.upcoming),
    };
  }, [groups, featured]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPrize = tournaments.reduce((s, t) => s + t.prizePoolLamports, 0);
    const totalSlots = tournaments.reduce((s, t) => s + t.size, 0);
    return { count: tournaments.length, totalPrize, totalSlots };
  }, [tournaments]);

  return (
    <main className="min-h-screen bg-primary animate-fadeIn">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-warning" />
            <div>
              <h1
                className="text-4xl font-black text-white tracking-[0.15em] uppercase"
                style={{ fontFamily: 'Impact, sans-serif' }}
              >
                Tournament Arena
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Single-elimination brackets. Winner takes all.
              </p>
            </div>
          </div>

          <Link
            href="/tournaments/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur border border-white/10 hover:border-warning/50 transition-colors text-sm text-white/80 hover:text-white"
          >
            <Crown className="w-4 h-4 text-warning" />
            Leaderboard
          </Link>
        </div>

        {/* ── Stats Banner ─────────────────────────────── */}
        <div className="flex items-center justify-around bg-black/40 backdrop-blur border border-white/10 rounded-xl px-6 py-3">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Total Tournaments
            </p>
            <p className="text-xl font-black text-white tabular-nums">
              {stats.count}
            </p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Total Prize Pool
            </p>
            <p
              className="text-xl font-black text-fire tabular-nums"
              style={{ textShadow: '0 0 20px rgba(255,85,0,0.4)' }}
            >
              {formatSol(stats.totalPrize)} SOL
            </p>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Total Slots
            </p>
            <p className="text-xl font-black text-white tabular-nums">
              {stats.totalSlots}
            </p>
          </div>
        </div>

        {/* ── Loading State ────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-warning" />
          </div>
        ) : tournaments.length === 0 ? (
          /* ── Empty State ──────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Swords className="w-16 h-16 text-white/20 mb-4" />
            <h2
              className="text-2xl font-black text-white/60 tracking-[0.15em] uppercase mb-2"
              style={{ fontFamily: 'Impact, sans-serif' }}
            >
              No Tournaments Yet
            </h2>
            <p className="text-white/40 text-sm">
              Check back soon — new tournaments are being scheduled.
            </p>
          </div>
        ) : (
          <>
            {/* ── Featured Hero Card ───────────────────── */}
            {featured && <FeaturedCard tournament={featured} />}

            {/* ── Live Now Section ─────────────────────── */}
            {filteredGroups.live.length > 0 && (
              <TournamentSection
                icon={
                  <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-danger" />
                  </span>
                }
                title="IN PROGRESS"
                titleColor="text-danger"
                tournaments={filteredGroups.live}
              />
            )}

            {/* ── Registration Open Section ────────────── */}
            {filteredGroups.registrationOpen.length > 0 && (
              <TournamentSection
                icon={<Flame className="w-5 h-5 text-fire animate-pulse mr-2" />}
                title="REGISTRATION OPEN"
                titleColor="text-fire"
                label="Enter Now"
                tournaments={filteredGroups.registrationOpen}
              />
            )}

            {/* ── Coming Soon Section ──────────────────── */}
            {filteredGroups.upcoming.length > 0 && (
              <TournamentSection
                icon={<Calendar className="w-5 h-5 text-white/50 mr-2" />}
                title="COMING SOON"
                titleColor="text-white/80"
                tournaments={filteredGroups.upcoming}
              />
            )}
          </>
        )}

        {/* ── Bottom Leaderboard CTA ───────────────────── */}
        <Link
          href="/tournaments/leaderboard"
          className="block w-full text-center py-4 rounded-xl bg-gradient-to-r from-fire to-warning text-black font-black tracking-[0.15em] uppercase hover:brightness-110 transition"
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          <span className="flex items-center justify-center gap-2 text-lg">
            <Trophy className="w-5 h-5" />
            View Leaderboard
          </span>
        </Link>
      </div>
    </main>
  );
}

/* ── Featured Hero Card ────────────────────────────────── */

function FeaturedCard({ tournament }: { tournament: Tournament }) {
  const ctaLabel =
    tournament.status === 'registration_open'
      ? 'Register Now'
      : tournament.status === 'in_progress'
        ? 'Watch Live'
        : 'View Details';

  const countdownTarget =
    tournament.status === 'registration_open'
      ? tournament.registrationCloses
      : tournament.scheduledStartTime;

  return (
    <div className="relative">
      {/* Animated outer glow */}
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-fire via-warning to-fire animate-pulse blur-sm opacity-60" />

      <div className="relative rounded-2xl overflow-hidden border border-fire/30 bg-black/80 backdrop-blur">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-fire/20 via-warning/10 to-fire/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-fire animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-fire/80 font-bold">
              Featured Tournament
            </span>
          </div>
          <EventCountdown targetTime={countdownTarget} size="md" />
        </div>

        <div className="px-6 py-5">
          {/* Title */}
          <h2
            className="text-3xl font-black text-white tracking-[0.1em] uppercase mb-6"
            style={{ fontFamily: 'Impact, sans-serif' }}
          >
            {tournament.name}
          </h2>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Prize Pool
              </p>
              <p
                className="text-4xl font-black text-fire tabular-nums"
                style={{ textShadow: '0 0 30px rgba(255,85,0,0.5)' }}
              >
                {formatSol(tournament.prizePoolLamports)}
              </p>
              <p className="text-xs text-white/40 mt-0.5">SOL</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Entry Fee
              </p>
              <p className="text-3xl font-black text-warning tabular-nums">
                {formatSol(tournament.entryFeeLamports)}
              </p>
              <p className="text-xs text-white/40 mt-0.5">SOL</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                Format
              </p>
              <p className="text-3xl font-black text-white tabular-nums">
                {tournament.size}
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Player Bracket
              </p>
            </div>
          </div>

          {/* Registration progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-white/50 mb-1.5">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Bracket Capacity
              </span>
              <span>{tournament.size} slots</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fire to-warning rounded-full transition-all"
                style={{ width: '40%' }}
              />
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/tournament/${tournament.id}`}
            className="block w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-fire to-warning text-black font-black tracking-[0.15em] uppercase hover:brightness-110 transition text-lg"
            style={{ fontFamily: 'Impact, sans-serif' }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────────── */

function TournamentSection({
  icon,
  title,
  titleColor,
  label,
  tournaments,
}: {
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  label?: string;
  tournaments: Tournament[];
}) {
  return (
    <section>
      <div className="flex items-center mb-4">
        {icon}
        <h2
          className={`text-xl font-black tracking-[0.15em] uppercase ${titleColor}`}
          style={{ fontFamily: 'Impact, sans-serif' }}
        >
          {title}
        </h2>
        {label && (
          <span className="ml-3 text-[10px] uppercase tracking-widest text-fire/60 font-bold bg-fire/10 px-2 py-0.5 rounded">
            {label}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
      </div>
    </section>
  );
}

/* ── Enhanced Tournament Card ──────────────────────────── */

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const variant = getCardVariant(tournament);
  const border = variantBorder(variant);
  const glow = variantGlow(variant);
  const prizeClass = variantPrizeClass(variant);
  const cta = variantCta(variant);
  const icon = variantIcon(variant);

  const countdownTarget =
    tournament.status === 'registration_open'
      ? tournament.registrationCloses
      : tournament.scheduledStartTime;

  return (
    <Link
      href={`/tournament/${tournament.id}`}
      className={`group block relative rounded-xl overflow-hidden border ${border} bg-black/40 backdrop-blur hover:border-warning/50 transition-all ${glow}`}
    >
      <div className="px-5 py-4">
        {/* Top row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <h3
              className="text-lg font-black text-white tracking-wide uppercase"
              style={{ fontFamily: 'Impact, sans-serif' }}
            >
              {tournament.name}
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded font-bold">
              {tournament.size}-man
            </span>
          </div>

          {tournament.status === 'in_progress' && (
            <span className="bg-danger/20 text-danger px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold">
              Live
            </span>
          )}
          {tournament.status === 'registration_open' && (
            <span className="bg-fire/10 text-fire px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold">
              Open
            </span>
          )}
        </div>

        {/* Middle row — stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
              Prize Pool
            </p>
            <p
              className={`text-xl font-black tabular-nums ${prizeClass}`}
              style={
                variant === 'hot'
                  ? { textShadow: '0 0 16px rgba(255,85,0,0.4)' }
                  : undefined
              }
            >
              {formatSol(tournament.prizePoolLamports)} SOL
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
              Entry Fee
            </p>
            <p className="text-xl font-black text-white tabular-nums">
              {formatSol(tournament.entryFeeLamports)} SOL
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">
              {tournament.status === 'registration_open'
                ? 'Reg. Closes'
                : 'Starts In'}
            </p>
            <EventCountdown targetTime={countdownTarget} size="sm" />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {tournament.size}-player bracket
            </span>
            <span className="flex items-center gap-1">
              <Swords className="w-3 h-3" />
              Single Elim
            </span>
          </div>

          <span className="flex items-center gap-1 text-sm font-bold text-white/60 group-hover:text-warning transition-colors">
            {cta}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
