'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';

export interface FightCardEvent {
  id: string;
  name: string;
  description?: string;
  scheduledStartTime: number;
  registrationOpens: number;
  registrationCloses: number;
  status: 'upcoming' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled';
  entryFeeLamports: number;
  maxParticipants: number;
  prizePoolLamports: number;
  battles: EventBattle[];
}

export interface EventBattle {
  id: string;
  position: number;
  player1Wallet: string;
  player2Wallet: string;
  battleId?: string;
  isMainEvent: boolean;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export function useEvents() {
  const [events, setEvents] = useState<FightCardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    // Subscribe to event updates
    const socket = getSocket();
    socket.on('event_update' as any, (data: { eventId: string } & Partial<FightCardEvent>) => {
      setEvents(prev => prev.map(e => e.id === data.eventId ? { ...e, ...data } : e));
    });

    return () => {
      socket.off('event_update' as any);
    };
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<FightCardEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/events/${eventId}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        setEvent(data.event);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    // Join event room for updates
    const socket = getSocket();
    socket.emit('join_event_room' as any, eventId);
    socket.on('event_update' as any, (data: { eventId: string } & Partial<FightCardEvent>) => {
      if (data.eventId === eventId) {
        setEvent(prev => prev ? { ...prev, ...data } : null);
      }
    });

    return () => {
      socket.emit('leave_event_room' as any, eventId);
      socket.off('event_update' as any);
    };
  }, [eventId]);

  return { event, loading, error };
}
