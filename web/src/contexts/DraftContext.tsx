'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSocket } from '@/lib/socket';
import {
  DraftTournament,
  DraftTournamentTier,
  DraftEntry,
  DraftSession,
  DraftRound,
  DraftPick,
  DraftLeaderboardEntry,
  Memecoin,
  PowerUpUsage,
} from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface DraftContextType {
  // Tournament state
  tournaments: Record<DraftTournamentTier, DraftTournament | null>;
  currentTournament: DraftTournament | null;
  leaderboard: DraftLeaderboardEntry[];

  // User's entries
  myEntries: DraftEntry[];
  currentEntry: DraftEntry | null;

  // Draft session
  draftSession: DraftSession | null;
  currentRound: DraftRound | null;
  swapOptions: Memecoin[] | null;

  // Memecoin data
  memecoins: Memecoin[];
  prices: Record<string, number>;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTournaments: () => Promise<void>;
  selectTier: (tier: DraftTournamentTier) => void;
  enterTournament: (tournamentId: string) => Promise<DraftEntry>;
  startDraft: (entryId: string) => void;
  makePick: (roundNumber: number, coinId: string) => void;
  useSwap: (pickId: string) => void;
  selectSwapCoin: (pickId: string, coinId: string) => void;
  useBoost: (pickId: string) => void;
  useFreeze: (pickId: string) => void;
  subscribeToTournament: (tournamentId: string) => void;
  unsubscribeFromTournament: (tournamentId: string) => void;
  refreshEntry: (entryId: string) => Promise<void>;
  fetchMyEntries: () => Promise<void>;
}

const DraftContext = createContext<DraftContextType | null>(null);

