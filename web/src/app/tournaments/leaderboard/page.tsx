'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useTournamentLeaderboard, usePlayerTournamentStats } from '@/hooks/useTournamentLeaderboard';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';

export default function TournamentLeaderboardPage() {
  const { publicKey } = useWallet();
  const [sortBy, setSortBy] = useState<'earnings' | 'wins'>('earnings');

  const { entries, loading, error, refetch } = useTournamentLeaderboard(sortBy);
  const { stats: myStats } = usePlayerTournamentStats(publicKey?.toBase58() || null);

  return (
    <main className="min-h-screen bg-primary">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournament Leaderboard</h1>
            <p className="text-white/60">
              Top fighters ranked by tournament performance
            </p>
          </div>
          <Link
            href="/tournaments"
            className="text-warning hover:underline"
          >
            Back to Tournaments
          </Link>
        </div>

        {/* My stats card (if connected and has stats) */}
        {publicKey && myStats && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/50 text-sm">Your Stats</p>
                <p className="text-warning font-mono">
                  {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                </p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-success">{myStats.tournamentsWon}</p>
                  <p className="text-white/50 text-xs">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{myStats.tournamentsEntered}</p>
                  <p className="text-white/50 text-xs">Entered</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">
                    {(myStats.totalEarningsLamports / 1e9).toFixed(2)}
                  </p>
                  <p className="text-white/50 text-xs">SOL Earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {myStats.totalMatchesPlayed > 0
                      ? ((myStats.totalMatchesWon / myStats.totalMatchesPlayed) * 100).toFixed(0)
                      : '0'}%
                  </p>
                  <p className="text-white/50 text-xs">Match Win Rate</p>
                </div>
                {myStats.bestFinish && (
                  <div>
                    <p className="text-2xl font-bold text-amber-400">
                      {myStats.bestFinish === 1 ? '1st' : myStats.bestFinish === 2 ? '2nd' : myStats.bestFinish === 3 ? '3rd' : `${myStats.bestFinish}th`}
                    </p>
                    <p className="text-white/50 text-xs">Best Finish</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
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
        ) : (
          <TournamentLeaderboard
            entries={entries}
            highlightWallet={publicKey?.toBase58()}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        )}

        {/* Empty state info */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/50 mb-4">
              No tournament results yet. Be the first to compete!
            </p>
            <Link
              href="/tournaments"
              className="inline-block px-6 py-3 bg-warning hover:bg-warning/90 text-black font-semibold rounded-lg transition-colors"
            >
              View Upcoming Tournaments
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
