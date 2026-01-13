'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Sound paths for all available sounds
export const SOUND_PATHS = {
  // Betting sounds
  win: '/sounds/win.mp3',
  loss: '/sounds/loss.mp3',
  betPlaced: '/sounds/bet-placed.mp3',
  countdownTick: '/sounds/countdown-tick.mp3',
  lock: '/sounds/lock.mp3',
  // UI sounds
  buttonClick: '/sounds/button-click.mp3',
  levelUp: '/sounds/level-up.mp3',
  achievement: '/sounds/achievement.mp3',
} as const;

export type SoundType = keyof typeof SOUND_PATHS;

const LOCAL_STORAGE_MUTE_KEY = 'degendome_sound_muted';
const LOCAL_STORAGE_VOLUME_KEY = 'degendome_sound_volume';

const DEFAULT_VOLUME = 0.7;

export interface UseSoundReturn {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  play: (sound: SoundType) => void;
  // Betting sounds
  playWin: () => void;
  playLoss: () => void;
  playBetPlaced: () => void;
  playCountdownTick: () => void;
  playLock: () => void;
  // UI sounds
  playButtonClick: () => void;
  playLevelUp: () => void;
  playAchievement: () => void;
}

export function useSound(): UseSoundReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMuted = localStorage.getItem(LOCAL_STORAGE_MUTE_KEY);
    if (storedMuted !== null) {
      setIsMuted(storedMuted === 'true');
    }

    const storedVolume = localStorage.getItem(LOCAL_STORAGE_VOLUME_KEY);
    if (storedVolume !== null) {
      const parsedVolume = parseFloat(storedVolume);
      if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) {
        setVolumeState(parsedVolume);
      }
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
    localStorage.setItem(LOCAL_STORAGE_MUTE_KEY, String(isMuted));
  }, [isMuted]);

  // Persist volume preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_VOLUME_KEY, String(volume));
  }, [volume]);

  // Update audio element volumes when volume changes
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  }, []);

  const play = useCallback(
    (sound: SoundType) => {
      if (isMuted) return;

      const audio = audioRefs.current.get(sound);
      if (audio) {
        // Reset to start if already playing
        audio.currentTime = 0;
        audio.volume = volume;
        audio.play().catch(() => {
          // Silently handle autoplay restrictions
        });
      }
    },
    [isMuted, volume]
  );

  // Betting sounds
  const playWin = useCallback(() => play('win'), [play]);
  const playLoss = useCallback(() => play('loss'), [play]);
  const playBetPlaced = useCallback(() => play('betPlaced'), [play]);
  const playCountdownTick = useCallback(() => play('countdownTick'), [play]);
  const playLock = useCallback(() => play('lock'), [play]);

  // UI sounds
  const playButtonClick = useCallback(() => play('buttonClick'), [play]);
  const playLevelUp = useCallback(() => play('levelUp'), [play]);
  const playAchievement = useCallback(() => play('achievement'), [play]);

  return {
    isMuted,
    volume,
    toggleMute,
    setMuted,
    setVolume,
    play,
    // Betting sounds
    playWin,
    playLoss,
    playBetPlaced,
    playCountdownTick,
    playLock,
    // UI sounds
    playButtonClick,
    playLevelUp,
    playAchievement,
  };
}
