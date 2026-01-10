// Hook for interacting with the on-chain draft program

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  DraftClient,
  Draft,
  DraftEntry,
  Config,
  DraftStatus,
  lamportsToSol,
  getTimeRemaining,
  calculatePayout,
} from '@/lib/draft';

export interface OnChainDraftData {
  id: number;
  creator: string;
  entryFee: number;
  maxPlayers: number;
  numPicks: number;
  currentPlayers: number;
  totalPool: number;
  status: 'open' | 'active' | 'locked' | 'settled' | 'cancelled';
  createdAt: number;
  startedAt: number;
  endsAt: number;
  timeRemaining: number;
  firstPlace: string | null;
  secondPlace: string | null;
  thirdPlace: string | null;
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
}

export interface OnChainEntryData {
  draftId: number;
  picks: string[];
  score: number;
  finalRank: number;
  claimed: boolean;
  joinedAt: number;
}

export function useDraftOnChain() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [client, setClient] = useState<DraftClient | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [openDrafts, setOpenDrafts] = useState<OnChainDraftData[]>([]);
  const [activeDrafts, setActiveDrafts] = useState<OnChainDraftData[]>([]);
  const [currentDraft, setCurrentDraft] = useState<OnChainDraftData | null>(null);
  const [myEntry, setMyEntry] = useState<OnChainEntryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const newClient = new DraftClient(connection, wallet);
      setClient(newClient);
    } else {
      setClient(null);
    }
  }, [connection, wallet, wallet.connected, wallet.publicKey]);

  // Convert on-chain draft to frontend format
  const convertDraft = useCallback((draft: Draft): OnChainDraftData => {
    let status: 'open' | 'active' | 'locked' | 'settled' | 'cancelled' = 'open';
    if (draft.status === DraftStatus.Active) status = 'active';
    else if (draft.status === DraftStatus.Locked) status = 'locked';
    else if (draft.status === DraftStatus.Settled) status = 'settled';
    else if (draft.status === DraftStatus.Cancelled) status = 'cancelled';

    const firstPlace = draft.firstPlace.equals(PublicKey.default) ? null : draft.firstPlace.toBase58();
    const secondPlace = draft.secondPlace.equals(PublicKey.default) ? null : draft.secondPlace.toBase58();
    const thirdPlace = draft.thirdPlace.equals(PublicKey.default) ? null : draft.thirdPlace.toBase58();

    return {
      id: draft.id.toNumber(),
      creator: draft.creator.toBase58(),
      entryFee: lamportsToSol(draft.entryFee),
      maxPlayers: draft.maxPlayers,
      numPicks: draft.numPicks,
      currentPlayers: draft.currentPlayers,
      totalPool: lamportsToSol(draft.totalPool),
      status,
      createdAt: draft.createdAt.toNumber() * 1000,
      startedAt: draft.startedAt.toNumber() * 1000,
      endsAt: draft.endsAt.toNumber() * 1000,
      timeRemaining: getTimeRemaining(draft.endsAt),
      firstPlace,
      secondPlace,
      thirdPlace,
      firstPrize: calculatePayout(draft.totalPool, 1) / 1_000_000_000,
      secondPrize: calculatePayout(draft.totalPool, 2) / 1_000_000_000,
      thirdPrize: calculatePayout(draft.totalPool, 3) / 1_000_000_000,
    };
  }, []);

  // Convert on-chain entry to frontend format
  const convertEntry = useCallback((entry: DraftEntry): OnChainEntryData => {
    return {
      draftId: entry.draftId.toNumber(),
      picks: entry.picks,
      score: entry.score.toNumber(),
      finalRank: entry.finalRank,
      claimed: entry.claimed,
      joinedAt: entry.joinedAt.toNumber() * 1000,
    };
  }, []);

  // Fetch all data
  const refresh = useCallback(async () => {
    if (!client) return;

    try {
      setIsLoading(true);
      setError(null);

      const [configData, openDraftsData, activeDraftsData] = await Promise.all([
        client.getConfig(),
        client.getOpenDrafts(),
        client.getActiveDrafts(),
      ]);

      setConfig(configData);
      setOpenDrafts(openDraftsData.map(convertDraft));
      setActiveDrafts(activeDraftsData.map(convertDraft));
    } catch (err) {
      console.error('Failed to refresh:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [client, convertDraft]);

  // Fetch a specific draft
  const fetchDraft = useCallback(async (draftId: number): Promise<OnChainDraftData | null> => {
    if (!client) return null;

    try {
      const draft = await client.getDraft(draftId);
      if (draft) {
        const converted = convertDraft(draft);
        setCurrentDraft(converted);

        // Also fetch my entry
        if (wallet.publicKey) {
          const entry = await client.getMyEntry(draftId);
          if (entry) {
            setMyEntry(convertEntry(entry));
          } else {
            setMyEntry(null);
          }
        }

        return converted;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch draft:', err);
      return null;
    }
  }, [client, wallet.publicKey, convertDraft, convertEntry]);

  // Create a new draft
  const createDraft = useCallback(async (
    entryFeeSol: number,
    maxPlayers: number,
    numPicks: number
  ): Promise<{ tx: string; draftId: number } | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await client.createDraft(entryFeeSol, maxPlayers, numPicks);
      await refresh();

      return { tx: result.tx, draftId: result.draftId.toNumber() };
    } catch (err) {
      console.error('Failed to create draft:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Join a draft
  const joinDraft = useCallback(async (draftId: number, picks: string[]): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.joinDraft(draftId, picks);
      await fetchDraft(draftId);
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to join draft:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchDraft, refresh]);

  // Claim winnings
  const claimWinnings = useCallback(async (draftId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.claimWinnings(draftId);
      await fetchDraft(draftId);

      return tx;
    } catch (err) {
      console.error('Failed to claim winnings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchDraft]);

  // Cancel draft (only creator, only if no players)
  const cancelDraft = useCallback(async (draftId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.cancelDraft(draftId);
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to cancel draft:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Refund entry
  const refundEntry = useCallback(async (draftId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.refundEntry(draftId);
      await fetchDraft(draftId);

      return tx;
    } catch (err) {
      console.error('Failed to refund entry:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchDraft]);

  // Check if current user can claim winnings
  const canClaim = useMemo(() => {
    if (!currentDraft || !myEntry) return false;
    if (currentDraft.status !== 'settled') return false;
    if (myEntry.claimed) return false;
    return myEntry.finalRank >= 1 && myEntry.finalRank <= 3;
  }, [currentDraft, myEntry]);

  // Calculate my potential winnings
  const myPotentialWinnings = useMemo(() => {
    if (!currentDraft || !myEntry) return 0;
    if (myEntry.finalRank < 1 || myEntry.finalRank > 3) return 0;

    if (myEntry.finalRank === 1) return currentDraft.firstPrize;
    if (myEntry.finalRank === 2) return currentDraft.secondPrize;
    if (myEntry.finalRank === 3) return currentDraft.thirdPrize;
    return 0;
  }, [currentDraft, myEntry]);

  // Check if user has already entered
  const hasEntered = useMemo(() => {
    return myEntry !== null;
  }, [myEntry]);

  // Auto-refresh when client is available
  useEffect(() => {
    if (client) {
      refresh();
    }
  }, [client, refresh]);

  return {
    // State
    config,
    openDrafts,
    activeDrafts,
    currentDraft,
    myEntry,
    isLoading,
    error,
    isConnected: !!client,

    // Actions
    createDraft,
    joinDraft,
    claimWinnings,
    cancelDraft,
    refundEntry,
    fetchDraft,
    refresh,

    // Computed
    canClaim,
    myPotentialWinnings,
    hasEntered,
  };
}
