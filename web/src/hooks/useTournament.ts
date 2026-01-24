'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

export interface Tournament {
  id: string;
  name: string;
  format: 'single_elimination';
  size: 8 | 16;
  entryFeeLamports: number;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
  prizePoolLamports: number;
  createdAt: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  player1Wallet: string | null;
  player2Wallet: string | null;
  winnerWallet: string | null;
  battleId: string | null;
  scheduledTime: number | null;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tournaments`);
      if (!res.ok) throw new Error('Failed to fetch tournaments');
      const data = await res.json();
      setTournaments(data.tournaments || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return { tournaments, loading, error, refetch: fetchTournaments };
}

export function useTournament(tournamentId: string) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchTournament = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tournaments/${tournamentId}`);
        if (!res.ok) throw new Error('Tournament not found');
        const data = await res.json();
        setTournament(data.tournament);
        setMatches(data.matches || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();

    // Join tournament room for updates
    const socket = getSocket();
    socket.emit('join_tournament_room' as any, tournamentId);

    socket.on('tournament_update' as any, (event: any) => {
      if (event.tournamentId === tournamentId) {
        // Handle different event types
        switch (event.type) {
          case 'bracket_generated':
          case 'match_ready':
          case 'match_completed':
            // Refresh matches
            setMatches(event.data.matches || event.data);
            break;
          case 'tournament_completed':
            setTournament(prev => prev ? { ...prev, status: 'completed' } : null);
            break;
        }
      }
    });

    return () => {
      socket.emit('leave_tournament_room' as any, tournamentId);
      socket.off('tournament_update' as any);
    };
  }, [tournamentId]);

  const register = useCallback(async (wallet: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/tournaments/${tournamentId}/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet })
      }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }
    return res.json();
  }, [tournamentId]);

  return { tournament, matches, loading, error, register };
}
