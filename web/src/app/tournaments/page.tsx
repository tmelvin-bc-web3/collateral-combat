'use client';

import Link from 'next/link';
import { useTournaments } from '@/hooks/useTournament';
import { EventCountdown } from '@/components/events/EventCountdown';

export default function TournamentsPage() {
  const { tournaments, loading, error, refetch } = useTournaments();

  return (
    <main className="min-h-screen bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
          <p className="text-white/60">
            Compete in single-elimination bracket tournaments for prize pools
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-warning"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-danger mb-4">{error}</p>
            <button onClick={() => refetch()} className="text-warning hover:underline">
              Try again
            </button>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 text-white/50">
            <p className="text-lg">No tournaments scheduled</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map(tournament => (
              <Link
                key={tournament.id}
                href={`/tournament/${tournament.id}`}
                className="block bg-black/40 backdrop-blur border border-white/10 rounded-lg p-4 hover:border-warning/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                    <p className="text-white/60 text-sm">
                      {tournament.size} players | {(tournament.entryFeeLamports / 1e9).toFixed(2)} SOL entry
                    </p>
                  </div>
                  <div className="text-right">
                    {tournament.status === 'in_progress' ? (
                      <span className="bg-success text-black px-2 py-1 rounded text-sm font-bold">LIVE</span>
                    ) : tournament.status === 'completed' ? (
                      <span className="bg-white/20 text-white/60 px-2 py-1 rounded text-sm">Complete</span>
                    ) : tournament.status === 'cancelled' ? (
                      <span className="bg-danger/20 text-danger px-2 py-1 rounded text-sm">Cancelled</span>
                    ) : (
                      <EventCountdown targetTime={tournament.scheduledStartTime} size="sm" />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-white/50">
                    Prize pool: <span className="text-warning">{(tournament.prizePoolLamports / 1e9).toFixed(2)} SOL</span>
                  </span>
                  <span className={tournament.status === 'registration_open' ? 'text-success' : 'text-white/50'}>
                    {tournament.status === 'registration_open' ? 'Registration Open' :
                     tournament.status === 'upcoming' ? 'Coming Soon' :
                     tournament.status === 'in_progress' ? 'In Progress' :
                     tournament.status === 'completed' ? 'Completed' :
                     'Cancelled'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
