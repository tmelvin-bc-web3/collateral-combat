'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { UserProfile, ProfilePictureType } from '@/types';
import { useProfile } from '@/hooks/useProfile';
import {
  getCachedProfile,
  setCachedProfile,
  setCachedProfiles,
} from '@/lib/profileStorage';
import { BACKEND_URL } from '@/config/api';


interface ProfileContextValue {
  ownProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  needsSetup: boolean;
  completeSetup: () => void;
  updateProfile: (updates: {
    pfpType: ProfilePictureType;
    presetId?: string;
    nftMint?: string;
    nftImageUrl?: string;
    twitterHandle?: string;
    username?: string;
  }) => Promise<UserProfile | null>;
  resetProfile: () => Promise<void>;
  getProfileForWallet: (walletAddress: string) => UserProfile | null;
  fetchProfilesForWallets: (walletAddresses: string[]) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const {
    profile: ownProfile,
    isLoading,
    error,
    updateProfile,
    resetProfile,
  } = useProfile(walletAddress);

  // Track if user needs to complete setup (persisted in localStorage)
  const [setupCompleted, setSetupCompleted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sol_battles_setup_completed') === 'true';
  });

  // Check if this is a new user who needs setup
  // A user needs setup if:
  // 1. Wallet connected
  // 2. Profile loaded (not loading)
  // 3. Profile has no username AND no custom pfp (presetId is undefined or default)
  // 4. Setup not already completed this session
  const hasCustomProfile = ownProfile && (
    ownProfile.username ||
    ownProfile.presetId ||
    ownProfile.nftMint ||
    ownProfile.updatedAt > 0
  );

  // Profile setup eligibility check - used by ProfileSetupWrapper
  // Note: First-bet gating is handled in ProfileSetupWrapper since it has access to FirstBetContext
  const needsSetup = !!(
    walletAddress &&
    !isLoading &&
    ownProfile &&
    !hasCustomProfile &&
    !setupCompleted
  );

  const completeSetup = useCallback(() => {
    setSetupCompleted(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sol_battles_setup_completed', 'true');
    }
  }, []);

  // Load setupCompleted from localStorage when wallet changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sol_battles_setup_completed') === 'true';
    setSetupCompleted(saved);
  }, [walletAddress]);

  // Cache for other users' profiles (in-memory for quick access)
  // Using ref to avoid stale closures and re-render loops
  const profileCacheRef = useRef<Record<string, UserProfile>>({});
  const [profileCacheVersion, setProfileCacheVersion] = useState(0);

  // Get profile for any wallet (own or other)
  // SECURITY FIX: No longer calls setState during render (was causing infinite re-renders)
  const getProfileForWallet = useCallback(
    (wallet: string): UserProfile | null => {
      // If it's our own wallet, return our profile
      if (wallet === walletAddress && ownProfile) {
        return ownProfile;
      }

      // Check memory cache first (ref-based, no re-render)
      if (profileCacheRef.current[wallet]) {
        return profileCacheRef.current[wallet];
      }

      // Check localStorage cache - populate ref without triggering re-render
      const cached = getCachedProfile(wallet);
      if (cached) {
        profileCacheRef.current[wallet] = cached;
        return cached;
      }

      return null;
    },
    [walletAddress, ownProfile, profileCacheVersion]
  );

  // Batch fetch profiles for multiple wallets
  // SECURITY FIX: Uses ref instead of state in dependency array to prevent infinite loops
  const fetchProfilesForWallets = useCallback(
    async (walletAddresses: string[]) => {
      // Filter out wallets we already have cached
      const uncached = walletAddresses.filter(
        (addr) =>
          addr !== walletAddress &&
          !profileCacheRef.current[addr] &&
          !getCachedProfile(addr)
      );

      if (uncached.length === 0) return;

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/profiles?wallets=${uncached.join(',')}`
        );
        if (res.ok) {
          const profiles: UserProfile[] = await res.json();

          // Update memory cache (ref)
          for (const profile of profiles) {
            profileCacheRef.current[profile.walletAddress] = profile;
          }
          // Bump version to notify consumers of new data
          setProfileCacheVersion((v) => v + 1);

          // Update localStorage cache
          setCachedProfiles(profiles);
        }
      } catch {
        // Failed to fetch profiles
      }
    },
    [walletAddress]
  );

  return (
    <ProfileContext.Provider
      value={{
        ownProfile,
        isLoading,
        error,
        needsSetup,
        completeSetup,
        updateProfile,
        resetProfile,
        getProfileForWallet,
        fetchProfilesForWallets,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

// Default values for when context is not available (graceful fallback)
const defaultContextValue: ProfileContextValue = {
  ownProfile: null,
  isLoading: false,
  error: null,
  needsSetup: false,
  completeSetup: () => {},
  updateProfile: async () => null,
  resetProfile: async () => {},
  getProfileForWallet: () => null,
  fetchProfilesForWallets: async () => {},
};

export function useProfileContext() {
  const context = useContext(ProfileContext);
  // Return default values instead of throwing - allows graceful degradation
  if (!context) {
    return defaultContextValue;
  }
  return context;
}
