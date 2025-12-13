'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ProfilePictureType } from '@/types';
import {
  saveOwnProfile,
  getOwnProfile,
  clearOwnProfile,
} from '@/lib/profileStorage';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useProfile(walletAddress: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load profile on mount and when wallet changes
  useEffect(() => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      // First check localStorage
      const cached = getOwnProfile();
      if (cached && cached.walletAddress === walletAddress) {
        setProfile(cached);
      }

      // Then fetch from backend
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/profile/${walletAddress}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          saveOwnProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [walletAddress, refreshKey]);

  const updateProfile = useCallback(
    async (updates: {
      pfpType: ProfilePictureType;
      presetId?: string;
      nftMint?: string;
      nftImageUrl?: string;
      username?: string;
    }) => {
      if (!walletAddress) {
        setError('Wallet not connected');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`${BACKEND_URL}/api/profile/${walletAddress}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update profile');
        }

        const updatedProfile = await res.json();
        setProfile(updatedProfile);
        saveOwnProfile(updatedProfile);
        return updatedProfile;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [walletAddress]
  );

  const resetProfile = useCallback(async () => {
    if (!walletAddress) return;

    // Delete from backend
    try {
      await fetch(`${BACKEND_URL}/api/profile/${walletAddress}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete profile from backend:', err);
    }

    // Clear localStorage
    clearOwnProfile();
    setProfile(null);
  }, [walletAddress]);

  const clearLocalProfile = useCallback(() => {
    clearOwnProfile();
    setProfile(null);
  }, []);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    resetProfile,
    clearLocalProfile,
  };
}
