'use client';

import { useState, useEffect, useRef } from 'react';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useFirstBetContext } from '@/contexts/FirstBetContext';
import { ProfileSetup } from './ProfileSetup';

/**
 * ProfileSetupWrapper - Gates profile setup modal on first bet completion
 *
 * Profile setup ONLY appears after:
 * 1. User has placed their first bet (hasPlacedFirstBet = true)
 * 2. Celebration animation has ended (showCelebration = false)
 * 3. A 500ms delay after celebration dismisses (breathing room)
 *
 * This ensures users can bet immediately after connecting wallet,
 * experience the celebration, then get prompted to personalize their profile.
 */
export function ProfileSetupWrapper() {
  const { needsSetup, completeSetup } = useProfileContext();
  const { hasPlacedFirstBet, showCelebration } = useFirstBetContext();

  // Track when celebration ended to add delay
  const [showDelayedSetup, setShowDelayedSetup] = useState(false);
  const prevShowCelebration = useRef(showCelebration);

  // Detect when celebration ends and add 500ms delay before showing profile setup
  useEffect(() => {
    // Celebration just ended (was true, now false)
    if (prevShowCelebration.current && !showCelebration) {
      const timer = setTimeout(() => {
        setShowDelayedSetup(true);
      }, 500);

      return () => clearTimeout(timer);
    }

    // If celebration is showing, reset the delayed setup state
    if (showCelebration) {
      setShowDelayedSetup(false);
    }

    prevShowCelebration.current = showCelebration;
  }, [showCelebration]);

  // Also allow showing setup if user already had first bet before this session
  // (no celebration to wait for)
  useEffect(() => {
    if (hasPlacedFirstBet && !showCelebration && !prevShowCelebration.current) {
      // User already had first bet from previous session - no celebration, show immediately
      setShowDelayedSetup(true);
    }
  }, [hasPlacedFirstBet, showCelebration]);

  // Gate conditions:
  // 1. Profile needs setup (no custom profile, not skipped)
  // 2. User has placed first bet
  // 3. Celebration is not showing
  // 4. Delay has passed OR user already had first bet (no celebration)
  const shouldShowSetup =
    needsSetup &&
    hasPlacedFirstBet &&
    !showCelebration &&
    showDelayedSetup;

  if (!shouldShowSetup) return null;

  return <ProfileSetup onComplete={completeSetup} />;
}
