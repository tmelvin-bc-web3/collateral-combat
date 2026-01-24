'use client';

import { FightCardEvent } from '@/hooks/useEvents';
import { FightCard } from './FightCard';

interface UpcomingEventsProps {
  events: FightCardEvent[];
  onSubscribe?: (eventId: string) => void;
  subscribedIds?: Set<string>;
}

export function UpcomingEvents({ events, onSubscribe, subscribedIds = new Set() }: UpcomingEventsProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-white/50">
        <p className="text-lg">No upcoming events</p>
        <p className="text-sm mt-2">Check back soon for scheduled fight cards!</p>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = new Date(event.scheduledStartTime).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, FightCardEvent[]>);

  return (
    <div className="space-y-8">
      {Object.entries(eventsByDate).map(([date, dateEvents]) => (
        <div key={date}>
          <h3 className="text-white/50 text-sm uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            {date}
          </h3>
          <div className="space-y-4">
            {dateEvents.map(event => (
              <FightCard
                key={event.id}
                event={event}
                onSubscribe={() => onSubscribe?.(event.id)}
                isSubscribed={subscribedIds.has(event.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
