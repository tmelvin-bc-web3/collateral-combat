'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const SOUND_PATHS = {
  win: '/sounds/win.mp3',
  loss: '/sounds/loss.mp3',
} as const;

type SoundType = keyof typeof SOUND_PATHS;

const LOCAL_STORAGE_KEY = 'degendome_sound_muted';

interface UseSoundReturn {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  playWin: () => void;
  playLoss: () => void;
  play: (sound: SoundType) => void;
}

export function useSound(): UseSoundReturn {
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // Load mute preference from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored !== null) {
      setIsMuted(stored === 'true');
    }

    // Preload audio elements
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioRefs.current.set(key as SoundType, audio);
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Persist mute preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const play = useCallback(
    (sound: SoundType) => {
      if (isMuted) return;

      const audio = audioRefs.current.get(sound);
      if (audio) {
        // Reset to start if already playing
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
    },
    [isMuted]
  );

  const playWin = useCallback(() => {
    play('win');
  }, [play]);

  const playLoss = useCallback(() => {
    play('loss');
  }, [play]);

  return {
    isMuted,
    toggleMute,
    setMuted,
    playWin,
    playLoss,
    play,
  };
}
