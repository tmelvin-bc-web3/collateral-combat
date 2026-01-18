import { TradeRecord } from '@/types';

export interface PracticeSessionStats {
  sessionTime: number; // seconds since session start
  virtualBalance: number;
  startingBalance: number;
  sessionPnL: number; // percentage
  sessionPnLDollar: number;
  tradesThisSession: number;
  winningTrades: number;
}

export interface PracticeHeaderProps {
  stats: PracticeSessionStats;
  onReset: () => void;
  onEnterRealBattle: () => void;
}

export interface Tip {
  id: string;
  category: 'basics' | 'strategy' | 'risk';
  text: string;
  example?: string;
}

export interface TipsPanelProps {
  currentTip: Tip;
  onRefresh: () => void;
  category: 'basics' | 'strategy' | 'risk';
  onCategoryChange: (category: 'basics' | 'strategy' | 'risk') => void;
}

// Practice tips data
export const PRACTICE_TIPS: Tip[] = [
  // Basics
  {
    id: 'basics-1',
    category: 'basics',
    text: 'Start with lower leverage (2x-5x) until you\'re comfortable with how positions move.',
    example: 'A 5x long on BTC means a 2% price increase = 10% profit',
  },
  {
    id: 'basics-2',
    category: 'basics',
    text: 'In 1v1 battles, you\'re competing on % P&L, not absolute profit. Percentage matters!',
  },
  {
    id: 'basics-3',
    category: 'basics',
    text: 'LONG if you think price will go UP. SHORT if you think price will go DOWN.',
  },
  {
    id: 'basics-4',
    category: 'basics',
    text: 'You can only hold one position per asset at a time. Close it before opening a new one.',
  },
  // Strategy
  {
    id: 'strategy-1',
    category: 'strategy',
    text: 'Don\'t hold losing positions hoping they\'ll recover - cut losses early.',
    example: 'Set a mental stop-loss at -20% and stick to it',
  },
  {
    id: 'strategy-2',
    category: 'strategy',
    text: 'In battles, sometimes the best move is to stay in cash and wait for a clear setup.',
  },
  {
    id: 'strategy-3',
    category: 'strategy',
    text: 'Watch for momentum - strong moves often continue in the same direction.',
  },
  {
    id: 'strategy-4',
    category: 'strategy',
    text: 'Consider the overall market trend before opening a position against it.',
  },
  // Risk Management
  {
    id: 'risk-1',
    category: 'risk',
    text: 'Never risk more than 25% of your balance on a single trade.',
    example: 'With $1000, max margin should be $250',
  },
  {
    id: 'risk-2',
    category: 'risk',
    text: 'High leverage amplifies both gains AND losses equally. A 10x position moves 10x faster.',
  },
  {
    id: 'risk-3',
    category: 'risk',
    text: 'In real battles, a 10x leveraged 10% move against you = 100% loss (liquidation).',
  },
  {
    id: 'risk-4',
    category: 'risk',
    text: 'Diversify across assets if you want to reduce risk, but focus if you want higher potential.',
  },
];
