'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PageLoading } from '@/components/ui/skeleton';
import {
  FightCardHero,
  LiveBattlesStrip,
  MainCardSection,
  UndercardGrid,
  BetweenFightsSection,
} from '@/components/fightcard';
import type { FightCardBattle, SideGame } from '@/types/fightcard';

// Mock battle data for development
const MOCK_BATTLES: FightCardBattle[] = [
  {
    id: 'battle-main-1',
    status: 'live',
    fighter1: {
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'DegenKing',
      elo: 1850,
      record: { wins: 47, losses: 12 },
    },
    fighter2: {
      walletAddress: '3yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'SolWhale.sol',
      elo: 1780,
      record: { wins: 38, losses: 15 },
    },
    stakes: 5,
    leverage: 10,
    asset: 'SOL/USD',
    startTime: Date.now() - 120000, // Started 2 mins ago
    spectatorCount: 23,
    isFeatured: true,
  },
  {
    id: 'battle-live-1',
    status: 'live',
    fighter1: {
      walletAddress: '9xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'CryptoApe',
      elo: 1620,
      record: { wins: 25, losses: 8 },
    },
    fighter2: {
      walletAddress: '4yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'MoonBoi',
      elo: 1590,
      record: { wins: 22, losses: 10 },
    },
    stakes: 2,
    leverage: 5,
    asset: 'ETH/USD',
    startTime: Date.now() - 60000,
    spectatorCount: 12,
  },
  {
    id: 'battle-live-2',
    status: 'live',
    fighter1: {
      walletAddress: '1xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'DiamondHands',
      elo: 1480,
      record: { wins: 15, losses: 5 },
    },
    fighter2: {
      walletAddress: '5yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'Rekt420',
      elo: 1520,
      record: { wins: 18, losses: 9 },
    },
    stakes: 1,
    leverage: 20,
    asset: 'BTC/USD',
    startTime: Date.now() - 180000,
    spectatorCount: 8,
  },
  {
    id: 'battle-upcoming-1',
    status: 'upcoming',
    fighter1: {
      walletAddress: '2xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'WAGMI_Chad',
      elo: 1750,
      record: { wins: 32, losses: 11 },
    },
    fighter2: {
      walletAddress: '6yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'PumpItUp',
      elo: 1720,
      record: { wins: 29, losses: 13 },
    },
    stakes: 3,
    leverage: 10,
    asset: 'SOL/USD',
    startTime: Date.now() + 300000, // 5 mins from now
    spectatorCount: 0,
    isFeatured: true,
  },
  {
    id: 'battle-upcoming-2',
    status: 'upcoming',
    fighter1: {
      walletAddress: '8xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'AlphaTrader',
      elo: 1680,
      record: { wins: 28, losses: 7 },
    },
    fighter2: null, // Waiting for opponent
    stakes: 2,
    leverage: 5,
    asset: 'ETH/USD',
    startTime: Date.now() + 600000, // 10 mins from now
    spectatorCount: 0,
  },
  {
    id: 'battle-upcoming-3',
    status: 'upcoming',
    fighter1: {
      walletAddress: '3xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'BullRunner',
      elo: 1550,
      record: { wins: 19, losses: 8 },
    },
    fighter2: {
      walletAddress: '7yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'ShorterPro',
      elo: 1580,
      record: { wins: 21, losses: 10 },
    },
    stakes: 0.5,
    leverage: 2,
    asset: 'WIF/USD',
    startTime: Date.now() + 900000, // 15 mins from now
    spectatorCount: 0,
  },
  {
    id: 'battle-upcoming-4',
    status: 'upcoming',
    fighter1: {
      walletAddress: '4xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'NightOwl',
      elo: 1420,
      record: { wins: 12, losses: 6 },
    },
    fighter2: {
      walletAddress: '8yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'DayTrader',
      elo: 1450,
      record: { wins: 14, losses: 8 },
    },
    stakes: 1,
    leverage: 5,
    asset: 'BONK/USD',
    startTime: Date.now() + 1200000, // 20 mins from now
    spectatorCount: 0,
  },
  {
    id: 'battle-upcoming-5',
    status: 'upcoming',
    fighter1: {
      walletAddress: '5xLMtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      displayName: 'FastFingers',
      elo: 1380,
      record: { wins: 10, losses: 4 },
    },
    fighter2: {
      walletAddress: '9yQRoXZS6nVKz1Mj9dN8GPPhqvxFk3W2tV4PZR8HuGwQ',
      displayName: 'SlowAndSteady',
      elo: 1360,
      record: { wins: 9, losses: 5 },
    },
    stakes: 0.5,
    leverage: 2,
    asset: 'JUP/USD',
    startTime: Date.now() + 1500000, // 25 mins from now
    spectatorCount: 0,
  },
];

