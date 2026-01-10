// Hook for interacting with the on-chain prediction program

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { BN } from '@coral-xyz/anchor';
import {
  PredictionClient,
  PredictionRound,
  PlayerPosition,
  GameState,
  RoundStatus,
  WinnerSide,
  lamportsToSol,
  scaledToPrice,
} from '@/lib/prediction';

export interface OnChainRoundData {
  roundId: number;
  status: 'betting' | 'locked' | 'settled';
  startPrice: number;
  endPrice: number;
  startTime: number;
  lockTime: number;
  upPool: number;
  downPool: number;
  totalPool: number;
  winner: 'up' | 'down' | 'draw' | null;
}

export interface OnChainPositionData {
  roundId: number;
  side: 'up' | 'down';
  amount: number;
  claimed: boolean;
}

export function usePrediction() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [client, setClient] = useState<PredictionClient | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRound, setCurrentRound] = useState<OnChainRoundData | null>(null);
  const [myPosition, setMyPosition] = useState<OnChainPositionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const newClient = new PredictionClient(connection, wallet);
      setClient(newClient);
    } else {
      setClient(null);
    }
  }, [connection, wallet, wallet.connected, wallet.publicKey]);

  // Convert on-chain round to frontend format
  const convertRound = useCallback((round: PredictionRound): OnChainRoundData => {
    let status: 'betting' | 'locked' | 'settled' = 'betting';
    if (round.status === RoundStatus.Locked) status = 'locked';
    else if (round.status === RoundStatus.Settled) status = 'settled';

    let winner: 'up' | 'down' | 'draw' | null = null;
    if (round.winner === WinnerSide.Up) winner = 'up';
    else if (round.winner === WinnerSide.Down) winner = 'down';
    else if (round.winner === WinnerSide.Draw) winner = 'draw';

    return {
      roundId: round.roundId.toNumber(),
      status,
      startPrice: scaledToPrice(round.startPrice),
      endPrice: scaledToPrice(round.endPrice),
      startTime: round.startTime.toNumber() * 1000, // Convert to ms
      lockTime: round.lockTime.toNumber() * 1000,
      upPool: lamportsToSol(round.upPool),
      downPool: lamportsToSol(round.downPool),
      totalPool: lamportsToSol(round.totalPool),
      winner,
    };
  }, []);

  // Convert on-chain position to frontend format
  const convertPosition = useCallback((position: PlayerPosition): OnChainPositionData => {
    return {
      roundId: position.roundId.toNumber(),
      side: position.side === 'Up' ? 'up' : 'down',
      amount: lamportsToSol(position.amount),
      claimed: position.claimed,
    };
  }, []);

  // Fetch game state and current round
  const refresh = useCallback(async (showLoading = false) => {
    if (!client) return;

    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      const state = await client.getGameState();
      setGameState(state);

      if (state && state.currentRound.toNumber() > 0) {
        const round = await client.getCurrentRound();
        if (round) {
          const converted = convertRound(round);
          setCurrentRound(converted);

          // Fetch my position for this round
          if (wallet.publicKey) {
            const position = await client.getMyPosition(round.roundId);
            if (position) {
              setMyPosition(convertPosition(position));
            } else {
              setMyPosition(null);
            }
          }
        } else {
          // No round found, clear it
          setCurrentRound(null);
          setMyPosition(null);
        }
      } else {
        setCurrentRound(null);
        setMyPosition(null);
      }
    } catch (err) {
      console.error('Failed to refresh:', err);
      // Don't set error on polling failures to avoid spamming UI
      if (showLoading) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [client, wallet.publicKey, convertRound, convertPosition]);

  // Place a bet on-chain
  const placeBet = useCallback(async (side: 'up' | 'down', amountSol: number): Promise<string | null> => {
    if (!client || !currentRound) {
      setError('Not connected or no active round');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.placeBet(currentRound.roundId, side, amountSol);

      // Refresh data after bet
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to place bet:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, currentRound, refresh]);

  // Claim winnings
  const claimWinnings = useCallback(async (roundId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.claimWinnings(roundId);

      // Refresh data after claim
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to claim:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Check if user can claim winnings
  const canClaim = useMemo(() => {
    if (!currentRound || !myPosition) return false;
    if (currentRound.status !== 'settled') return false;
    if (myPosition.claimed) return false;

    // Check if user won
    if (currentRound.winner === 'draw') return true;
    return currentRound.winner === myPosition.side;
  }, [currentRound, myPosition]);

  // Calculate potential winnings
  const potentialWinnings = useMemo(() => {
    if (!currentRound || !myPosition) return 0;
    if (currentRound.status === 'settled') return 0;

    const myPool = myPosition.side === 'up' ? currentRound.upPool : currentRound.downPool;
    const theirPool = myPosition.side === 'up' ? currentRound.downPool : currentRound.upPool;

    if (myPool === 0) return 0;

    // Proportional share of the pool after 10% fee
    const poolAfterFee = currentRound.totalPool * 0.9;
    return (myPosition.amount / myPool) * poolAfterFee;
  }, [currentRound, myPosition]);

  // Auto-refresh when client is available
  useEffect(() => {
    if (client) {
      refresh(true); // Show loading on initial fetch
    }
  }, [client, refresh]);

  // Poll for new rounds every 2 seconds
  useEffect(() => {
    if (!client) return;

    const interval = setInterval(() => {
      refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [client, refresh]);

  return {
    // State
    gameState,
    currentRound,
    myPosition,
    isLoading,
    error,
    isConnected: !!client,

    // Actions
    placeBet,
    claimWinnings,
    refresh,

    // Computed
    canClaim,
    potentialWinnings,
  };
}
