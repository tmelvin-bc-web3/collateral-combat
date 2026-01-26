'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useProfileContext } from '@/contexts/ProfileContext';
import { getPresetById } from '@/data/presetPFPs';
import { resolveImageUrl } from '@/lib/nftApi';

interface UserAvatarProps {
  walletAddress: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  onClick?: () => void;
  showName?: boolean;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
  '2xl': 80,
  '3xl': 96,
};

const sizeClassMap = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-14 h-14',
  '2xl': 'w-20 h-20',
  '3xl': 'w-24 h-24',
};

// Generate a consistent gradient based on wallet address
function getGradientForWallet(address: string): string {
  const hash = address.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;

  return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%), hsl(${hue2}, 70%, 40%))`;
}

// Get display name for a wallet - username if set, otherwise truncated address
export function getDisplayName(walletAddress: string, username?: string): string {
  if (username) return username;
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

export function UserAvatar({
  walletAddress,
  size = 'md',
  className = '',
  onClick,
  showName = false,
}: UserAvatarProps) {
  const { getProfileForWallet } = useProfileContext();
  const profile = getProfileForWallet(walletAddress);
  const [imgError, setImgError] = useState(false);

  const pixelSize = sizeMap[size];
  const sizeClass = sizeClassMap[size];
  const displayName = getDisplayName(walletAddress, profile?.username);

  // Get image source based on profile type
  let imageSrc: string | null = null;

  if (profile?.pfpType === 'preset' && profile.presetId) {
    const preset = getPresetById(profile.presetId);
    if (preset) {
      imageSrc = preset.image;
    }
  } else if (profile?.pfpType === 'nft' && profile.nftImageUrl) {
    imageSrc = resolveImageUrl(profile.nftImageUrl);
  } else if (profile?.pfpType === 'twitter' && profile.twitterHandle && !imgError) {
    imageSrc = `https://unavatar.io/twitter/${profile.twitterHandle}`;
  }

  const baseClasses = `${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`;
  const clickableClasses = onClick ? 'cursor-pointer hover:ring-2 hover:ring-accent transition-all' : '';

  const avatarElement = imageSrc ? (
    <div className={`${baseClasses} ${clickableClasses} relative`} onClick={!showName ? onClick : undefined}>
      <Image
        src={imageSrc}
        alt="Profile"
        width={pixelSize}
        height={pixelSize}
        className="object-cover w-full h-full"
        unoptimized
        onError={() => setImgError(true)}
      />
    </div>
  ) : (
    // Default: gradient with initials
    (() => {
      const initials = walletAddress.slice(0, 2).toUpperCase();
      const gradient = getGradientForWallet(walletAddress);
      return (
        <div
          className={`${baseClasses} ${clickableClasses} flex items-center justify-center`}
          style={{ background: gradient }}
          onClick={!showName ? onClick : undefined}
        >
          <span
            className="font-bold text-white"
            style={{ fontSize: `${pixelSize * 0.4}px` }}
          >
            {initials}
          </span>
        </div>
      );
    })()
  );

  if (showName) {
    return (
      <div
        className={`flex items-center gap-2 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        {avatarElement}
        <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
      </div>
    );
  }

  return avatarElement;
}
