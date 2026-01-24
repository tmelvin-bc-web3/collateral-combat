// Fight card types for the UFC-style homepage

export interface Fighter {
  walletAddress: string;
  displayName: string;
  avatarUrl?: string;
  elo?: number;
  record?: { wins: number; losses: number };
}

export interface Battle {
  id: string;
  status: 'upcoming' | 'live' | 'completed';
  fighter1: Fighter;
  fighter2: Fighter | null; // null if waiting for opponent
  stakes: number; // in SOL
  leverage: number;
  asset: string;
  startTime: number; // timestamp
  endTime?: number;
  spectatorCount: number;
  isFeatured?: boolean;
}

export interface SideGame {
  id: string;
  name: string;
  icon: string;
  href: string;
  description: string;
  playersActive?: number;
  currentPool?: number;
}
