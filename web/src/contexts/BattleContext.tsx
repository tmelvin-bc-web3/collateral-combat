'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSocket } from '@/lib/socket';
import { Battle, BattleConfig, PositionSide, Leverage } from '@/types';

interface BattleContextType {
  battle: Battle | null;
  currentPlayer: Battle['players'][0] | undefined;
  isLoading: boolean;
  error: string | null;
  matchmakingStatus: {
    inQueue: boolean;
    position: number;
    estimated: number;
  };
  createBattle: (config: BattleConfig) => void;
  joinBattle: (battleId: string) => void;
  queueMatchmaking: (config: BattleConfig) => void;
  startSoloPractice: (config: BattleConfig) => void;
  openPosition: (asset: string, side: PositionSide, leverage: Leverage, size: number) => void;
  closePosition: (positionId: string) => void;
  leaveBattle: () => void;
  getTimeRemaining: () => number;
}

const BattleContext = createContext<BattleContextType | null>(null);

export function BattleProvider({
  children,
  walletAddress
}: {
  children: ReactNode;
  walletAddress: string | null;
}) {
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

    const handleBattleUpdate = (updatedBattle: Battle) => {
      setBattle(updatedBattle);
      setIsLoading(false);
    };

    const handleBattleStarted = (startedBattle: Battle) => {
      setBattle(startedBattle);
      setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
      setIsLoading(false);
    };

    const handleBattleEnded = (endedBattle: Battle) => {
      setBattle(endedBattle);
    };

    const handleMatchmakingStatus = (status: { position: number; estimated: number }) => {
      setMatchmakingStatus({
        inQueue: true,
        position: status.position,
        estimated: status.estimated,
      });
    };

    const handleError = (message: string) => {
      setError(message);
      setIsLoading(false);
      setTimeout(() => setError(null), 3000);
    };

    socket.on('battle_update', handleBattleUpdate);
    socket.on('battle_started', handleBattleStarted);
    socket.on('battle_ended', handleBattleEnded);
    socket.on('matchmaking_status', handleMatchmakingStatus);
    socket.on('error', handleError);

    return () => {
      socket.off('battle_update', handleBattleUpdate);
      socket.off('battle_started', handleBattleStarted);
      socket.off('battle_ended', handleBattleEnded);
      socket.off('matchmaking_status', handleMatchmakingStatus);
      socket.off('error', handleError);
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
    (config: BattleConfig) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return;
      }
      setIsLoading(true);
      setError(null);
      const socket = getSocket();
      socket.emit('start_solo_practice', config, walletAddress);
    },
    [walletAddress]
  );

  const openPosition = useCallback(
    (asset: string, side: PositionSide, leverage: Leverage, size: number) => {
      if (!walletAddress || !battle) {
        setError('Not in a battle');
        return;
      }
      const socket = getSocket();
      socket.emit('open_position', battle.id, asset, side, leverage, size);
    },
    [walletAddress, battle]
  );

  const closePosition = useCallback(
    (positionId: string) => {
      if (!walletAddress || !battle) {
        setError('Not in a battle');
        return;
      }
      const socket = getSocket();
      socket.emit('close_position', battle.id, positionId);
    },
    [walletAddress, battle]
  );

  const leaveBattle = useCallback(() => {
    if (battle) {
      const socket = getSocket();
      socket.emit('leave_battle', battle.id);
      setBattle(null);
    }
    setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
  }, [battle]);

  const currentPlayer = battle?.players.find(
    (p) => p.walletAddress === walletAddress
  );

  const getTimeRemaining = useCallback(() => {
    if (!battle || battle.status !== 'active' || !battle.startedAt) {
      return 0;
    }
    const elapsed = (Date.now() - battle.startedAt) / 1000;
    return Math.max(0, battle.config.duration - elapsed);
  }, [battle]);

  return (
    <BattleContext.Provider
      value={{
        battle,
        currentPlayer,
        isLoading,
        error,
        matchmakingStatus,
        createBattle,
        joinBattle,
        queueMatchmaking,
        startSoloPractice,
        openPosition,
        closePosition,
        leaveBattle,
        getTimeRemaining,
      }}
    >
      {children}
    </BattleContext.Provider>
  );
}

export function useBattleContext() {
  const context = useContext(BattleContext);
  if (!context) {
    throw new Error('useBattleContext must be used within a BattleProvider');
  }
  return context;
}
