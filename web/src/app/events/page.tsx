'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEvents, FightCardEvent } from '@/hooks/useEvents';
import { UpcomingEvents } from '@/components/events/UpcomingEvents';
import { BACKEND_URL } from '@/config/api';

// ============================================================
// Toggle this to false to fetch real data from the backend API
const USE_MOCK_DATA = true;
// ============================================================

// Mock wallet addresses for realistic display
const WALLETS = [
  'GCReth1111111111111111111111111111111111111',
  'Hsaka22222222222222222222222222222222222222',
  'CBlain3333333333333333333333333333333333333',
  'Pntosh4444444444444444444444444444444444444',
  'DFEdge5555555555555555555555555555555555555',
  'Blknz06666666666666666666666666666666666666',
  'CBShill7777777777777777777777777777777777777',
  'AltPsy8888888888888888888888888888888888888',
  'MoonBo9999999999999999999999999999999999999',
  'SolWhl0000000000000000000000000000000000000',
  'DgnKng1111111111111111111111111111111111112',
  'CrypAp2222222222222222222222222222222222223',
  'WAGMI33333333333333333333333333333333333334',
  'Rekt42444444444444444444444444444444444444445',
  'DiamHd5555555555555555555555555555555555556',
  'PumpIt6666666666666666666666666666666666667',
];

function generateMockEvents(): FightCardEvent[] {
  const now = Date.now();
  const HOUR = 3600_000;
  const DAY = 86400_000;

  return [
    // Tonight's main card - registration open
    {
      id: 'event-1',
      name: 'DOME WARS: FRIDAY FIGHT NIGHT',
      description: 'The weekly headliner. Top-ranked degens clash for glory and SOL.',
      scheduledStartTime: now + 4 * HOUR,
      registrationOpens: now - 2 * DAY,
      registrationCloses: now + 3 * HOUR,
      status: 'registration_open',
      entryFeeLamports: 1_000_000_000, // 1 SOL
      maxParticipants: 32,
      prizePoolLamports: 25_000_000_000,
      battles: [
        {
          id: 'b1-main',
          position: 0,
          player1Wallet: WALLETS[0],
          player2Wallet: WALLETS[1],
          isMainEvent: true,
          status: 'scheduled',
        },
        {
          id: 'b1-co',
          position: 1,
          player1Wallet: WALLETS[2],
          player2Wallet: WALLETS[3],
          isMainEvent: false,
          status: 'scheduled',
        },
        {
          id: 'b1-u1',
          position: 2,
          player1Wallet: WALLETS[4],
          player2Wallet: WALLETS[5],
          isMainEvent: false,
          status: 'scheduled',
        },
        {
          id: 'b1-u2',
          position: 3,
          player1Wallet: WALLETS[6],
          player2Wallet: WALLETS[7],
          isMainEvent: false,
          status: 'scheduled',
        },
      ],
    },

    // Tomorrow's card - upcoming
    {
      id: 'event-2',
      name: 'CT SHOWDOWN',
      description: "Crypto Twitter's finest enter the Dome. Who walks out with the bag?",
      scheduledStartTime: now + DAY + 6 * HOUR,
      registrationOpens: now + 12 * HOUR,
      registrationCloses: now + DAY + 5 * HOUR,
      status: 'upcoming',
      entryFeeLamports: 500_000_000, // 0.5 SOL
      maxParticipants: 16,
      prizePoolLamports: 8_000_000_000,
      battles: [
        {
          id: 'b2-main',
          position: 0,
          player1Wallet: WALLETS[8],
          player2Wallet: WALLETS[9],
          isMainEvent: true,
          status: 'scheduled',
        },
        {
          id: 'b2-co',
          position: 1,
          player1Wallet: WALLETS[10],
          player2Wallet: WALLETS[11],
          isMainEvent: false,
          status: 'scheduled',
        },
        {
          id: 'b2-u1',
          position: 2,
          player1Wallet: WALLETS[12],
          player2Wallet: WALLETS[13],
          isMainEvent: false,
          status: 'scheduled',
        },
      ],
    },

    // Live event right now
    {
      id: 'event-3',
      name: 'DEGEN INVITATIONAL',
      description: 'Invite-only showcase. High stakes, no mercy.',
      scheduledStartTime: now - 20 * 60_000, // started 20 min ago
      registrationOpens: now - DAY,
      registrationCloses: now - HOUR,
      status: 'in_progress',
      entryFeeLamports: 2_000_000_000, // 2 SOL
      maxParticipants: 8,
      prizePoolLamports: 15_000_000_000,
      battles: [
        {
          id: 'b3-main',
          position: 0,
          player1Wallet: WALLETS[14],
          player2Wallet: WALLETS[15],
          isMainEvent: true,
          status: 'in_progress',
        },
        {
          id: 'b3-co',
          position: 1,
          player1Wallet: WALLETS[0],
          player2Wallet: WALLETS[10],
          isMainEvent: false,
          status: 'completed',
        },
        {
          id: 'b3-u1',
          position: 2,
          player1Wallet: WALLETS[4],
          player2Wallet: WALLETS[8],
          isMainEvent: false,
          status: 'in_progress',
        },
      ],
    },

    // Weekend tournament - upcoming
    {
      id: 'event-4',
      name: 'WEEKEND WARFARE',
      description: 'Saturday night elimination bracket. 32 enter, 1 survives.',
      scheduledStartTime: now + 2 * DAY + 8 * HOUR,
      registrationOpens: now + DAY,
      registrationCloses: now + 2 * DAY + 7 * HOUR,
      status: 'upcoming',
      entryFeeLamports: 100_000_000, // 0.1 SOL
      maxParticipants: 32,
      prizePoolLamports: 3_000_000_000,
      battles: [
        {
          id: 'b4-main',
          position: 0,
          player1Wallet: WALLETS[2],
          player2Wallet: WALLETS[9],
          isMainEvent: true,
          status: 'scheduled',
        },
        {
          id: 'b4-u1',
          position: 1,
          player1Wallet: WALLETS[6],
          player2Wallet: WALLETS[11],
          isMainEvent: false,
          status: 'scheduled',
        },
      ],
    },

    // Completed event from earlier today
    {
      id: 'event-5',
      name: 'MORNING MAYHEM',
      description: 'Early birds get the SOL.',
      scheduledStartTime: now - 6 * HOUR,
      registrationOpens: now - DAY,
      registrationCloses: now - 7 * HOUR,
      status: 'completed',
      entryFeeLamports: 250_000_000,
      maxParticipants: 16,
      prizePoolLamports: 4_000_000_000,
      battles: [
        {
          id: 'b5-main',
          position: 0,
          player1Wallet: WALLETS[3],
          player2Wallet: WALLETS[7],
          isMainEvent: true,
          status: 'completed',
        },
        {
          id: 'b5-co',
          position: 1,
          player1Wallet: WALLETS[1],
          player2Wallet: WALLETS[5],
          isMainEvent: false,
          status: 'completed',
        },
        {
          id: 'b5-u1',
          position: 2,
          player1Wallet: WALLETS[13],
          player2Wallet: WALLETS[15],
          isMainEvent: false,
          status: 'completed',
        },
      ],
    },
  ];
}