export function DraftProvider({
  children,
  walletAddress,
}: {
  children: ReactNode;
  walletAddress: string | null;
}) {
  // Tournament state
  const [tournaments, setTournaments] = useState<Record<DraftTournamentTier, DraftTournament | null>>({
    '0.1 SOL': null,
    '0.5 SOL': null,
    '1 SOL': null,
  });
  const [currentTournament, setCurrentTournament] = useState<DraftTournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<DraftLeaderboardEntry[]>([]);

  // User's entries
  const [myEntries, setMyEntries] = useState<DraftEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<DraftEntry | null>(null);

  // Draft session
  const [draftSession, setDraftSession] = useState<DraftSession | null>(null);
  const [currentRound, setCurrentRound] = useState<DraftRound | null>(null);
  const [swapOptions, setSwapOptions] = useState<Memecoin[] | null>(null);

  // Memecoin data
  const [memecoins, setMemecoins] = useState<Memecoin[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Socket event handlers
  useEffect(() => {
    const socket = getSocket();

    const handleTournamentUpdate = (tournament: DraftTournament) => {
      setTournaments(prev => ({
        ...prev,
        [tournament.tier]: tournament,
      }));
      if (currentTournament?.id === tournament.id) {
        setCurrentTournament(tournament);
      }
    };

    const handleSessionUpdate = (session: DraftSession) => {
      setDraftSession(session);
    };

    const handleRoundOptions = (round: DraftRound) => {
      setCurrentRound(round);
    };

    const handlePickConfirmed = (pick: DraftPick) => {
      // Update current entry's picks
      if (currentEntry) {
        setCurrentEntry(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            picks: [...prev.picks.filter(p => p.pickOrder !== pick.pickOrder), pick].sort(
              (a, b) => a.pickOrder - b.pickOrder
            ),
          };
        });
      }
    };

    const handleDraftCompleted = (entry: DraftEntry) => {
      setCurrentEntry(entry);
      setDraftSession(null);
      setCurrentRound(null);
    };

    const handleLeaderboardUpdate = (data: { tournamentId: string; leaderboard: DraftLeaderboardEntry[] }) => {
      if (currentTournament?.id === data.tournamentId) {
        setLeaderboard(data.leaderboard);
      }
    };

    const handleScoreUpdate = (data: { entryId: string; currentScore: number }) => {
      if (currentEntry?.id === data.entryId) {
        setCurrentEntry(prev => prev ? { ...prev, finalScore: data.currentScore } : prev);
      }
    };

    const handleSwapOptions = (data: { pickId: string; options: Memecoin[] }) => {
      setSwapOptions(data.options);
    };

    const handlePowerupUsed = (usage: PowerUpUsage) => {
      // Refresh current entry to get updated picks
      if (currentEntry) {
        refreshEntry(currentEntry.id);
      }
    };

    const handlePricesUpdate = (newPrices: Record<string, number>) => {
      setPrices(newPrices);
    };

    const handleError = (message: string) => {
      setError(message);
      setIsLoading(false);
      setTimeout(() => setError(null), 5000);
    };

    socket.on('draft_tournament_update', handleTournamentUpdate);
    socket.on('draft_session_update', handleSessionUpdate);
    socket.on('draft_round_options', handleRoundOptions);
    socket.on('draft_pick_confirmed', handlePickConfirmed);
    socket.on('draft_completed', handleDraftCompleted);
    socket.on('draft_leaderboard_update', handleLeaderboardUpdate);
    socket.on('draft_score_update', handleScoreUpdate);
    socket.on('draft_swap_options', handleSwapOptions);
    socket.on('powerup_used', handlePowerupUsed);
    socket.on('memecoin_prices_update', handlePricesUpdate);
    socket.on('draft_error', handleError);

    return () => {
      socket.off('draft_tournament_update', handleTournamentUpdate);
      socket.off('draft_session_update', handleSessionUpdate);
      socket.off('draft_round_options', handleRoundOptions);
      socket.off('draft_pick_confirmed', handlePickConfirmed);
      socket.off('draft_completed', handleDraftCompleted);
      socket.off('draft_leaderboard_update', handleLeaderboardUpdate);
      socket.off('draft_score_update', handleScoreUpdate);
      socket.off('draft_swap_options', handleSwapOptions);
      socket.off('powerup_used', handlePowerupUsed);
      socket.off('memecoin_prices_update', handlePricesUpdate);
      socket.off('draft_error', handleError);
    };
  }, [currentTournament, currentEntry]);

  // Fetch memecoins on mount
  useEffect(() => {
    fetchMemecoins();
  }, []);

  // Fetch user's entries when wallet changes
  useEffect(() => {
    if (walletAddress) {
      fetchMyEntries();
    } else {
      setMyEntries([]);
      setCurrentEntry(null);
    }
  }, [walletAddress]);

  const fetchMemecoins = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/draft/memecoins`);
      if (response.ok) {
        const data = await response.json();
        setMemecoins(data);
      }
    } catch (err) {
      console.error('Failed to fetch memecoins:', err);
    }
  };

  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/draft/tournaments`);
      if (response.ok) {
        const data: DraftTournament[] = await response.json();
        const tournamentsByTier: Record<DraftTournamentTier, DraftTournament | null> = {
          '0.1 SOL': null,
          '0.5 SOL': null,
          '1 SOL': null,
        };
        for (const tournament of data) {
          tournamentsByTier[tournament.tier] = tournament;
        }
        setTournaments(tournamentsByTier);
      }
    } catch (err) {
      setError('Failed to fetch tournaments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectTier = useCallback((tier: DraftTournamentTier) => {
    const tournament = tournaments[tier];
    setCurrentTournament(tournament);
    if (tournament) {
      subscribeToTournament(tournament.id);
    }
  }, [tournaments]);

  const fetchMyEntries = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/draft/entries/wallet/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setMyEntries(data);
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    }
  }, [walletAddress]);

  const refreshEntry = useCallback(async (entryId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/draft/entries/${entryId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentEntry(data);
      }
    } catch (err) {
      console.error('Failed to refresh entry:', err);
    }
  }, []);

  const enterTournament = useCallback(async (tournamentId: string): Promise<DraftEntry> => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/draft/tournaments/${tournamentId}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enter tournament');
      }

      const entry = await response.json();
      setCurrentEntry(entry);
      setMyEntries(prev => [...prev, entry]);
      return entry;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  const startDraft = useCallback((entryId: string) => {
    const socket = getSocket();
    socket.emit('start_draft', entryId);
  }, []);

  const makePick = useCallback((roundNumber: number, coinId: string) => {
    if (!currentEntry) return;
    const socket = getSocket();
    socket.emit('make_draft_pick', currentEntry.id, roundNumber, coinId);
  }, [currentEntry]);

  const useSwap = useCallback((pickId: string) => {
    if (!currentEntry) return;
    const socket = getSocket();
    socket.emit('use_powerup_swap', currentEntry.id, pickId);
  }, [currentEntry]);

  const selectSwapCoin = useCallback((pickId: string, coinId: string) => {
    if (!currentEntry) return;
    const socket = getSocket();
    socket.emit('select_swap_coin', currentEntry.id, pickId, coinId);
    setSwapOptions(null);
  }, [currentEntry]);

  const useBoost = useCallback((pickId: string) => {
    if (!currentEntry) return;
    const socket = getSocket();
    socket.emit('use_powerup_boost', currentEntry.id, pickId);
  }, [currentEntry]);

  const useFreeze = useCallback((pickId: string) => {
    if (!currentEntry) return;
    const socket = getSocket();
    socket.emit('use_powerup_freeze', currentEntry.id, pickId);
  }, [currentEntry]);

  const subscribeToTournament = useCallback((tournamentId: string) => {
    const socket = getSocket();
    socket.emit('subscribe_draft_tournament', tournamentId);
  }, []);

  const unsubscribeFromTournament = useCallback((tournamentId: string) => {
    const socket = getSocket();
    socket.emit('unsubscribe_draft_tournament', tournamentId);
  }, []);

  return (
    <DraftContext.Provider
      value={{
        tournaments,
        currentTournament,
        leaderboard,
        myEntries,
        currentEntry,
        draftSession,
        currentRound,
        swapOptions,
        memecoins,
        prices,
        isLoading,
        error,
        fetchTournaments,
        selectTier,
        enterTournament,
        startDraft,
        makePick,
        useSwap,
        selectSwapCoin,
        useBoost,
        useFreeze,
        subscribeToTournament,
        unsubscribeFromTournament,
        refreshEntry,
        fetchMyEntries,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}

export function useDraftContext() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraftContext must be used within a DraftProvider');
  }
  return context;
}
