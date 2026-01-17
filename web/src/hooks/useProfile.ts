'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, ProfilePictureType } from '@/types';
import {
  saveOwnProfile,
  getOwnProfile,
  clearOwnProfile,
} from '@/lib/profileStorage';
import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export function useProfile(walletAddress: string | null) {
  const { authenticatedFetch, isAuthenticated } = useAuth();
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
      } catch {
        // Failed to fetch profile - using cached or default
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
        // Use authenticated fetch - requires JWT from signing in
        const res = await authenticatedFetch(
          `${BACKEND_URL}/api/profile/${walletAddress}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          }
        );

        if (!res.ok) {
          const data = await res.json();
          // Provide helpful error for auth issues
          if (res.status === 401) {
            throw new Error('Please sign in to update your profile. Your session may have expired.');
          }
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
    [walletAddress, authenticatedFetch]
  );

  const resetProfile = useCallback(async () => {
    if (!walletAddress) return;

    // Delete from backend (requires authentication)
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/profile/${walletAddress}`, {
        method: 'DELETE',
      });
    } catch {
      // Delete failed - continue with local cleanup
    }

    // Clear localStorage
    clearOwnProfile();
    setProfile(null);
  }, [walletAddress, authenticatedFetch]);

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
