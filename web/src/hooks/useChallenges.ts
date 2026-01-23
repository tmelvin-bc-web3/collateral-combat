'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';

interface Challenge {
  id: string;
  code: string;
  challengerWallet: string;
  challengerUsername?: string;
  entryFee: number;
  duration: number;
  leverage: number;
  expiresAt: number;
  isOpen: boolean;
  targetWallet?: string;
}

interface UseChallengesOptions {
  minFee?: number;
  maxFee?: number;
  excludeWallet?: string;
  autoRefresh?: boolean;
}

export function useChallenges(options: UseChallengesOptions = {}) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [directChallenges, setDirectChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.minFee !== undefined) params.set('minFee', options.minFee.toString());
      if (options.maxFee !== undefined) params.set('maxFee', options.maxFee.toString());
      if (options.excludeWallet) params.set('wallet', options.excludeWallet);

      const res = await fetch(`${BACKEND_URL}/api/challenges?${params}`);
      if (!res.ok) throw new Error('Failed to fetch challenges');
      const data = await res.json();

      // Map backend challengeCode to code for UI consistency
      const mappedChallenges = (data.challenges || []).map((c: any) => ({
        id: c.id,
        code: c.challengeCode,
        challengerWallet: c.challengerWallet,
        challengerUsername: c.challengerUsername,
        entryFee: c.entryFee,
        duration: c.duration,
        leverage: c.leverage,
        expiresAt: c.expiresAt,
        isOpen: c.isOpen,
        targetWallet: c.targetWallet,
      }));
      setChallenges(mappedChallenges);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [options.minFee, options.maxFee, options.excludeWallet]);

  const fetchDirectChallenges = useCallback(async (wallet: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/challenges/direct/${wallet}`);
      if (!res.ok) throw new Error('Failed to fetch direct challenges');
      const data = await res.json();

      // Map backend challengeCode to code for UI consistency
      const mappedChallenges = (data.challenges || []).map((c: any) => ({
        id: c.id,
        code: c.challengeCode,
        challengerWallet: c.challengerWallet,
        challengerUsername: c.challengerUsername,
        entryFee: c.entryFee,
        duration: c.duration,
        leverage: c.leverage,
        expiresAt: c.expiresAt,
        isOpen: c.isOpen,
        targetWallet: c.targetWallet,
      }));
      setDirectChallenges(mappedChallenges);
    } catch (err) {
      console.error('Error fetching direct challenges:', err);
    }
  }, []);

  const createChallenge = useCallback(async (params: {
    challengerWallet: string;
    entryFee: number;
    leverage: number;
    duration: number;
    targetWallet?: string;
  }) => {
    const res = await fetch(`${BACKEND_URL}/api/challenges/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create challenge');
    }
    return res.json();
  }, []);

  // Accept challenge via WebSocket (returns battle info for ready check)
  const acceptChallenge = useCallback((code: string, walletAddress: string): Promise<{ battleId: string }> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('accept_challenge' as any, { code, walletAddress });

      const handleAccepted = (data: { battleId: string }) => {
        socket.off('challenge_accepted', handleAccepted);
        socket.off('challenge_error' as any, handleError);
        resolve(data);
      };

      const handleError = (data: { error: string }) => {
        socket.off('challenge_accepted', handleAccepted);
        socket.off('challenge_error' as any, handleError);
        reject(new Error(data.error));
      };

      socket.on('challenge_accepted', handleAccepted);
      socket.on('challenge_error' as any, handleError);

      // Timeout after 10 seconds
      setTimeout(() => {
        socket.off('challenge_accepted', handleAccepted);
        socket.off('challenge_error' as any, handleError);
        reject(new Error('Challenge acceptance timed out'));
      }, 10000);
    });
  }, []);

  // Subscribe to WebSocket events
  useEffect(() => {
    const socket = getSocket();
    socket.emit('subscribe_challenges' as any);

    const handleNewChallenge = (data: { challenge: any }) => {
      const c = data.challenge;
      const mappedChallenge: Challenge = {
        id: c.id,
        code: c.code || c.challengeCode,
        challengerWallet: c.challengerWallet,
        challengerUsername: c.challengerUsername,
        entryFee: c.entryFee,
        duration: c.duration,
        leverage: c.leverage,
        expiresAt: c.expiresAt,
        isOpen: c.isOpen ?? true,
        targetWallet: c.targetWallet,
      };
      setChallenges(prev => [mappedChallenge, ...prev]);
    };

    const handleDirectChallenge = (data: { challenge: any }) => {
      const c = data.challenge;
      const mappedChallenge: Challenge = {
        id: c.id,
        code: c.code || c.challengeCode,
        challengerWallet: c.challengerWallet,
        challengerUsername: c.challengerUsername,
        entryFee: c.entryFee,
        duration: c.duration,
        leverage: c.leverage,
        expiresAt: c.expiresAt,
        isOpen: c.isOpen ?? false,
        targetWallet: c.targetWallet,
      };
      setDirectChallenges(prev => [mappedChallenge, ...prev]);
    };

    socket.on('challenge_created' as any, handleNewChallenge);
    socket.on('direct_challenge_received' as any, handleDirectChallenge);

    return () => {
      socket.emit('unsubscribe_challenges' as any);
      socket.off('challenge_created' as any, handleNewChallenge);
      socket.off('direct_challenge_received' as any, handleDirectChallenge);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!options.autoRefresh) return;
    const interval = setInterval(fetchChallenges, 30000);
    return () => clearInterval(interval);
  }, [fetchChallenges, options.autoRefresh]);

  return {
    challenges,
    directChallenges,
    loading,
    error,
    refresh: fetchChallenges,
    fetchDirectChallenges,
    createChallenge,
    acceptChallenge,
  };
}
