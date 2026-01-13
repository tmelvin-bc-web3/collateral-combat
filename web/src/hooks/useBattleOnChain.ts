// Hook for interacting with the on-chain battle program

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  BattleClient,
  Battle,
  SpectatorBet,
  Config,
  BattleStatus,
  PlayerSide,
  lamportsToSol,
  isBettingOpen,
  getTimeRemaining,
} from '@/lib/battle';

export interface OnChainBattleData {
  id: number;
  creator: string;
  opponent: string;
  entryFee: number;
  status: 'waiting' | 'active' | 'settled' | 'cancelled';
  winner: string | null;
  playerPool: number;
  spectatorPoolCreator: number;
  spectatorPoolOpponent: number;
  bettingLocked: boolean;
  createdAt: number;
  startedAt: number;
  endsAt: number;
  timeRemaining: number;
  canBet: boolean;
}

export interface OnChainSpectatorBetData {
  battleId: number;
  backedPlayer: 'creator' | 'opponent';
  amount: number;
  claimed: boolean;
}

export function useBattleOnChain() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [client, setClient] = useState<BattleClient | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [openBattles, setOpenBattles] = useState<OnChainBattleData[]>([]);
  const [activeBattles, setActiveBattles] = useState<OnChainBattleData[]>([]);
  const [currentBattle, setCurrentBattle] = useState<OnChainBattleData | null>(null);
  const [mySpectatorBet, setMySpectatorBet] = useState<OnChainSpectatorBetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      const newClient = new BattleClient(connection, wallet);
      setClient(newClient);
    } else {
      setClient(null);
    }
  }, [connection, wallet, wallet.connected, wallet.publicKey]);

  // Convert on-chain battle to frontend format
  const convertBattle = useCallback((battle: Battle): OnChainBattleData => {
    let status: 'waiting' | 'active' | 'settled' | 'cancelled' = 'waiting';
    if (battle.status === BattleStatus.Active) status = 'active';
    else if (battle.status === BattleStatus.Settled) status = 'settled';
    else if (battle.status === BattleStatus.Cancelled) status = 'cancelled';

    const winner = battle.winner.equals(PublicKey.default) ? null : battle.winner.toBase58();

    return {
      id: battle.id.toNumber(),
      creator: battle.creator.toBase58(),
      opponent: battle.opponent.equals(PublicKey.default) ? '' : battle.opponent.toBase58(),
      entryFee: lamportsToSol(battle.entryFee),
      status,
      winner,
      playerPool: lamportsToSol(battle.playerPool),
      spectatorPoolCreator: lamportsToSol(battle.spectatorPoolCreator),
      spectatorPoolOpponent: lamportsToSol(battle.spectatorPoolOpponent),
      bettingLocked: battle.bettingLocked,
      createdAt: battle.createdAt.toNumber() * 1000,
      startedAt: battle.startedAt.toNumber() * 1000,
      endsAt: battle.endsAt.toNumber() * 1000,
      timeRemaining: getTimeRemaining(battle.endsAt),
      canBet: isBettingOpen(battle),
    };
  }, []);

  // Convert on-chain spectator bet to frontend format
  const convertSpectatorBet = useCallback((bet: SpectatorBet): OnChainSpectatorBetData => {
    return {
      battleId: bet.battleId.toNumber(),
      backedPlayer: bet.backedPlayer === PlayerSide.Creator ? 'creator' : 'opponent',
      amount: lamportsToSol(bet.amount),
      claimed: bet.claimed,
    };
  }, []);

  // Fetch all data
  const refresh = useCallback(async () => {
    if (!client) return;

    try {
      setIsLoading(true);
      setError(null);

      const [configData, openBattlesData, activeBattlesData] = await Promise.all([
        client.getConfig(),
        client.getOpenBattles(),
        client.getActiveBattles(),
      ]);

      setConfig(configData);
      setOpenBattles(openBattlesData.map(convertBattle));
      setActiveBattles(activeBattlesData.map(convertBattle));
    } catch (err) {
      console.error('Failed to refresh:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [client, convertBattle]);

  // Fetch a specific battle
  const fetchBattle = useCallback(async (battleId: number): Promise<OnChainBattleData | null> => {
    if (!client) return null;

    try {
      const battle = await client.getBattle(battleId);
      if (battle) {
        const converted = convertBattle(battle);
        setCurrentBattle(converted);

        // Also fetch my spectator bet if active
        if (wallet.publicKey && battle.status === BattleStatus.Active) {
          const bet = await client.getMySpectatorBet(battleId);
          if (bet) {
            setMySpectatorBet(convertSpectatorBet(bet));
          } else {
            setMySpectatorBet(null);
          }
        }

        return converted;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch battle:', err);
      return null;
    }
  }, [client, wallet.publicKey, convertBattle, convertSpectatorBet]);

  // Create a new battle
  const createBattle = useCallback(async (entryFeeSol: number): Promise<{ tx: string; battleId: number; battlePDA: string } | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await client.createBattle(entryFeeSol);

      // Get the battle PDA for on-chain tracking
      const [battlePDA] = client.getBattlePDA(result.battleId);
      console.log('[OnChain] Battle created:', {
        tx: result.tx,
        battleId: result.battleId.toNumber(),
        battlePDA: battlePDA.toBase58(),
      });

      await refresh();

      return {
        tx: result.tx,
        battleId: result.battleId.toNumber(),
        battlePDA: battlePDA.toBase58(),
      };
    } catch (err) {
      console.error('Failed to create battle:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Join an existing battle
  const joinBattle = useCallback(async (battleId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.joinBattle(battleId);
      await fetchBattle(battleId);
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to join battle:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchBattle, refresh]);

  // Place spectator bet
  const placeSpectatorBet = useCallback(async (
    battleId: number,
    side: 'creator' | 'opponent',
    amountSol: number
  ): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const playerSide = side === 'creator' ? PlayerSide.Creator : PlayerSide.Opponent;
      const tx = await client.placeSpectatorBet(battleId, playerSide, amountSol);
      await fetchBattle(battleId);

      return tx;
    } catch (err) {
      console.error('Failed to place spectator bet:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchBattle]);

  // Claim player prize (for winner)
  const claimPlayerPrize = useCallback(async (battleId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.claimPlayerPrize(battleId);
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to claim player prize:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Claim spectator winnings
  const claimSpectatorWinnings = useCallback(async (battleId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.claimSpectatorWinnings(battleId);
      await fetchBattle(battleId);

      return tx;
    } catch (err) {
      console.error('Failed to claim spectator winnings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, fetchBattle]);

  // Cancel battle (only creator, only if waiting)
  const cancelBattle = useCallback(async (battleId: number): Promise<string | null> => {
    if (!client) {
      setError('Not connected');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      const tx = await client.cancelBattle(battleId);
      await refresh();

      return tx;
    } catch (err) {
      console.error('Failed to cancel battle:', err);
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, refresh]);

  // Check if current user can claim player prize
  const canClaimPlayerPrize = useMemo(() => {
    if (!currentBattle || !wallet.publicKey) return false;
    if (currentBattle.status !== 'settled') return false;
    return currentBattle.winner === wallet.publicKey.toBase58();
  }, [currentBattle, wallet.publicKey]);

  // Check if current user can claim spectator winnings
  const canClaimSpectatorWinnings = useMemo(() => {
    if (!currentBattle || !mySpectatorBet) return false;
    if (currentBattle.status !== 'settled') return false;
    if (mySpectatorBet.claimed) return false;

    // Check if backed the winner
    const backedCreator = mySpectatorBet.backedPlayer === 'creator';
    const creatorWon = currentBattle.winner === currentBattle.creator;
    return backedCreator === creatorWon;
  }, [currentBattle, mySpectatorBet]);

  // Calculate potential spectator winnings
  const calculateSpectatorWinnings = useMemo(() => {
    if (!currentBattle || !mySpectatorBet) return 0;

    const totalPool = currentBattle.spectatorPoolCreator + currentBattle.spectatorPoolOpponent;
    const poolAfterFee = totalPool * 0.95; // 5% spectator rake
    const myPool = mySpectatorBet.backedPlayer === 'creator'
      ? currentBattle.spectatorPoolCreator
      : currentBattle.spectatorPoolOpponent;

    if (myPool === 0) return 0;
    return (mySpectatorBet.amount / myPool) * poolAfterFee;
  }, [currentBattle, mySpectatorBet]);

  // Auto-refresh when client is available
  useEffect(() => {
    if (client) {
      refresh();
    }
  }, [client, refresh]);

  return {
    // State
    config,
    openBattles,
    activeBattles,
    currentBattle,
    mySpectatorBet,
    isLoading,
    error,
    isConnected: !!client,

    // Actions
    createBattle,
    joinBattle,
    placeSpectatorBet,
    claimPlayerPrize,
    claimSpectatorWinnings,
    cancelBattle,
    fetchBattle,
    refresh,

    // Computed
    canClaimPlayerPrize,
    canClaimSpectatorWinnings,
    calculateSpectatorWinnings,
  };
}
