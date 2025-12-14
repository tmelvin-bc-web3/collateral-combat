'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TourStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="logo"]',
    title: 'Welcome to Collateral Combat!',
    description: 'A PvP trading arena where you compete head-to-head. Let me show you around.',
    position: 'bottom',
  },
  {
    id: 'predict',
    target: '[data-tour="predict"]',
    title: 'UP or DOWN',
    description: 'Predict if SOL will go up or down in the next 30 seconds. Simple, fast, and exciting!',
    position: 'bottom',
  },
  {
    id: 'battle',
    target: '[data-tour="battle"]',
    title: 'Battle Arena',
    description: 'Enter 1v1 trading battles. Trade with leverage, best P&L wins the pot!',
    position: 'bottom',
  },
  {
    id: 'draft',
    target: '[data-tour="draft"]',
    title: 'Memecoin Draft',
    description: 'Build a team of 6 memecoins in weekly tournaments. Use power-ups strategically to boost your score!',
    position: 'bottom',
  },
  {
    id: 'spectate',
    target: '[data-tour="spectate"]',
    title: 'Watch & Bet',
    description: 'Spectate live battles and place bets on who you think will win.',
    position: 'bottom',
  },
  {
    id: 'wallet',
    target: '[data-tour="wallet"]',
    title: 'Connect Your Wallet',
    description: 'Connect your Solana wallet to start playing. Your profile and stats will be saved.',
    position: 'bottom',
  },
];

const STORAGE_KEY = 'collateral-combat-tour-completed';

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if tour was already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay to let the page render
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    const element = document.querySelector(step.target);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isActive]);

  useEffect(() => {
    updateTargetPosition();

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsActive(false);
  };

  if (!mounted || !isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Center on screen if no target found
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        };
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left,
        };
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-[100]">
      {/* Dark overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-accent rounded-xl pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="absolute w-80 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl overflow-hidden"
        style={getTooltipStyle()}
      >
        {/* Progress bar */}
        <div className="h-1 bg-bg-tertiary">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-tertiary font-medium">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Content */}
          <h3 className="text-lg font-bold mb-2">{step.title}</h3>
          <p className="text-sm text-text-secondary mb-5">{step.description}</p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isFirstStep
                  ? 'text-text-tertiary cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-5 py-2 text-sm font-semibold bg-accent text-bg-primary rounded-lg hover:bg-accent/90 transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

// Export function to restart tour (for settings/help)
export function restartTour() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}
