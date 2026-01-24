'use client';

import { useState, useEffect, useCallback } from 'react';

export interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  tournamentsEntered: number;
  tournamentsWon: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  totalEarningsLamports: number;
  bestFinish: number | null;
  lastTournamentAt: number | null;
}

export function useTournamentLeaderboard(sortBy: 'earnings' | 'wins' = 'earnings') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tournaments/leaderboard?sort=${sortBy}&limit=50`
      );
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setEntries(data.leaderboard || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, error, refetch: fetchLeaderboard };
}

export function usePlayerTournamentStats(wallet: string | null) {
  const [stats, setStats] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tournaments/stats/${wallet}`
        );
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data.stats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [wallet]);

  return { stats, loading, error };
}
