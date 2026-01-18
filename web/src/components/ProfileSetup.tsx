'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { PRESET_PFPS } from '@/data/presetPFPs';
import { PresetPFP } from '@/types';
import { BACKEND_URL } from '@/config/api';


interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { updateProfile, error: profileError } = useProfileContext();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();

  const [selectedPreset, setSelectedPreset] = useState<PresetPFP | null>(null);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const validateUsername = (value: string): string | null => {
    if (!value) return null;
    if (value.length > 20) return 'Max 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, underscores only';
    return null;
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!value || validateUsername(value)) return;

    setIsCheckingUsername(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/username/check/${encodeURIComponent(value)}`);
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
    if (usernameError) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // If not authenticated, prompt sign-in first
      if (!isAuthenticated) {
        const signedIn = await signIn();
        if (!signedIn) {
          setSaveError('Please sign the message to verify your wallet');
          setIsSaving(false);
          return;
        }
      }

      const result = await updateProfile({
        pfpType: selectedPreset ? 'preset' : 'default',
        presetId: selectedPreset?.id,
        username: username || undefined,
      });
      if (result) {
        onComplete();
      } else {
        setSaveError(profileError || 'Failed to save profile. Please try again.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      // If not authenticated, prompt sign-in first
      if (!isAuthenticated) {
        const signedIn = await signIn();
        if (!signedIn) {
          // User cancelled sign-in, just close the modal anyway
          onComplete();
          return;
        }
      }

      const result = await updateProfile({ pfpType: 'default' });
      if (result) {
        onComplete();
      } else {
        // If skip fails, just close the modal - profile will be created on next action
        onComplete();
      }
    } catch (err) {
      console.error('Profile skip error:', err);
      // On error, still close the modal
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-bg-secondary border border-border-primary rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center border-b border-border-primary">
          <h2 className="text-2xl font-bold mb-2">Welcome to Collateral Combat</h2>
          <p className="text-text-secondary">Set up your profile to get started</p>
        </div>

        {/* Username */}
        <div className="p-6 border-b border-border-primary">
          <label className="block text-sm font-medium mb-2">
            Username <span className="text-text-tertiary">(optional)</span>
          </label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter a username..."
            maxLength={20}
            className={`w-full px-4 py-3 bg-bg-tertiary border rounded-xl text-base focus:outline-none focus:ring-2 transition-colors ${
              usernameError
                ? 'border-danger focus:ring-danger/50'
                : 'border-border-primary focus:ring-accent/50'
            }`}
          />
          {usernameError && (
            <p className="text-sm text-danger mt-2">{usernameError}</p>
          )}
          {!usernameError && username && (
            <p className="text-sm text-text-tertiary mt-2">{username.length}/20 characters</p>
          )}
          <p className="text-xs text-warning mt-2">
            Warning: Usernames cannot be changed once set
          </p>
        </div>

        {/* Profile Picture Selection */}
        <div className="p-6">
          <label className="block text-sm font-medium mb-3">
            Choose a profile picture <span className="text-text-tertiary">(optional)</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_PFPS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(selectedPreset?.id === preset.id ? null : preset)}
                className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                  selectedPreset?.id === preset.id
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary scale-105'
                    : 'hover:ring-2 hover:ring-border-primary hover:scale-105'
                }`}
              >
                <Image
                  src={preset.image}
                  alt={preset.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {selectedPreset?.id === preset.id && (
                  <div className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-primary bg-bg-tertiary/50">
          {/* Error message */}
          {saveError && (
            <div className="px-6 pt-4 pb-0">
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {saveError}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between p-6">
            <button
              onClick={handleSkip}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !!usernameError || isCheckingUsername || authLoading}
              className="btn btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Connecting...' : isSaving ? 'Saving...' : isCheckingUsername ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
