'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getSocket } from '@/lib/socket';
import {
  Battle,
  BattleConfig,
  PositionSide,
  Leverage,
  SignedTradeMessage,
  ReadyCheckResponse,
  ReadyCheckUpdate,
  ReadyCheckCancelled,
} from '@/types';
import bs58 from 'bs58';

interface BattleSettledData {
  battleId: string;
  txSignature: string;
  winnerId: string;
}

interface BattleContextType {
  battle: Battle | null;
  currentPlayer: Battle['players'][0] | undefined;
  isLoading: boolean;
  error: string | null;
  settlementTx: string | null;
  matchmakingStatus: {
    inQueue: boolean;
    position: number;
    estimated: number;
  };
  // Ready check state
  readyCheck: ReadyCheckResponse | null;
  readyCheckStatus: ReadyCheckUpdate | null;
  readyCheckCancelled: ReadyCheckCancelled | null;
  // Actions
  createBattle: (config: BattleConfig) => void;
  joinBattle: (battleId: string) => void;
  queueMatchmaking: (config: BattleConfig) => void;
  startSoloPractice: (config: BattleConfig) => void;
  openPosition: (asset: string, side: PositionSide, leverage: Leverage, size: number) => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  leaveBattle: () => void;
  getTimeRemaining: () => number;
  // Ready check actions
  acceptMatch: () => void;
  declineMatch: () => void;
  clearReadyCheckCancelled: () => void;
}

const BattleContext = createContext<BattleContextType | null>(null);

// Type for wallet signMessage function
type SignMessageFn = ((message: Uint8Array) => Promise<Uint8Array>) | undefined;

