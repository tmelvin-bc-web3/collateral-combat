'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ReferralStats as ReferralStatsType, Referral } from '@/types';
import { UserAvatar, getDisplayName } from '../UserAvatar';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}

function truncateWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

interface ReferralRowProps {
  referral: Referral;
}

function ReferralRow({ referral }: ReferralRowProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg">
      <div className="flex items-center gap-2">
        <UserAvatar walletAddress={referral.referredWallet} size="sm" />
        <span className="text-sm text-text-secondary">
          {truncateWallet(referral.referredWallet)}
        </span>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        referral.status === 'active'
          ? 'bg-success/20 text-success'
          : referral.status === 'pending'
          ? 'bg-warning/20 text-warning'
          : 'bg-danger/20 text-danger'
      }`}>
        {referral.status}
      </span>
    </div>
  );
}

export function ReferralStatsComponent() {
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() || '';

  const [stats, setStats] = useState<ReferralStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/referral/${walletAddress}/stats`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch referral stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [walletAddress]);

  const copyCode = () => {
    if (stats?.myCode) {
      navigator.clipboard.writeText(stats.myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = () => {
    if (stats?.myCode) {
      const link = `${window.location.origin}?ref=${stats.myCode}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!walletAddress) {
    return (
      <div className="text-center text-text-tertiary py-8">
        Connect your wallet to view referrals
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-text-tertiary py-8">
        Failed to load referral stats
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Your Referral Code */}
      <div className="bg-bg-tertiary rounded-lg p-4">
        <div className="text-xs text-text-tertiary mb-2">Your Referral Code</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-bg-primary border border-border-primary rounded-lg px-3 py-2 font-mono text-lg tracking-wider">
            {stats.myCode}
          </div>
          <button
            onClick={copyCode}
            className="px-3 py-2 bg-accent hover:bg-accent/80 rounded-lg transition-colors text-sm font-medium"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={copyLink}
          className="mt-2 w-full text-xs text-accent hover:text-accent/80 transition-colors"
        >
          Copy Share Link
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-accent">{stats.totalReferrals}</div>
          <div className="text-xs text-text-tertiary">Total Referrals</div>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-success">{stats.activeReferrals}</div>
          <div className="text-xs text-text-tertiary">Active</div>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-warning">{stats.totalXpEarned}</div>
          <div className="text-xs text-text-tertiary">XP Earned</div>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-fire">{stats.totalRakeEarned.toFixed(4)}</div>
          <div className="text-xs text-text-tertiary">SOL Kickback</div>
        </div>
      </div>

      {/* Your Discount Status */}
      {stats.hasDiscount && stats.discountExpiresAt && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-success">Referral Discount Active</div>
              <div className="text-xs text-success/70">9% rake (1% off)</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-success">
                {formatTimeRemaining(stats.discountExpiresAt)}
              </div>
              <div className="text-xs text-success/70">remaining</div>
            </div>
          </div>
        </div>
      )}

      {/* Referral Rewards Info */}
      <div className="bg-bg-tertiary rounded-lg p-3 text-xs text-text-tertiary">
        <div className="font-medium text-text-secondary mb-2">Referral Rewards</div>
        <div className="space-y-1">
          <div>+ 10% XP bonus from referrals' activity</div>
          <div>+ 1% rake kickback from referrals' fees</div>
          <div className="pt-1 border-t border-border-primary mt-2">
            Referred users get 9% rake (1% off) for 7 days
          </div>
        </div>
      </div>

      {/* Referral List */}
      {stats.referrals.length > 0 && (
        <div>
          <div className="text-xs text-text-tertiary mb-2">Your Referrals</div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {stats.referrals.map((referral) => (
              <ReferralRow key={referral.id} referral={referral} />
            ))}
          </div>
        </div>
      )}

      {stats.referrals.length === 0 && (
        <div className="text-center text-text-tertiary py-4 text-sm">
          No referrals yet. Share your code to earn rewards!
        </div>
      )}
    </div>
  );
}
