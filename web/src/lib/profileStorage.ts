import { UserProfile } from '@/types';

const PROFILE_KEY = 'sol_battles_profile';
const PROFILE_CACHE_KEY = 'sol_battles_profile_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedProfile {
  profile: UserProfile;
  cachedAt: number;
}

interface ProfileCache {
  [walletAddress: string]: CachedProfile;
}

// Own profile storage
export function saveOwnProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getOwnProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function clearOwnProfile(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_KEY);
}

// Other users' profile cache
function getCache(): ProfileCache {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(PROFILE_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: ProfileCache): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
}

export function getCachedProfile(walletAddress: string): UserProfile | null {
  const cache = getCache();
  const cached = cache[walletAddress];

  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    delete cache[walletAddress];
    saveCache(cache);
    return null;
  }

  return cached.profile;
}

export function setCachedProfile(profile: UserProfile): void {
  const cache = getCache();
  cache[profile.walletAddress] = {
    profile,
    cachedAt: Date.now(),
  };
  saveCache(cache);
}

export function setCachedProfiles(profiles: UserProfile[]): void {
  const cache = getCache();
  const now = Date.now();

  for (const profile of profiles) {
    cache[profile.walletAddress] = {
      profile,
      cachedAt: now,
    };
  }

  saveCache(cache);
}

export function clearProfileCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_CACHE_KEY);
}
