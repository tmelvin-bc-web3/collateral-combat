'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { ChallengeBoard, CreateChallengeModal } from '@/components/challenges';
import { useChallenges } from '@/hooks/useChallenges';
import { Swords, Bell } from 'lucide-react';

export default function ChallengesPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();
  const wallet = publicKey?.toBase58();

  const { challenges, directChallenges, loading, createChallenge, fetchDirectChallenges } = useChallenges({
    excludeWallet: wallet,
    autoRefresh: true,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch direct challenges when wallet connects
  useEffect(() => {
    if (wallet) {
      fetchDirectChallenges(wallet);
    }
  }, [wallet, fetchDirectChallenges]);

  const handleAccept = async (code: string) => {
    if (!connected) {
      alert('Please connect your wallet');
      return;
    }
    // Navigate to battle page with challenge code - battle page handles the actual acceptance
    router.push(`/battle?challenge=${code}`);
  };

  const handleCreateChallenge = async (params: {
    entryFee: number;
    leverage: number;
    duration: number;
    targetWallet?: string;
  }) => {
    if (!wallet) throw new Error('Wallet not connected');
    await createChallenge({
      challengerWallet: wallet,
      ...params,
    });
  };

  return (
    <div className="min-h-screen bg-primary py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <Swords className="w-10 h-10 text-warning" />
          <div>
            <h1 className="text-3xl font-black text-white">Fight Board</h1>
            <p className="text-white/60">Find an opponent or throw down a challenge</p>
          </div>
        </div>

        {/* Direct Challenges Alert */}
        {directChallenges.length > 0 && (
          <div className="mb-6 p-4 bg-warning/10 border border-warning/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-warning" />
              <div>
                <h3 className="font-bold text-warning">
                  You have {directChallenges.length} direct challenge{directChallenges.length > 1 ? 's' : ''}!
                </h3>
                <p className="text-sm text-white/60">Someone wants to fight you specifically</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {directChallenges.slice(0, 2).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAccept(c.code)}
                  className="flex justify-between items-center p-3 bg-black/40 rounded-lg hover:bg-black/60 transition-colors"
                >
                  <span className="text-sm">{c.entryFee} SOL | {c.leverage}x | {Math.floor(c.duration / 60)}m</span>
                  <span className="text-xs text-warning font-bold">Accept</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Challenge Board */}
        <ChallengeBoard
          challenges={challenges}
          currentWallet={wallet}
          onAccept={handleAccept}
          onCreateChallenge={() => setShowCreateModal(true)}
          loading={loading}
        />

        {/* Create Modal */}
        <CreateChallengeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateChallenge}
        />
      </div>
    </div>
  );
}
