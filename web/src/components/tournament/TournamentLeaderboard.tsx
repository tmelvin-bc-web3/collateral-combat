'use client';

import { LeaderboardEntry } from '@/hooks/useTournamentLeaderboard';

interface TournamentLeaderboardProps {
  entries: LeaderboardEntry[];
  highlightWallet?: string;
  sortBy: 'earnings' | 'wins';
  onSortChange: (sort: 'earnings' | 'wins') => void;
}

export function TournamentLeaderboard({
  entries,
  highlightWallet,
  sortBy,
  onSortChange
}: TournamentLeaderboardProps) {
  const formatWallet = (wallet: string) => wallet.slice(0, 4) + '...' + wallet.slice(-4);
  const formatSol = (lamports: number) => (lamports / 1e9).toFixed(2);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-yellow-400 text-lg">1st</span>;
    if (rank === 2) return <span className="text-gray-300 text-lg">2nd</span>;
    if (rank === 3) return <span className="text-amber-600 text-lg">3rd</span>;
    return <span className="text-white/50">{rank}</span>;
  };

  return (
    <div>
      {/* Sort tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onSortChange('earnings')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            sortBy === 'earnings'
              ? 'bg-warning text-black'
              : 'bg-white/10 text-white/50 hover:bg-white/20'
          }`}
        >
          By Earnings
        </button>
        <button
          onClick={() => onSortChange('wins')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            sortBy === 'wins'
              ? 'bg-warning text-black'
              : 'bg-white/10 text-white/50 hover:bg-white/20'
          }`}
        >
          By Wins
        </button>
      </div>

      {/* Leaderboard table */}
      <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr className="text-white/50 text-sm">
              <th className="py-3 px-4 text-left">Rank</th>
              <th className="py-3 px-4 text-left">Fighter</th>
              <th className="py-3 px-4 text-center">Tournaments</th>
              <th className="py-3 px-4 text-center">Wins</th>
              <th className="py-3 px-4 text-center">Win Rate</th>
              <th className="py-3 px-4 text-right">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const winRate = entry.totalMatchesPlayed > 0
                ? ((entry.totalMatchesWon / entry.totalMatchesPlayed) * 100).toFixed(0)
                : '0';
              const isHighlighted = entry.walletAddress === highlightWallet;

              return (
                <tr
                  key={entry.walletAddress}
                  className={`border-t border-white/5 ${
                    isHighlighted ? 'bg-warning/10' : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRankBadge(entry.rank)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-mono ${isHighlighted ? 'text-warning' : 'text-white'}`}>
                      {formatWallet(entry.walletAddress)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-white/70">
                    {entry.tournamentsEntered}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-success font-bold">{entry.tournamentsWon}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`${
                      parseInt(winRate) >= 60 ? 'text-success' :
                      parseInt(winRate) >= 40 ? 'text-white' : 'text-danger'
                    }`}>
                      {winRate}%
                    </span>
                    <span className="text-white/30 text-xs ml-1">
                      ({entry.totalMatchesWon}/{entry.totalMatchesPlayed})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-warning font-bold">{formatSol(entry.totalEarningsLamports)}</span>
                    <span className="text-white/50 ml-1">SOL</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="py-12 text-center text-white/50">
            No tournament results yet
          </div>
        )}
      </div>
    </div>
  );
}
