'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageLoading } from '@/components/ui/skeleton';
import { ProfileComparison, EloTier } from '@/components/profile';
import { BACKEND_URL } from '@/config/api';

interface FighterData {
  wallet: string;
  displayName: string;
  elo: number;
  tier: EloTier;
  battleCount: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  roi: number;
  recentForm: Array<{ result: 'win' | 'loss' | 'tie'; pnlPercent: number; endedAt: number }>;
}

interface ComparisonData {
  fighter1: FighterData;
  fighter2: FighterData;
}

function formatWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ComparisonPage() {
  const params = useParams();
  const wallet1 = params.wallet as string;
  const wallet2 = params.opponent as string;

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet1 || !wallet2) return;

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch comparison data from backend
        const [compareRes, profile1Res, profile2Res, form1Res, form2Res] = await Promise.all([
          fetch(`${BACKEND_URL}/api/battles/compare/${wallet1}/${wallet2}`),
          fetch(`${BACKEND_URL}/api/profile/${wallet1}`),
          fetch(`${BACKEND_URL}/api/profile/${wallet2}`),
          fetch(`${BACKEND_URL}/api/battles/form/${wallet1}?limit=5`),
          fetch(`${BACKEND_URL}/api/battles/form/${wallet2}?limit=5`),
        ]);

        if (!compareRes.ok) {
          throw new Error('Failed to fetch comparison data');
        }

        const compareData = await compareRes.json();
        const profile1 = profile1Res.ok ? await profile1Res.json() : null;
        const profile2 = profile2Res.ok ? await profile2Res.json() : null;
        const form1Data = form1Res.ok ? await form1Res.json() : { form: [] };
        const form2Data = form2Res.ok ? await form2Res.json() : { form: [] };

        setComparison({
          fighter1: {
            ...compareData.fighter1,
            displayName: profile1?.username || formatWallet(wallet1),
            recentForm: form1Data.form || [],
          },
          fighter2: {
            ...compareData.fighter2,
            displayName: profile2?.username || formatWallet(wallet2),
            recentForm: form2Data.form || [],
          },
        });
      } catch (err) {
        console.error('Failed to fetch comparison:', err);
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [wallet1, wallet2]);

  if (loading) {
    return <PageLoading message="Loading comparison..." />;
  }

  if (error || !comparison) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="card border border-danger/30 p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Error Loading Comparison</h2>
          <p className="text-text-secondary mb-4">{error || 'Unable to load data'}</p>
          <Link href={`/profile/${wallet1}`} className="btn btn-primary">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/profile/${wallet1}`}
          className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1 text-sm mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Fighter Comparison
        </h1>
        <p className="text-text-secondary mt-1">
          Head-to-head stat comparison
        </p>
      </div>

      {/* Comparison Component */}
      <div className="relative">
        <ProfileComparison
          fighter1={comparison.fighter1}
          fighter2={comparison.fighter2}
        />
      </div>

      {/* Challenge Button */}
      <div className="mt-8 text-center">
        <Link
          href={`/battle?challenge=${wallet1}`}
          className="btn btn-primary btn-lg"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Challenge to Battle
        </Link>
      </div>
    </div>
  );
}
