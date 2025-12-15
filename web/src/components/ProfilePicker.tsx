'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProfileContext } from '@/contexts/ProfileContext';
import { ProfilePickerPresets } from './ProfilePickerPresets';
import { ProfilePickerNFTs } from './ProfilePickerNFTs';
import { UserAvatar } from './UserAvatar';
import { PresetPFP, NFTAsset } from '@/types';
import { useWallet } from '@solana/wallet-adapter-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ProfilePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'presets' | 'nfts';

export function ProfilePicker({ isOpen, onClose }: ProfilePickerProps) {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || '';
  const { ownProfile, updateProfile } = useProfileContext();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const [selectedPreset, setSelectedPreset] = useState<PresetPFP | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFTAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(null);
      setSelectedNFT(null);
      setUsername(ownProfile?.username || '');
      setUsernameError(null);

      // Set active tab based on current profile
      if (ownProfile?.pfpType === 'nft') {
        setActiveTab('nfts');
      } else {
        setActiveTab('presets');
      }
    }
  }, [isOpen, ownProfile]);

  if (!isOpen || !mounted) return null;

  const handlePresetSelect = (preset: PresetPFP) => {
    setSelectedPreset(preset);
    setSelectedNFT(null);
  };

  const handleNFTSelect = (nft: NFTAsset) => {
    setSelectedNFT(nft);
    setSelectedPreset(null);
  };

  const validateUsername = (value: string): string | null => {
    if (!value) return null; // Empty is allowed
    if (value.length > 20) return 'Max 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, underscores only';
    return null;
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!value || validateUsername(value)) return;

    setIsCheckingUsername(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/username/check/${encodeURIComponent(value)}?wallet=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.available) {
          setUsernameError('Username is already taken');
        }
      }
    } catch {
      // Failed to check - allow save attempt which will catch duplicates server-side
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    const validationError = validateUsername(value);
    setUsernameError(validationError);

    // Clear any pending check
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Debounce the availability check
    if (value && !validationError) {
      checkTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    // Can save if we have a selection OR if username changed
    const usernameChanged = username !== (ownProfile?.username || '');
    if (!selectedPreset && !selectedNFT && !usernameChanged) return;

    if (usernameError) return;

    setIsSaving(true);

    try {
      if (selectedPreset) {
        await updateProfile({
          pfpType: 'preset',
          presetId: selectedPreset.id,
          username: username || undefined,
        });
      } else if (selectedNFT) {
        await updateProfile({
          pfpType: 'nft',
          nftMint: selectedNFT.mint,
          nftImageUrl: selectedNFT.image,
          username: username || undefined,
        });
      } else {
        // Just updating username
        await updateProfile({
          pfpType: ownProfile?.pfpType || 'default',
          presetId: ownProfile?.presetId,
          nftMint: ownProfile?.nftMint,
          nftImageUrl: ownProfile?.nftImageUrl,
          username: username || undefined,
        });
      }
      onClose();
    } catch {
      // Save failed
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ pfpType: 'default' });
      onClose();
    } catch {
      // Reset failed
    } finally {
      setIsSaving(false);
    }
  };


  const hasSelection = selectedPreset || selectedNFT;
  const usernameChanged = username !== (ownProfile?.username || '');
  const canSave = (hasSelection || usernameChanged) && !usernameError && !isCheckingUsername;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-primary rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <h2 className="text-lg font-semibold">Choose Profile Picture</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <svg
              className="w-5 h-5 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Current Avatar Preview & Username */}
        <div className="flex flex-col items-center py-4 border-b border-border-primary gap-3">
          <div className="text-center">
            <UserAvatar walletAddress={walletAddress} size="xl" />
          </div>
          <div className="w-full px-4">
            <label className="block text-xs text-text-tertiary mb-1">
              Username {ownProfile?.username ? '' : '(optional)'}
            </label>
            {ownProfile?.username ? (
              <div className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm text-text-secondary">
                {ownProfile.username}
                <p className="text-xs text-text-tertiary mt-1">Username cannot be changed</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Enter username..."
                  maxLength={20}
                  className={`w-full px-3 py-2 bg-bg-tertiary border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                    usernameError
                      ? 'border-danger focus:ring-danger/50'
                      : 'border-border-primary focus:ring-accent/50'
                  }`}
                />
                {usernameError && (
                  <p className="text-xs text-danger mt-1">{usernameError}</p>
                )}
                {!usernameError && username && (
                  <p className="text-xs text-text-tertiary mt-1">{username.length}/20</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-primary">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'presets'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab('nfts')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'nfts'
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            My NFTs
          </button>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[280px]">
          {activeTab === 'presets' ? (
            <ProfilePickerPresets
              selectedId={selectedPreset?.id || (ownProfile?.pfpType === 'preset' ? ownProfile.presetId : null) || null}
              onSelect={handlePresetSelect}
            />
          ) : (
            <ProfilePickerNFTs
              selectedMint={selectedNFT?.mint || (ownProfile?.pfpType === 'nft' ? ownProfile.nftMint : null) || null}
              onSelect={handleNFTSelect}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-primary bg-bg-tertiary/50">
          <button
            onClick={handleReset}
            disabled={isSaving || ownProfile?.pfpType === 'default'}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : isCheckingUsername ? 'Checking...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
