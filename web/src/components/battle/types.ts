import { PositionSide, Leverage } from '@/types';

export interface FighterData {
  walletAddress: string;
  username: string;
  avatar: string | null;
  level: number;
  title: string;
  pnlPercent: number;
  pnlDollar: number;
  positions: PositionDisplay[];
  isCurrentUser: boolean;
}

export interface PositionDisplay {
  id: string;
  asset: string;
  side: PositionSide;
  leverage: Leverage;
  pnlPercent: number;
  pnlDollar: number;
}

export interface ActivityEvent {
  id: string;
  type: 'open' | 'close';
  asset: string;
  side: PositionSide;
  leverage: Leverage;
  pnl?: number;
  timestamp: number;
}

export type BattlePhase = 'live' | 'ending' | 'ended';

export interface BattleHeaderProps {
  userFighter: FighterData;
  opponentFighter: FighterData;
  timeRemaining: number;
  phase: BattlePhase;
  prizePool: number;
  spectatorCount?: number;
  isSoloPractice?: boolean;
}

export interface PnLComparisonBarProps {
  userPnL: number;
  opponentPnL: number;
  userPnLDollar: number;
  opponentPnLDollar: number;
}

export interface OpponentActivityFeedProps {
  activity: ActivityEvent[];
  opponentName: string;
}

export interface ForfeitButtonProps {
  onForfeit: () => void;
  entryFee: number;
  disabled?: boolean;
}
