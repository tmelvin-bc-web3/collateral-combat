'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useProfileContext } from '@/contexts/ProfileContext';
import { PRESET_PFPS } from '@/data/presetPFPs';
import { PresetPFP } from '@/types';

interface ProfileSetupProps {
  onComplete: () => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { updateProfile } = useProfileContext();

  const [selectedPreset, setSelectedPreset] = useState<PresetPFP | null>(null);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validateUsername = (value: string): string | null => {
    if (!value) return null;
    if (value.length > 20) return 'Max 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Letters, numbers, underscores only';
    return null;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const handleSave = async () => {
    if (usernameError) return;

    setIsSaving(true);

    try {
      await updateProfile({
        pfpType: selectedPreset ? 'preset' : 'default',
        presetId: selectedPreset?.id,
        username: username || undefined,
      });
      onComplete();
    } catch {
      // Save failed
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ pfpType: 'default' });
      onComplete();
    } catch {
      // Skip failed
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
        <div className="flex items-center justify-between p-6 border-t border-border-primary bg-bg-tertiary/50">
          <button
            onClick={handleSkip}
            disabled={isSaving}
            className="px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !!usernameError}
            className="btn btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
