'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEvents } from '@/hooks/useEvents';
import { UpcomingEvents } from '@/components/events/UpcomingEvents';
import { BACKEND_URL } from '@/config/api';

export default function EventsPage() {
  const { publicKey, connected } = useWallet();
  const { events, loading, error, refetch } = useEvents();
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = useCallback(async (eventId: string) => {
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
