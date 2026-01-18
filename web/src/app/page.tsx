'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { PageLoading } from '@/components/ui/skeleton';
import {
  HeroSection,
  FeaturedGame,
  GameGrid,
  LiveActivityFeed,
  SocialProof,
  HowItWorks,
  HomepageData,
  ActivityItem,
} from '@/components/home';
import { getSocket } from '@/lib/socket';
import { getTokenLogo } from '@/config/tokenLogos';

// Mock data for demonstration - replace with real API/WebSocket data
const MOCK_DATA: HomepageData = {
  liveStats: {
    playersOnline: 147,
    liveGames: 23,
    wonToday: 1234,
    biggestWinToday: 12.5,
  },
  oracle: {
    currentRound: {
      timeRemaining: 18,
      upPool: 12.4,
      downPool: 8.7,
      currentPrice: 144.23,
    },
    playersInGame: 47,
  },
  arena: {
    openBattles: 5,
    totalInPools: 34.5,
    playersActive: 23,
  },
  lds: {
    currentLobby: {
      playerCount: 18,
      maxPlayers: 50,
      prizePool: 1.71,
      timeToStart: 272,
    },
  },
  tokenWars: {
    currentBattle: {
      tokenA: { symbol: 'BONK', image: '/tokens/bonk.png', change: 2.3 },
      tokenB: { symbol: 'WIF', image: '/tokens/wif.png', change: -0.8 },
      timeRemaining: 154,
      totalPool: 8.5,
    },
  },
  warParty: {
    activeParties: 89,
    currentLeader: {
      username: 'CryptoApe',
      return: 47.3,
    },
  },
  stands: {
    liveBattles: 3,
    watchersCount: 12,
    featuredBattle: {
      player1: 'DegenKing',
      player2: 'SolWhale',
      pool: 4.2,
    },
  },
  recentActivity: [],
  platformStats: {
    totalGames: 12453,
    totalVolume: 89234,
    uniquePlayers: 3421,
    biggestWin: {
      amount: 47.3,
      winner: 'CryptoApe',
      game: 'LDS',
    },
    todayStats: {
      games: 234,
      volume: 1234,
      players: 89,
    },
  },
};

// Generate mock activity feed
function generateMockActivity(): ActivityItem[] {
  const names = ['SolWhale.sol', 'DegenKing', 'CryptoApe', 'MoonBoi', 'DiamondHands', 'Rekt420', 'WAGMI_Chad', 'PumpItUp'];
  const games = ['Oracle', 'Arena', 'LDS', 'Token Wars', 'War Party'];
  const types: ActivityItem['type'][] = ['win', 'big_win', 'join', 'elimination', 'streak', 'victory'];

  const activities: ActivityItem[] = [];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const game = games[Math.floor(Math.random() * games.length)];
    const user = names[Math.floor(Math.random() * names.length)];

    activities.push({
      id: `activity-${i}`,
      type,
      user: { username: user },
      amount: type === 'join' || type === 'elimination' ? undefined :
              type === 'big_win' ? parseFloat((Math.random() * 10 + 2).toFixed(2)) :
              parseFloat((Math.random() * 3 + 0.1).toFixed(2)),
      game,
      context: type === 'streak' ? `${Math.floor(Math.random() * 7 + 3)} WIN STREAK` :
               type === 'elimination' ? `${Math.floor(Math.random() * 40 + 5)}th place` : undefined,
      timestamp: now - (i * 15000) - Math.random() * 30000,
    });
  }

  return activities.sort((a, b) => b.timestamp - a.timestamp);
}

