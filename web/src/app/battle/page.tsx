'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BattleProvider, useBattleContext } from '@/contexts/BattleContext';
import { BattleLobby } from '@/components/BattleLobby';
import { BattleArena } from '@/components/BattleArena';

function BattleContent() {
  const { battle } = useBattleContext();

  // If in an active or completed battle, show the arena
  if (battle && (battle.status === 'active' || battle.status === 'completed')) {
    return <BattleArena battle={battle} />;
  }

  // Otherwise show the lobby
  return <BattleLobby />;
}

function BattleWithWallet() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  return (
    <BattleProvider walletAddress={walletAddress}>
      <BattleContent />
    </BattleProvider>
  );
}

export default function BattlePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <BattleWithWallet />;
}
