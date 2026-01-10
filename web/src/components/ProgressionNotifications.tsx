'use client';

import { useProgressionContext } from '@/contexts/ProgressionContext';
import { XpToast, LevelUpModal } from './progression';

export function ProgressionNotifications() {
  const { xpGain, dismissXpGain, levelUpData, dismissLevelUp } = useProgressionContext();

  return (
    <>
      <XpToast xpGain={xpGain} onDismiss={dismissXpGain} />
      <LevelUpModal levelUpData={levelUpData} onDismiss={dismissLevelUp} />
    </>
  );
}
