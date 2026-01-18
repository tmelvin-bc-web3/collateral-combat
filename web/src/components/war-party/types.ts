// War Party (Draft) Types

export type WarPartyPhase = 'enrollment' | 'active' | 'calculating';

export interface WarPartyStats {
  week: number;
  phase: WarPartyPhase;
  timeRemaining: number;
  totalPrizePool: number;
  totalWarriors: number;
}

export interface TierData {
  id: string;
  name: string;
  entryFee: number;
  tagline: string;
  warriors: number;
  prizePool: number;
  tournamentId: string | null;
}

export interface UserEnrollment {
  tier: string;
  entryId: string;
  position: number;
  totalInTier: number;
  performance: number;
  estimatedPayout: number;
  isInMoney: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  wallet: string;
  displayName: string;
  tier: string;
  performance: number;
  isUser: boolean;
}

export interface HotToken {
  symbol: string;
  name: string;
  logo: string;
  change: number;
  pickCount: number;
}

export interface PastWinner {
  week: number;
  name: string;
  tier: string;
  performance: number;
  prize: number;
}

// Tier configuration
export const TIER_CONFIG: Record<string, {
  name: string;
  tagline: string;
  entryFee: number;
  color: string;
}> = {
  '0.1 SOL': {
    name: 'Scavenger',
    tagline: 'Low stakes, high hopes. Perfect for fresh blood.',
    entryFee: 0.1,
    color: 'accent',
  },
  '0.5 SOL': {
    name: 'Raider',
    tagline: 'Prove your worth in the mid-tier wasteland.',
    entryFee: 0.5,
    color: 'success',
  },
  '1 SOL': {
    name: 'Warlord',
    tagline: 'Only the ruthless survive at this level.',
    entryFee: 1,
    color: 'warning',
  },
};

// Constants
export const LAMPORTS_PER_SOL = 1_000_000_000;
