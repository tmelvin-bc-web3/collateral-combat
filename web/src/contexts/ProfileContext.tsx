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
import { UserProfile, ProfilePictureType } from '@/types';
import { useProfile } from '@/hooks/useProfile';
import {
  getCachedProfile,
  setCachedProfile,
  setCachedProfiles,
} from '@/lib/profileStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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

  // Track if user needs to complete setup
  const [setupCompleted, setSetupCompleted] = useState(false);

  // Check if this is a new user who needs setup
  // A user needs setup if they have a wallet connected, profile loaded, and updatedAt is 0 (never saved)
  const needsSetup = !!(
    walletAddress &&
    !isLoading &&
    ownProfile &&
    ownProfile.updatedAt === 0 &&
    !setupCompleted
  );

  const completeSetup = useCallback(() => {
    setSetupCompleted(true);
  }, []);

  // Reset setupCompleted when wallet changes
  useEffect(() => {
    setSetupCompleted(false);
  }, [walletAddress]);

  // Cache for other users' profiles (in-memory for quick access)
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>(
    {}
  );

  // Get profile for any wallet (own or other)
  const getProfileForWallet = useCallback(
    (wallet: string): UserProfile | null => {
      // If it's our own wallet, return our profile
      if (wallet === walletAddress && ownProfile) {
        return ownProfile;
      }

      // Check memory cache first
      if (profileCache[wallet]) {
        return profileCache[wallet];
      }

      // Check localStorage cache
      const cached = getCachedProfile(wallet);
      if (cached) {
        setProfileCache((prev) => ({ ...prev, [wallet]: cached }));
        return cached;
      }

      return null;
    },
    [walletAddress, ownProfile, profileCache]
  );

  // Batch fetch profiles for multiple wallets
  const fetchProfilesForWallets = useCallback(
    async (walletAddresses: string[]) => {
      // Filter out wallets we already have cached
      const uncached = walletAddresses.filter(
        (addr) =>
          addr !== walletAddress &&
          !profileCache[addr] &&
          !getCachedProfile(addr)
      );

      if (uncached.length === 0) return;

      try {
        const res = await fetch(
          `${BACKEND_URL}/api/profiles?wallets=${uncached.join(',')}`
        );
        if (res.ok) {
          const profiles: UserProfile[] = await res.json();

          // Update memory cache
          const newCache: Record<string, UserProfile> = {};
          for (const profile of profiles) {
            newCache[profile.walletAddress] = profile;
          }
          setProfileCache((prev) => ({ ...prev, ...newCache }));

          // Update localStorage cache
          setCachedProfiles(profiles);
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
      }
    },
    [walletAddress, profileCache]
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

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}