export default function EventsPage() {
  const { publicKey, connected } = useWallet();
  const { events: apiEvents, loading: apiLoading, error: apiError, refetch } = useEvents();
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribing, setSubscribing] = useState(false);

  // Use mock data or real API data
  const events = USE_MOCK_DATA ? generateMockEvents() : apiEvents;
  const loading = USE_MOCK_DATA ? false : apiLoading;
  const error = USE_MOCK_DATA ? null : apiError;

  const handleSubscribe = useCallback(async (eventId: string) => {
    if (USE_MOCK_DATA) {
      // Mock subscribe - just toggle locally
      setSubscribedIds(prev => new Set([...prev, eventId]));
      return;
    }

    if (!connected || !publicKey) {
      alert('Please connect your wallet to subscribe');
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/events/${eventId}/subscribe`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet: publicKey.toBase58() })
        }
      );

      if (!res.ok) throw new Error('Failed to subscribe');

      setSubscribedIds(prev => new Set([...prev, eventId]));
    } catch (err) {
      console.error('Subscribe error:', err);
      alert('Failed to subscribe to event');
    } finally {
      setSubscribing(false);
    }
  }, [connected, publicKey]);

  return (
    <main className="min-h-screen bg-primary">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Fight Cards</h1>
          <p className="text-white/60">
            Upcoming scheduled events and tournaments. Subscribe to get notified when events start.
          </p>
        </div>

        {/* Status indicators */}
        <div className="flex gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning"></span>
            <span className="text-white/50">Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-white/50">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/30"></span>
            <span className="text-white/50">Completed</span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-warning"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-danger mb-4">{error}</p>
            <button
              onClick={() => refetch()}
              className="text-warning hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <UpcomingEvents
            events={events}
            onSubscribe={handleSubscribe}
            subscribedIds={subscribedIds}
          />
        )}
      </div>
    </main>
  );
}
