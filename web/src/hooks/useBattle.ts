'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { Battle, BattleConfig } from '@/types';

export function useBattle(walletAddress: string | null) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<{
    inQueue: boolean;
    position: number;
    estimated: number;
  }>({ inQueue: false, position: 0, estimated: 0 });

  useEffect(() => {
    const socket = getSocket();

    socket.on('battle_update', (updatedBattle) => {
      setBattle(updatedBattle);
      setIsLoading(false);
    });

    socket.on('battle_started', (startedBattle) => {
      setBattle(startedBattle);
      setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
    });

    socket.on('battle_ended', (endedBattle) => {
      setBattle(endedBattle);
    });

    socket.on('matchmaking_status', (status) => {
      setMatchmakingStatus({
        inQueue: true,
        position: status.position,
        estimated: status.estimated,
      });
    });

    socket.on('error', (message) => {
      setError(message);
      setIsLoading(false);
    });

    return () => {
      socket.off('battle_update');
      socket.off('battle_started');
      socket.off('battle_ended');
      socket.off('matchmaking_status');
      socket.off('error');
    };
  }, []);

  const createBattle = useCallback(
    (config: BattleConfig) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return;
      }

      setIsLoading(true);
      setError(null);
      const socket = getSocket();
      socket.emit('create_battle', config, walletAddress);
    },
    [walletAddress]
  );

  const joinBattle = useCallback(
    (battleId: string) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return;
      }

      setIsLoading(true);
      setError(null);
      const socket = getSocket();
      socket.emit('join_battle', battleId, walletAddress);
    },
    [walletAddress]
  );

  const queueMatchmaking = useCallback(
    (config: BattleConfig) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return;
      }

      setIsLoading(true);
      setError(null);
      const socket = getSocket();
      socket.emit('queue_matchmaking', config, walletAddress);
    },
    [walletAddress]
  );

  const startSoloPractice = useCallback(
    (config: BattleConfig, onChainBattleId?: string) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return;
      }

      setIsLoading(true);
      setError(null);
      const socket = getSocket();
      socket.emit('start_solo_practice', {
        config,
        wallet: walletAddress,
        onChainBattleId,
      });
    },
    [walletAddress]
  );

  const leaveBattle = useCallback(() => {
    if (battle) {
      const socket = getSocket();
      socket.emit('leave_battle', battle.id);
      setBattle(null);
    }
    setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
  }, [battle]);

  // Get current player's data
  const currentPlayer = battle?.players.find(
    (p) => p.walletAddress === walletAddress
  );

  // Calculate time remaining
  const getTimeRemaining = useCallback(() => {
    if (!battle || battle.status !== 'active' || !battle.startedAt) {
      return 0;
    }
    const elapsed = (Date.now() - battle.startedAt) / 1000;
    return Math.max(0, battle.config.duration - elapsed);
  }, [battle]);

  return {
    battle,
    currentPlayer,
    isLoading,
    error,
    matchmakingStatus,
    createBattle,
    joinBattle,
    queueMatchmaking,
    startSoloPractice,
    leaveBattle,
    getTimeRemaining,
  };
}
