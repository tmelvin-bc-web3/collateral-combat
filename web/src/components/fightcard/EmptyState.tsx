'use client';

import Link from 'next/link';
import { Swords, Clock, Calendar } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-live' | 'no-upcoming' | 'no-battles';
  nextScheduledTime?: number; // timestamp for next event
}

export function EmptyState({ type, nextScheduledTime }: EmptyStateProps) {
  const messages = {
    'no-live': {
      icon: <Clock className="w-8 h-8" />,
      title: 'No Live Battles Right Now',
      description: 'Check back soon or be the first to start a battle!',
    },
    'no-upcoming': {
      icon: <Calendar className="w-8 h-8" />,
      title: 'No Upcoming Battles Scheduled',
      description: 'Create a battle and challenge other fighters.',
    },
    'no-battles': {
      icon: <Swords className="w-8 h-8" />,
      title: 'The Arena Awaits',
      description: 'No battles are currently active. Step into the ring and start the action!',
    },
  };

  const { icon, title, description } = messages[type];

  // Format next scheduled time if provided
  const formatNextTime = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Next event in ${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `Next event in ${hours}h ${minutes}m`;
    }

    return `Next event in ${minutes}m`;
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Icon with crossed swords effect */}
      <div className="relative mb-4">
        <div className="text-white/20">{icon}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Swords className="w-12 h-12 text-white/5" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white/60 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-sm text-white/40 max-w-xs mb-4">{description}</p>

      {/* Next scheduled time if available */}
      {nextScheduledTime && formatNextTime(nextScheduledTime) && (
        <p className="text-xs text-warning/60 mb-4">
          {formatNextTime(nextScheduledTime)}
        </p>
      )}

      {/* CTA to start a battle */}
      <Link
        href="/battle"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
      >
        <Swords className="w-4 h-4" />
        Be the First to Fight!
      </Link>
    </div>
  );
}