// Default side games
const SIDE_GAMES: SideGame[] = [
  {
    id: 'oracle',
    name: 'Oracle',
    icon: 'target',
    href: '/predict',
    description: '30-second price predictions',
    playersActive: 47,
  },
  {
    id: 'draft',
    name: 'Draft',
    icon: 'trophy',
    href: '/draft',
    description: 'Weekly memecoin tournaments',
    playersActive: 89,
  },
  {
    id: 'lds',
    name: 'Last Degen Standing',
    icon: 'skull',
    href: '/lds',
    description: 'Battle royale elimination',
    playersActive: 23,
  },
  {
    id: 'token-wars',
    name: 'Token Wars',
    icon: 'swords',
    href: '/token-wars',
    description: 'Head-to-head token battles',
    playersActive: 34,
    currentPool: 8.5,
  },
];

export default function Home() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [battles] = useState<FightCardBattle[]>(MOCK_BATTLES);

  useEffect(() => {
    setMounted(true);
  }, []);

  // TODO: Wire up socket connections to get real battle data
  // For now, using mock data for development

  if (!mounted) {
    return <PageLoading message="Welcome to DegenDome..." />;
  }

  // Separate battles by status
  const liveBattles = battles.filter(b => b.status === 'live');
  const upcomingBattles = battles.filter(b => b.status === 'upcoming');

  // Main event: first live featured, or first live, or first upcoming
  const mainEvent = liveBattles.find(b => b.isFeatured) ||
    liveBattles[0] ||
    upcomingBattles.find(b => b.isFeatured) ||
    upcomingBattles[0] ||
    null;

  // Live battles strip (excluding main event)
  const liveBattlesForStrip = liveBattles.filter(b => b.id !== mainEvent?.id);

  // Main card: next 3 featured/upcoming (excluding main event)
  const mainCardBattles = upcomingBattles
    .filter(b => b.id !== mainEvent?.id)
    .slice(0, 3);

  // Undercard: remaining upcoming battles
  const undercardBattles = upcomingBattles
    .filter(b => b.id !== mainEvent?.id)
    .slice(3);

  // Navigation handlers
  const handleBattleClick = (battle: FightCardBattle) => {
    router.push(`/spectate/${battle.id}`);
  };

  const handleWatchLive = () => {
    if (mainEvent) {
      router.push(`/spectate/${mainEvent.id}`);
    }
  };

  const handleBetNow = () => {
    if (mainEvent) {
      router.push(`/spectate/${mainEvent.id}?bet=true`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn px-4 py-6">
      {/* Hero: Main Event */}
      <FightCardHero
        mainEvent={mainEvent}
        onWatchLive={handleWatchLive}
        onBetNow={handleBetNow}
      />

      {/* Live Now Strip */}
      {liveBattlesForStrip.length > 0 && (
        <LiveBattlesStrip
          battles={liveBattlesForStrip}
          onBattleClick={handleBattleClick}
        />
      )}

      {/* Main Card */}
      <MainCardSection
        battles={mainCardBattles}
        onBattleClick={handleBattleClick}
      />

      {/* Undercard */}
      {undercardBattles.length > 0 && (
        <UndercardGrid
          battles={undercardBattles}
          onBattleClick={handleBattleClick}
        />
      )}

      {/* Between Fights - Side Games */}
      <BetweenFightsSection games={SIDE_GAMES} />
    </div>
  );
}
