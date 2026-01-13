'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { RebateReceivedEvent } from '@/types';

interface RebateToastProps {
  rebateReceived: RebateReceivedEvent | null;
  onDismiss: () => void;
}

export function RebateToast({ rebateReceived, onDismiss }: RebateToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (rebateReceived) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, 4000); // Show rebate toast longer
      return () => clearTimeout(timer);
    }
  }, [rebateReceived, onDismiss]);

  if (!mounted || !rebateReceived) return null;

  const rebateAmount = rebateReceived.rebate.rebateLamports / 1e9;
  const effectiveRate = rebateReceived.rebate.effectiveFeeBps / 100;

  const toast = (
    <div
      className={cn(
        'fixed top-20 right-4 z-50 transition-all duration-300',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="bg-gray-800/95 backdrop-blur-sm border border-success/50 rounded-lg px-4 py-3 shadow-xl min-w-[240px]">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-success">Rebate Received!</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-lg font-black text-white font-mono">
                +{rebateAmount.toFixed(4)} SOL
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {effectiveRate}% effective rate via rake perk
            </p>
          </div>
        </div>
        {rebateReceived.rebate.rebateTxSignature && (
          <a
            href={`https://solscan.io/tx/${rebateReceived.rebate.rebateTxSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 text-[10px] text-success/70 hover:text-success truncate"
          >
            View on Solscan &rarr;
          </a>
        )}
      </div>
    </div>
  );

  return createPortal(toast, document.body);
}
