'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';

const TOAST_ICONS: Record<string, string> = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
};

const TOAST_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'text-yellow-400',
  },
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
  },
};

interface ToastItemProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  onDismiss: (id: string) => void;
}

function ToastItem({ id, type, title, description, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);

    // Trigger exit animation before removal
    const exitTimer = setTimeout(() => setIsVisible(false), 3700);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  const styles = TOAST_STYLES[type];
  const icon = TOAST_ICONS[type];

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-out',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div
        className={cn(
          'bg-gray-800/95 backdrop-blur-sm border rounded-lg px-4 py-3 shadow-xl min-w-[280px] max-w-[400px]',
          styles.bg,
          styles.border
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className={cn('text-lg font-bold', styles.icon)}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{title}</p>
            {description && (
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(id)}
            className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Dismiss toast"
          >
            <span className="text-lg">&times;</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  const container = (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          description={toast.description}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );

  return createPortal(container, document.body);
}
