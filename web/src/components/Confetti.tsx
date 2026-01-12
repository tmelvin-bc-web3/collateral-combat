'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  drift: number;
}

interface ConfettiProps {
  /** Whether confetti is currently active */
  isActive: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Duration of the confetti animation in ms (default: 3000) */
  duration?: number;
  /** Number of confetti pieces (default: 100) */
  pieceCount?: number;
}

// Celebration colors matching the app theme
const CONFETTI_COLORS = [
  '#a855f7', // purple
  '#6366f1', // indigo
  '#22d3ee', // cyan
  '#facc15', // yellow
  '#f472b6', // pink
  '#7fba00', // success green
  '#ff5500', // accent orange
  '#e63900', // fire
];

function generateConfettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 100,
  }));
}

/**
 * Confetti animation component for celebrating level ups and achievements.
 * Renders a full-screen confetti burst effect that automatically cleans up.
 */
export function Confetti({
  isActive,
  onComplete,
  duration = 3000,
  pieceCount = 100,
}: ConfettiProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const pieces = useMemo(
    () => (isActive ? generateConfettiPieces(pieceCount) : []),
    [isActive, pieceCount]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete]);

  if (!mounted || !visible || pieces.length === 0) {
    return null;
  }

  const confetti = (
    <div
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            width: piece.size,
            height: piece.size * 0.6,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            ['--confetti-drift' as string]: `${piece.drift}px`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--confetti-drift, 0px)) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );

  return createPortal(confetti, document.body);
}

interface LevelUpConfettiProps {
  /** The new level achieved - triggers confetti on milestone levels */
  level: number | null;
  /** Callback when confetti animation completes */
  onComplete?: () => void;
}

// Milestone levels that trigger confetti (every 5 levels)
const MILESTONE_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/**
 * Specialized confetti component for level up celebrations.
 * Automatically triggers on milestone levels (every 5 levels).
 */
export function LevelUpConfetti({ level, onComplete }: LevelUpConfettiProps) {
  const [activeLevel, setActiveLevel] = useState<number | null>(null);

  useEffect(() => {
    if (level !== null && MILESTONE_LEVELS.includes(level)) {
      setActiveLevel(level);
    }
  }, [level]);

  const handleComplete = useCallback(() => {
    setActiveLevel(null);
    onComplete?.();
  }, [onComplete]);

  return (
    <Confetti
      isActive={activeLevel !== null}
      onComplete={handleComplete}
      duration={4000}
      pieceCount={150}
    />
  );
}

/**
 * Hook for programmatically triggering confetti
 */
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const triggerConfetti = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  return {
    isActive,
    triggerConfetti,
    handleComplete,
    ConfettiComponent: (
      <Confetti
        isActive={isActive}
        onComplete={handleComplete}
        duration={3000}
        pieceCount={100}
      />
    ),
  };
}