export default function Home() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [homepageData, setHomepageData] = useState<HomepageData>(MOCK_DATA);
  const mockInitializedRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    // Initialize mock activity data once
    if (!mockInitializedRef.current) {
      mockInitializedRef.current = true;
      setHomepageData(prev => ({
        ...prev,
        recentActivity: generateMockActivity(),
      }));
    }
  }, []);

  // Simulate live updates
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      setHomepageData(prev => ({
        ...prev,
        // Update Oracle timer
        oracle: {
          ...prev.oracle,
          currentRound: {
            ...prev.oracle.currentRound,
            timeRemaining: prev.oracle.currentRound.timeRemaining > 0
              ? prev.oracle.currentRound.timeRemaining - 1
              : 30,
            // Slight price fluctuation
            currentPrice: prev.oracle.currentRound.currentPrice + (Math.random() - 0.5) * 0.5,
          },
        },
        // Update LDS timer
        lds: {
          currentLobby: {
            ...prev.lds.currentLobby,
            timeToStart: prev.lds.currentLobby.timeToStart > 0
              ? prev.lds.currentLobby.timeToStart - 1
              : 300,
          },
        },
        // Update Token Wars timer
        tokenWars: {
          currentBattle: {
            ...prev.tokenWars.currentBattle,
            timeRemaining: prev.tokenWars.currentBattle.timeRemaining > 0
              ? prev.tokenWars.currentBattle.timeRemaining - 1
              : 300,
          },
        },
        // Random player count updates
        liveStats: {
          ...prev.liveStats,
          playersOnline: prev.liveStats.playersOnline + Math.floor((Math.random() - 0.4) * 3),
        },
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [mounted]);

  // Add new activity periodically
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      const newActivity = generateMockActivity().slice(0, 1)[0];
      newActivity.id = `activity-${Date.now()}`;
      newActivity.timestamp = Date.now();

      setHomepageData(prev => ({
        ...prev,
        recentActivity: [newActivity, ...prev.recentActivity.slice(0, 19)],
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, [mounted]);

  // Connect to Token Wars socket for real-time battle data
  useEffect(() => {
    if (!mounted) return;

    const socket = getSocket();

    // Subscribe to Token Wars updates
    socket.emit('subscribe_token_wars');

    // Listen for Token Wars battle updates
    const handleTokenWarsBattle = (battle: {
      id: string;
      tokenA: { symbol: string };
      tokenB: { symbol: string };
      status: string;
      startTime?: number;
      endTime?: number;
      bettingEndsAt?: number;
      poolA: number;
      poolB: number;
    }) => {
      if (!battle) return;

      // Calculate time remaining
      let timeRemaining = 300;
      if (battle.status === 'betting' && battle.bettingEndsAt) {
        timeRemaining = Math.max(0, Math.floor((battle.bettingEndsAt - Date.now()) / 1000));
      } else if (battle.status === 'in_progress' && battle.endTime) {
        timeRemaining = Math.max(0, Math.floor((battle.endTime - Date.now()) / 1000));
      }

      setHomepageData(prev => ({
        ...prev,
        tokenWars: {
          currentBattle: {
            tokenA: {
              symbol: battle.tokenA.symbol,
              image: getTokenLogo(battle.tokenA.symbol),
              change: 0, // We don't have real-time price change data here
            },
            tokenB: {
              symbol: battle.tokenB.symbol,
              image: getTokenLogo(battle.tokenB.symbol),
              change: 0,
            },
            timeRemaining,
            totalPool: (battle.poolA || 0) + (battle.poolB || 0),
          },
        },
      }));
    };

    socket.on('token_wars_battle', handleTokenWarsBattle);

    return () => {
      socket.emit('unsubscribe_token_wars');
      socket.off('token_wars_battle', handleTokenWarsBattle);
    };
  }, [mounted]);

  if (!mounted) {
    return <PageLoading message="Welcome to DegenDome..." />;
  }

  // Get recent wins for the hero ticker (filter to only wins)
  const recentWins = homepageData.recentActivity
    .filter(a => a.type === 'win' || a.type === 'big_win' || a.type === 'victory')
    .slice(0, 10);

  const handleStartPlaying = () => {
    router.push('/predict');
  };

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      {/* Hero Section */}
      <HeroSection
        liveStats={homepageData.liveStats}
        recentWins={recentWins}
        walletConnected={!!publicKey}
        onStartPlaying={handleStartPlaying}
      />

      {/* Featured Game - Oracle */}
      <FeaturedGame oracle={homepageData.oracle} />

      {/* Game Grid */}
      <GameGrid
        arena={homepageData.arena}
        lds={homepageData.lds}
        tokenWars={homepageData.tokenWars}
        warParty={homepageData.warParty}
        stands={homepageData.stands}
      />

      {/* Live Activity Feed */}
      <LiveActivityFeed
        activities={homepageData.recentActivity}
        eventsLastHour={234}
      />

      {/* Social Proof / Stats */}
      <SocialProof stats={homepageData.platformStats} />

      {/* How It Works */}
      <HowItWorks onStartPlaying={handleStartPlaying} />
    </div>
  );
}
