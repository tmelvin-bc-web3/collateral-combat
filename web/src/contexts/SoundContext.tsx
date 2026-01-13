'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSound, UseSoundReturn, SoundType } from '@/hooks/useSound';

interface SoundContextType extends UseSoundReturn {}

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const sound = useSound();

  return (
    <SoundContext.Provider value={sound}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext(): SoundContextType {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
}

export type { SoundType };
