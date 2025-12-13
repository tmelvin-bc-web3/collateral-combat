'use client';

import { useProfileContext } from '@/contexts/ProfileContext';
import { ProfileSetup } from './ProfileSetup';

export function ProfileSetupWrapper() {
  const { needsSetup, completeSetup } = useProfileContext();

  if (!needsSetup) return null;

  return <ProfileSetup onComplete={completeSetup} />;
}
