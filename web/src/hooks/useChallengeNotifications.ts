'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { ChallengeAcceptedNotification } from '@/types';

interface UseChallengeNotificationsOptions {
  walletAddress: string | null;
  enabled?: boolean;
}

export function useChallengeNotifications({
  walletAddress,
  enabled = true,
}: UseChallengeNotificationsOptions) {
  const [notification, setNotification] = useState<ChallengeAcceptedNotification | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check initial notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[ChallengeNotifications] Notifications not supported');
      return 'denied' as NotificationPermission;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (err) {
      console.error('[ChallengeNotifications] Permission request failed:', err);
      return 'denied' as NotificationPermission;
    }
  }, []);

  // Subscribe to challenge notifications
  useEffect(() => {
    if (!walletAddress || !enabled) return;

    const socket = getSocket();

    // Subscribe to challenge notifications
    socket.emit('subscribe_challenge_notifications', walletAddress);
    console.log('[ChallengeNotifications] Subscribed for wallet:', walletAddress.slice(0, 8));

    const handleChallengeAccepted = (data: ChallengeAcceptedNotification) => {
      console.log('[ChallengeNotifications] Challenge accepted!', data);

      // Set notification state
      setNotification(data);

      // Play sound
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('/sounds/match-found.mp3');
        }
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0.6;
        audioRef.current.play().catch(err => {
          console.log('[ChallengeNotifications] Audio play failed:', err);
        });
      } catch {
        console.log('[ChallengeNotifications] Audio not available');
      }

      // Show browser notification if permitted
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const browserNotification = new Notification('Challenge Accepted!', {
            body: `Your friend has joined the battle. Click to fight!`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `challenge-${data.challengeId}`,
            requireInteraction: true,
          });

          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
          };
        } catch (err) {
          console.log('[ChallengeNotifications] Browser notification failed:', err);
        }
      }
    };

    socket.on('challenge_accepted', handleChallengeAccepted);

    return () => {
      socket.off('challenge_accepted', handleChallengeAccepted);
      socket.emit('unsubscribe_challenge_notifications', walletAddress);
      console.log('[ChallengeNotifications] Unsubscribed');
    };
  }, [walletAddress, enabled]);

  // Clear notification
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Check if notifications are supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  return {
    notification,
    clearNotification,
    requestPermission,
    notificationPermission,
    isSupported,
  };
}
