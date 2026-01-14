// Session Betting Hook
// Provides React integration for the session betting program

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import {
  SessionBettingClient,
  UserBalance,
  BettingRound,
  BettingPool,
  PlayerPosition,
  BetSide,
  lamportsToSol,
  solToLamports,
  MAX_SESSION_DURATION_SECONDS,
} from '@/lib/session-betting';

// Local storage key for session keypair
const SESSION_KEY_STORAGE = 'session_betting_session_key';

interface SessionKeyData {
  secretKey: number[];
  validUntil: number;
}

export function useSessionBetting() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null);
  const [sessionValidUntil, setSessionValidUntil] = useState<number | null>(null);

  // Create client
  const client = useMemo(() => {
    if (!wallet.publicKey) return null;
    return new SessionBettingClient(connection, wallet);
  }, [connection, wallet]);

  // Load session from localStorage on mount
  useEffect(() => {
    if (!wallet.publicKey) return;

    try {
      const stored = localStorage.getItem(`${SESSION_KEY_STORAGE}_${wallet.publicKey.toBase58()}`);
      if (stored) {
        const data: SessionKeyData = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);

        // Check if session is still valid
        if (data.validUntil > now) {
          const keypair = Keypair.fromSecretKey(Uint8Array.from(data.secretKey));
          setSessionKeypair(keypair);
          setSessionValidUntil(data.validUntil);
        } else {
          // Clear expired session
          localStorage.removeItem(`${SESSION_KEY_STORAGE}_${wallet.publicKey.toBase58()}`);
        }
      }
    } catch (e) {
      console.error('Failed to load session from storage:', e);
    }
  }, [wallet.publicKey]);

  // Fetch user balance
  const fetchBalance = useCallback(async () => {
    if (!client) return;

    try {
      const balance = await client.getUserBalance();
      setUserBalance(balance);
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    }
  }, [client]);

  // Auto-fetch balance on wallet connect
  useEffect(() => {
    if (wallet.publicKey && client) {
      fetchBalance();
    }
  }, [wallet.publicKey, client, fetchBalance]);

  // Deposit SOL
  const deposit = useCallback(async (solAmount: number) => {
    if (!client || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const lamports = solToLamports(solAmount);
      const tx = await client.deposit(lamports);
      await fetchBalance();
      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Deposit failed';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey, fetchBalance]);

  // Withdraw SOL
  const withdraw = useCallback(async (solAmount: number) => {
    if (!client || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const lamports = solToLamports(solAmount);
      const tx = await client.withdraw(lamports);
      await fetchBalance();
      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Withdraw failed';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey, fetchBalance]);

  // Create session (valid for 24 hours by default)
  const createSession = useCallback(async (durationHours: number = 24) => {
    if (!client || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate valid until timestamp (capped at MAX_SESSION_DURATION)
      const durationSeconds = Math.min(
        durationHours * 60 * 60,
        MAX_SESSION_DURATION_SECONDS
      );
      const validUntil = Math.floor(Date.now() / 1000) + durationSeconds;

      const { tx, sessionKeypair: newKeypair } = await client.createSession(validUntil);

      // Store in localStorage
      const data: SessionKeyData = {
        secretKey: Array.from(newKeypair.secretKey),
        validUntil,
      };
      localStorage.setItem(
        `${SESSION_KEY_STORAGE}_${wallet.publicKey.toBase58()}`,
        JSON.stringify(data)
      );

      setSessionKeypair(newKeypair);
      setSessionValidUntil(validUntil);

      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to create session';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey]);

  // Revoke session
  const revokeSession = useCallback(async () => {
    if (!client || !wallet.publicKey || !sessionKeypair) {
      throw new Error('No active session');
    }

    setIsLoading(true);
    setError(null);

    try {
      const tx = await client.revokeSession(sessionKeypair.publicKey);

      // Clear from localStorage
      localStorage.removeItem(`${SESSION_KEY_STORAGE}_${wallet.publicKey.toBase58()}`);

      setSessionKeypair(null);
      setSessionValidUntil(null);

      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to revoke session';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey, sessionKeypair]);

  // Place bet (uses session key if available)
  const placeBet = useCallback(async (roundId: number, side: BetSide, solAmount: number) => {
    if (!client || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      const lamports = solToLamports(solAmount);
      let tx: string;

      // Use session key if available and valid
      if (sessionKeypair && sessionValidUntil && sessionValidUntil > Math.floor(Date.now() / 1000)) {
        tx = await client.placeBetWithSession(
          roundId,
          side,
          lamports,
          sessionKeypair,
          wallet.publicKey
        );
      } else {
        // Fall back to wallet signature
        tx = await client.placeBet(roundId, side, lamports);
      }

      await fetchBalance();
      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to place bet';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey, sessionKeypair, sessionValidUntil, fetchBalance]);

  // Claim winnings (uses session key if available)
  const claimWinnings = useCallback(async (roundId: number) => {
    if (!client || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      let tx: string;

      if (sessionKeypair && sessionValidUntil && sessionValidUntil > Math.floor(Date.now() / 1000)) {
        tx = await client.claimWinningsWithSession(roundId, sessionKeypair, wallet.publicKey);
      } else {
        tx = await client.claimWinnings(roundId);
      }

      await fetchBalance();
      return tx;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to claim winnings';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet.publicKey, sessionKeypair, sessionValidUntil, fetchBalance]);

  // Get current round
  const getCurrentRound = useCallback(async (): Promise<BettingRound | null> => {
    if (!client) return null;
    return client.getCurrentRound();
  }, [client]);

  // Get pool for round
  const getPool = useCallback(async (roundId: number): Promise<BettingPool | null> => {
    if (!client) return null;
    return client.getPool(roundId);
  }, [client]);

  // Get user position for round
  const getPosition = useCallback(async (roundId: number): Promise<PlayerPosition | null> => {
    if (!client || !wallet.publicKey) return null;
    return client.getPosition(roundId, wallet.publicKey);
  }, [client, wallet.publicKey]);

  // Check if session is valid
  const hasValidSession = useMemo(() => {
    if (!sessionKeypair || !sessionValidUntil) return false;
    return sessionValidUntil > Math.floor(Date.now() / 1000);
  }, [sessionKeypair, sessionValidUntil]);

  // Get balance in SOL
  const balanceInSol = useMemo(() => {
    if (!userBalance) return 0;
    return lamportsToSol(userBalance.balance);
  }, [userBalance]);

  return {
    // State
    isLoading,
    error,
    userBalance,
    balanceInSol,
    hasValidSession,
    sessionValidUntil,

    // Actions
    deposit,
    withdraw,
    createSession,
    revokeSession,
    placeBet,
    claimWinnings,
    fetchBalance,

    // Queries
    getCurrentRound,
    getPool,
    getPosition,
  };
}
