import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export type ProfilePictureType = 'preset' | 'nft' | 'default';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  pfpType: ProfilePictureType;
  presetId?: string;
  nftMint?: string;
  nftImageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface ProfilesData {
  profiles: Record<string, UserProfile>;
}

function loadProfiles(): ProfilesData {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading profiles:', error);
  }
  return { profiles: {} };
}

function saveProfiles(data: ProfilesData): void {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving profiles:', error);
  }
}

export function getProfile(walletAddress: string): UserProfile | null {
  const data = loadProfiles();
  return data.profiles[walletAddress] || null;
}

export function upsertProfile(profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>): UserProfile {
  const data = loadProfiles();
  const now = Date.now();
  const existing = data.profiles[profile.walletAddress];

  // Filter out undefined values from incoming profile to preserve existing data
  // This ensures fields not explicitly set in the update don't overwrite existing values
  // Special case: empty string for username means "clear the username"
  const cleanProfile: Partial<UserProfile> = {};
  for (const [key, value] of Object.entries(profile)) {
    if (value !== undefined) {
      // Empty string for username means clear it
      if (key === 'username' && value === '') {
        // Don't add to cleanProfile - we'll delete it below
        continue;
      }
      (cleanProfile as Record<string, unknown>)[key] = value;
    }
  }

  const updatedProfile: UserProfile = {
    // Defaults
    walletAddress: profile.walletAddress,
    pfpType: 'default',
    // Preserve existing data
    ...(existing || {}),
    // Apply new values (only defined ones)
    ...cleanProfile,
    // Timestamps
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // Handle explicit username clear (empty string was passed)
  if (profile.username === '') {
    delete updatedProfile.username;
  }

  data.profiles[profile.walletAddress] = updatedProfile;
  saveProfiles(data);

  return updatedProfile;
}

export function getProfiles(walletAddresses: string[]): UserProfile[] {
  const data = loadProfiles();
  return walletAddresses
    .map(addr => data.profiles[addr])
    .filter((p): p is UserProfile => p !== undefined);
}

export function deleteProfile(walletAddress: string): boolean {
  const data = loadProfiles();
  if (data.profiles[walletAddress]) {
    delete data.profiles[walletAddress];
    saveProfiles(data);
    return true;
  }
  return false;
}

export function isUsernameTaken(username: string, excludeWallet?: string): boolean {
  const data = loadProfiles();
  const lowerUsername = username.toLowerCase();

  for (const [wallet, profile] of Object.entries(data.profiles)) {
    if (profile.username && profile.username.toLowerCase() === lowerUsername) {
      // If we're excluding a wallet (for updates), skip it
      if (excludeWallet && wallet === excludeWallet) {
        continue;
      }
      return true;
    }
  }
  return false;
}
