'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { XpGainEvent } from '@/types';

interface XpToastProps {
  xpGain: XpGainEvent | null;
  onDismiss: () => void;
}

// Get source icon based on XP source
function getSourceIcon(source: string): string {
  switch (source) {
    case 'battle':
      return '/icons/battle.svg';
    case 'prediction':
      return '/icons/prediction.svg';
    case 'draft':
      return '/icons/draft.svg';
    case 'spectator':
      return '/icons/spectator.svg';
    default:
      return '/icons/xp.svg';
  }
}

// Get source color
function getSourceColor(source: string): string {
  switch (source) {
    case 'battle':
      return 'text-red-400';
    case 'prediction':
      return 'text-green-400';
    case 'draft':
      return 'text-blue-400';
    case 'spectator':
      return 'text-yellow-400';
    default:
      return 'text-purple-400';
  }
}

export function XpToast({ xpGain, onDismiss }: XpToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (xpGain) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, 2700);
      return () => clearTimeout(timer);
    }
  }, [xpGain, onDismiss]);

  if (!mounted || !xpGain) return null;

  const toast = (
    <div
      className={cn(
        'fixed top-20 right-4 z-50 transition-all duration-300',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-xl min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="text-xl font-bold text-purple-400">+{xpGain.amount}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-white">XP Earned</span>
              <span className={cn('text-xs', getSourceColor(xpGain.source))}>
                ({xpGain.source})
              </span>
            </div>
            <p className="text-xs text-gray-400 truncate">{xpGain.description}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}