export function BattleProvider({
  children,
  walletAddress,
  signMessage,
}: {
  children: ReactNode;
  walletAddress: string | null;
  signMessage?: SignMessageFn;
}) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementTx, setSettlementTx] = useState<string | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<{
    inQueue: boolean;
    position: number;
    estimated: number;
  }>({ inQueue: false, position: 0, estimated: 0 });

  // Ready check state
  const [readyCheck, setReadyCheck] = useState<ReadyCheckResponse | null>(null);
  const [readyCheckStatus, setReadyCheckStatus] = useState<ReadyCheckUpdate | null>(null);
  const [readyCheckCancelled, setReadyCheckCancelled] = useState<ReadyCheckCancelled | null>(null);

  // Track nonce per battle for replay protection
  const nonceRef = useRef<Map<string, number>>(new Map());

  // Get next nonce for a battle
  const getNextNonce = useCallback((battleId: string) => {
    const currentNonce = nonceRef.current.get(battleId) || 0;
    const nextNonce = currentNonce + 1;
    nonceRef.current.set(battleId, nextNonce);
    return nextNonce;
  }, []);

  // Sign a trade message with the wallet
  const signTradeMessage = useCallback(async (
    message: SignedTradeMessage
  ): Promise<{ signature: string } | null> => {
    if (!signMessage || !walletAddress) {
      console.warn('[Battle] Cannot sign trade - wallet not connected or signMessage unavailable');
      return null;
    }

    try {
      const messageBytes = new TextEncoder().encode(JSON.stringify(message));
      const signatureBytes = await signMessage(messageBytes);
      return { signature: bs58.encode(signatureBytes) };
    } catch (err) {
      console.error('[Battle] Failed to sign trade message:', err);
      return null;
    }
  }, [signMessage, walletAddress]);

  useEffect(() => {
    const socket = getSocket();
    console.log('[BattleContext] Setting up socket listeners, socket connected:', socket.connected, 'id:', socket.id);

    const handleBattleUpdate = (updatedBattle: Battle) => {
      console.log('[BattleContext] Received battle_update:', updatedBattle.id, 'status:', updatedBattle.status);
      setBattle(updatedBattle);
      setIsLoading(false);
    };

    const handleBattleStarted = (startedBattle: Battle) => {
      console.log('[BattleContext] Received battle_started:', startedBattle.id, 'status:', startedBattle.status);
      setBattle(startedBattle);
      setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
      setIsLoading(false);
    };

    // Log connection state changes
    socket.on('connect', () => {
      console.log('[BattleContext] Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[BattleContext] Socket disconnected:', reason);
    });

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

    const handleBattleSettled = (data: BattleSettledData) => {
      console.log('[Battle] Settled on-chain:', data.txSignature);
      setSettlementTx(data.txSignature);
    };

    // Ready check handlers
    const handleMatchFound = (data: ReadyCheckResponse) => {
      console.log('[Battle] Match found!', data.battleId);
      setReadyCheck(data);
      setReadyCheckStatus(null);
      setReadyCheckCancelled(null);
      setMatchmakingStatus({ inQueue: false, position: 0, estimated: 0 });
    };

    const handleReadyCheckUpdate = (data: ReadyCheckUpdate) => {
      console.log('[Battle] Ready check update:', data);
      setReadyCheckStatus(data);
    };

    const handleReadyCheckCancelled = (data: ReadyCheckCancelled) => {
      console.log('[Battle] Ready check cancelled:', data.reason);
      setReadyCheck(null);
      setReadyCheckStatus(null);
      setReadyCheckCancelled(data);
      // Auto-clear cancelled notification after 10 seconds
      setTimeout(() => setReadyCheckCancelled(null), 10000);
    };

    socket.on('battle_update', handleBattleUpdate);
    socket.on('battle_started', handleBattleStarted);
    socket.on('battle_ended', handleBattleEnded);
    socket.on('matchmaking_status', handleMatchmakingStatus);
    socket.on('error', handleError);
    socket.on('battle_settled', handleBattleSettled);
    socket.on('match_found', handleMatchFound);
    socket.on('ready_check_update', handleReadyCheckUpdate);
    socket.on('ready_check_cancelled', handleReadyCheckCancelled);

    return () => {
      socket.off('battle_update', handleBattleUpdate);
      socket.off('battle_started', handleBattleStarted);
      socket.off('battle_ended', handleBattleEnded);
      socket.off('matchmaking_status', handleMatchmakingStatus);
      socket.off('error', handleError);
      socket.off('battle_settled', handleBattleSettled);
      socket.off('match_found', handleMatchFound);
      socket.off('ready_check_update', handleReadyCheckUpdate);
      socket.off('ready_check_cancelled', handleReadyCheckCancelled);
    };
  }, []);

  // Register wallet for ready check notifications
  useEffect(() => {
    if (walletAddress) {
      const socket = getSocket();
      socket.emit('register_wallet', walletAddress);
      console.log('[Battle] Registered wallet for notifications:', walletAddress.slice(0, 8));
    }
  }, [walletAddress]);

  // Ready check actions
  const acceptMatch = useCallback(() => {
    if (!readyCheck) {
      console.warn('[Battle] No ready check to accept');
      return;
    }
    const socket = getSocket();
    socket.emit('accept_match', readyCheck.battleId);
    console.log('[Battle] Accepting match:', readyCheck.battleId);
  }, [readyCheck]);

  const declineMatch = useCallback(() => {
    if (!readyCheck) {
      console.warn('[Battle] No ready check to decline');
      return;
    }
    const socket = getSocket();
    socket.emit('decline_match', readyCheck.battleId);
    setReadyCheck(null);
    setReadyCheckStatus(null);
    console.log('[Battle] Declining match:', readyCheck.battleId);
  }, [readyCheck]);

  const clearReadyCheckCancelled = useCallback(() => {
    setReadyCheckCancelled(null);
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
      setSettlementTx(null);
      const socket = getSocket();

      const emitSoloPractice = () => {
        console.log('[Battle] Emitting start_solo_practice, socket connected:', socket.connected, 'id:', socket.id);
        socket.emit('start_solo_practice', {
          config,
          wallet: walletAddress,
        });
        console.log('[Battle] Starting solo practice');
      };

      // If socket is connected, emit immediately. Otherwise wait for connection.
      if (socket.connected) {
        emitSoloPractice();
      } else {
        console.log('[Battle] Socket not connected, waiting for connection...');
        socket.once('connect', emitSoloPractice);
      }
    },
    [walletAddress]
  );

  const openPosition = useCallback(
    async (asset: string, side: PositionSide, leverage: Leverage, size: number) => {
      if (!walletAddress || !battle) {
        setError('Not in a battle');
        return;
      }

      const socket = getSocket();

      // Solo practice mode - no signing needed, just emit unsigned
      const isSoloPractice = battle.config.maxPlayers === 1;
      if (isSoloPractice) {
        socket.emit('open_position', battle.id, asset, side, leverage, size);
        return;
      }

      // PvP mode: If signing is available, sign the trade for trustless settlement
      if (signMessage) {
        const message: SignedTradeMessage = {
          version: 1,
          battleId: battle.id,
          action: 'open',
          asset,
          side,
          leverage,
          size,
          timestamp: Date.now(),
          nonce: getNextNonce(battle.id),
        };

        const signed = await signTradeMessage(message);
        if (signed) {
          socket.emit('open_position_signed', {
            message,
            signature: signed.signature,
            walletAddress,
          });
          return;
        }
        // Fall through to unsigned if signing failed
        console.warn('[Battle] Falling back to unsigned trade');
      }

      // Fallback: unsigned trade (for wallets without signMessage)
      socket.emit('open_position', battle.id, asset, side, leverage, size);
    },
    [walletAddress, battle, signMessage, getNextNonce, signTradeMessage]
  );

  const closePosition = useCallback(
    async (positionId: string) => {
      if (!walletAddress || !battle) {
        setError('Not in a battle');
        return;
      }

      const socket = getSocket();

      // Solo practice mode - no signing needed, just emit unsigned
      const isSoloPractice = battle.config.maxPlayers === 1;
      if (isSoloPractice) {
        socket.emit('close_position', battle.id, positionId);
        return;
      }

      // Find the position to get its details for signing
      const player = battle.players.find(p => p.walletAddress === walletAddress);
      const position = player?.account.positions.find(p => p.id === positionId);

      // PvP mode: If signing is available and we have position details, sign the close
      if (signMessage && position) {
        const message: SignedTradeMessage = {
          version: 1,
          battleId: battle.id,
          action: 'close',
          asset: position.asset,
          side: position.side,
          leverage: position.leverage,
          size: position.size,
          timestamp: Date.now(),
          nonce: getNextNonce(battle.id),
          positionId,
        };

        const signed = await signTradeMessage(message);
        if (signed) {
          socket.emit('close_position_signed', {
            message,
            signature: signed.signature,
            walletAddress,
          });
          return;
        }
        console.warn('[Battle] Falling back to unsigned close');
      }

      // Fallback: unsigned close
      socket.emit('close_position', battle.id, positionId);
    },
    [walletAddress, battle, signMessage, getNextNonce, signTradeMessage]
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
        settlementTx,
        matchmakingStatus,
        readyCheck,
        readyCheckStatus,
        readyCheckCancelled,
        createBattle,
        joinBattle,
        queueMatchmaking,
        startSoloPractice,
        openPosition,
        closePosition,
        leaveBattle,
        getTimeRemaining,
        acceptMatch,
        declineMatch,
        clearReadyCheckCancelled,
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
