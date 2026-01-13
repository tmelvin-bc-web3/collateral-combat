'use client';

import { useProgressionContext } from '@/contexts/ProgressionContext';
import { XpToast, RebateToast, LevelUpModal } from './progression';

export function ProgressionNotifications() {
  const {
    xpGain,
    dismissXpGain,
    levelUpData,
    dismissLevelUp,
    rebateReceived,
    dismissRebateReceived,
  } = useProgressionContext();

  return (
    <>
      <XpToast xpGain={xpGain} onDismiss={dismissXpGain} />
      <RebateToast rebateReceived={rebateReceived} onDismiss={dismissRebateReceived} />
      <LevelUpModal levelUpData={levelUpData} onDismiss={dismissLevelUp} />
    </>
  );
}
