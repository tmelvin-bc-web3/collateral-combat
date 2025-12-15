'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import {
  UserProgression,
  XpHistoryEntry,
  UserPerk,
  UserCosmetic,
  XpGainEvent,
  LevelUpEvent,
} from '@/types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ProgressionContextValue {
  // State
  progression: UserProgression | null;
  perks: UserPerk[];
  cosmetics: UserCosmetic[];
  xpHistory: XpHistoryEntry[];
  activeRake: number;
  isLoading: boolean;

  // Level-up modal state
  levelUpData: LevelUpEvent | null;
  dismissLevelUp: () => void;

  // XP toast state
  xpGain: XpGainEvent | null;
  dismissXpGain: () => void;

  // Actions
  fetchProgression: () => Promise<void>;
  fetchXpHistory: (limit?: number) => Promise<void>;
  activatePerk: (perkId: number) => Promise<UserPerk | null>;
}

const ProgressionContext = createContext<ProgressionContextValue | null>(null);

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  // Core state
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [perks, setPerks] = useState<UserPerk[]>([]);
  const [cosmetics, setCosmetics] = useState<UserCosmetic[]>([]);
  const [xpHistory, setXpHistory] = useState<XpHistoryEntry[]>([]);
  const [activeRake, setActiveRake] = useState(10); // Default 10% rake
  const [isLoading, setIsLoading] = useState(false);

  // UI state for toasts/modals
  const [levelUpData, setLevelUpData] = useState<LevelUpEvent | null>(null);
  const [xpGain, setXpGain] = useState<XpGainEvent | null>(null);

  // Dismiss handlers
  const dismissLevelUp = useCallback(() => setLevelUpData(null), []);
  const dismissXpGain = useCallback(() => setXpGain(null), []);

  // Fetch progression data
  const fetchProgression = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const [progressionRes, perksRes, cosmeticsRes, rakeRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/progression/${walletAddress}`),
        fetch(`${BACKEND_URL}/api/progression/${walletAddress}/perks`),
        fetch(`${BACKEND_URL}/api/progression/${walletAddress}/cosmetics`),
        fetch(`${BACKEND_URL}/api/progression/${walletAddress}/rake`),
      ]);

      if (progressionRes.ok) {
        const data = await progressionRes.json();
        setProgression(data);
      }

      if (perksRes.ok) {
        const data = await perksRes.json();
        setPerks(data);
      }

      if (cosmeticsRes.ok) {
        const data = await cosmeticsRes.json();
        setCosmetics(data);
      }

      if (rakeRes.ok) {
        const data = await rakeRes.json();
        setActiveRake(data.rakePercent);
      }
    } catch (error) {
      console.error('Failed to fetch progression:', error);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch XP history
  const fetchXpHistory = useCallback(async (limit: number = 20) => {
    if (!walletAddress) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/progression/${walletAddress}/history?limit=${limit}`
      );
      if (res.ok) {
        const data = await res.json();
        setXpHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch XP history:', error);
    }
  }, [walletAddress]);

  // Activate a perk
  const activatePerk = useCallback(async (perkId: number): Promise<UserPerk | null> => {
    if (!walletAddress) return null;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/progression/${walletAddress}/perks/${perkId}/activate`,
        { method: 'POST' }
      );

      if (res.ok) {
        const perk = await res.json();
        // Refresh perks and rake
        const [perksRes, rakeRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/progression/${walletAddress}/perks`),
          fetch(`${BACKEND_URL}/api/progression/${walletAddress}/rake`),
        ]);

        if (perksRes.ok) {
          setPerks(await perksRes.json());
        }
        if (rakeRes.ok) {
          const data = await rakeRes.json();
          setActiveRake(data.rakePercent);
        }

        return perk;
      }
    } catch (error) {
      console.error('Failed to activate perk:', error);
    }

    return null;
  }, [walletAddress]);

  // Subscribe to WebSocket events when wallet connects
  useEffect(() => {
    // Guard against SSR
    if (typeof window === 'undefined') return;

    if (!walletAddress) {
      // Reset state when wallet disconnects
      setProgression(null);
      setPerks([]);
      setCosmetics([]);
      setXpHistory([]);
      setActiveRake(10);
      return;
    }

    // Fetch initial data (errors handled inside)
    fetchProgression();

    // Subscribe to real-time updates - wrapped in try-catch for resilience
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
      socket.emit('subscribe_progression', walletAddress);
    } catch (err) {
      console.error('Failed to initialize progression socket:', err);
      return;
    }

    // Handle progression update
    const handleProgressionUpdate = (data: UserProgression) => {
      setProgression(data);
    };

    // Handle XP gain - show toast
    const handleXpGain = (data: XpGainEvent) => {
      setXpGain(data);
      // Update progression total
      setProgression(prev => prev ? { ...prev, totalXp: data.newTotal } : null);
      // Auto-dismiss after 3 seconds
      setTimeout(() => setXpGain(null), 3000);
    };

    // Handle level up - show celebration modal
    const handleLevelUp = (data: LevelUpEvent) => {
      setLevelUpData(data);
      // Refresh all data after level up
      fetchProgression();
    };

    // Handle perk activation
    const handlePerkActivated = (perk: UserPerk) => {
      setPerks(prev => prev.map(p => p.id === perk.id ? perk : p));
      // Update rake based on perk type
      if (perk.perkType === 'rake_9') setActiveRake(9);
      else if (perk.perkType === 'rake_8') setActiveRake(8);
      else if (perk.perkType === 'rake_7') setActiveRake(7);
    };

    // Handle perk expiration
    const handlePerkExpired = (data: { perkId: number }) => {
      setPerks(prev => prev.filter(p => p.id !== data.perkId));
      setActiveRake(10); // Reset to default
    };

    socket.on('progression_update', handleProgressionUpdate);
    socket.on('xp_gained', handleXpGain);
    socket.on('level_up', handleLevelUp);
    socket.on('perk_activated', handlePerkActivated);
    socket.on('perk_expired', handlePerkExpired);

    return () => {
      if (socket) {
        try {
          socket.emit('unsubscribe_progression', walletAddress);
          socket.off('progression_update', handleProgressionUpdate);
          socket.off('xp_gained', handleXpGain);
          socket.off('level_up', handleLevelUp);
          socket.off('perk_activated', handlePerkActivated);
          socket.off('perk_expired', handlePerkExpired);
        } catch (err) {
          console.error('Failed to cleanup progression socket:', err);
        }
      }
    };
  }, [walletAddress, fetchProgression]);

  return (
    <ProgressionContext.Provider
      value={{
        progression,
        perks,
        cosmetics,
        xpHistory,
        activeRake,
        isLoading,
        levelUpData,
        dismissLevelUp,
        xpGain,
        dismissXpGain,
        fetchProgression,
        fetchXpHistory,
        activatePerk,
      }}
    >
      {children}
    </ProgressionContext.Provider>
  );
}

// Default values for when context is not available (graceful fallback)
const defaultContextValue: ProgressionContextValue = {
  progression: null,
  perks: [],
  cosmetics: [],
  xpHistory: [],
  activeRake: 10,
  isLoading: false,
  levelUpData: null,
  dismissLevelUp: () => {},
  xpGain: null,
  dismissXpGain: () => {},
  fetchProgression: async () => {},
  fetchXpHistory: async () => {},
  activatePerk: async () => null,
};

export function useProgressionContext() {
  const context = useContext(ProgressionContext);
  // Return default values instead of throwing - allows graceful degradation
  if (!context) {
    return defaultContextValue;
  }
  return context;
}
