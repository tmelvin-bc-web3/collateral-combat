'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getSocket } from '@/lib/socket';
import { Battle, BattleConfig, PositionSide, Leverage, SignedTradeMessage } from '@/types';
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
  createBattle: (config: BattleConfig) => void;
  joinBattle: (battleId: string) => void;
  queueMatchmaking: (config: BattleConfig) => void;
  startSoloPractice: (config: BattleConfig, onChainBattleId?: string) => void;
  openPosition: (asset: string, side: PositionSide, leverage: Leverage, size: number) => Promise<void>;
  closePosition: (positionId: string) => Promise<void>;
  leaveBattle: () => void;
  getTimeRemaining: () => number;
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

    const handleBattleSettled = (data: BattleSettledData) => {
      console.log('[Battle] Settled on-chain:', data.txSignature);
      setSettlementTx(data.txSignature);
    };

    socket.on('battle_update', handleBattleUpdate);
    socket.on('battle_started', handleBattleStarted);
    socket.on('battle_ended', handleBattleEnded);
    socket.on('matchmaking_status', handleMatchmakingStatus);
    socket.on('error', handleError);
    socket.on('battle_settled', handleBattleSettled);

    return () => {
      socket.off('battle_update', handleBattleUpdate);
      socket.off('battle_started', handleBattleStarted);
      socket.off('battle_ended', handleBattleEnded);
      socket.off('matchmaking_status', handleMatchmakingStatus);
      socket.off('error', handleError);
      socket.off('battle_settled', handleBattleSettled);
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
      setSettlementTx(null);
      const socket = getSocket();
      socket.emit('start_solo_practice', {
        config,
        wallet: walletAddress,
        onChainBattleId,
      });
      console.log('[Battle] Starting solo practice', onChainBattleId ? `(on-chain: ${onChainBattleId})` : '(off-chain)');
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

      // If signing is available, sign the trade for trustless settlement
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

      // Find the position to get its details for signing
      const player = battle.players.find(p => p.walletAddress === walletAddress);
      const position = player?.account.positions.find(p => p.id === positionId);

      // If signing is available and we have position details, sign the close
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
