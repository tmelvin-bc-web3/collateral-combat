'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import bs58 from 'bs58';

interface WaitlistEntry {
  id: string;
  email: string;
  walletAddress?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  position: number;
  tier: string;
  createdAt: number;
  utmSource?: string;
  utmCampaign?: string;
}

interface WaitlistData {
  entries: WaitlistEntry[];
  total: number;
  stats: {
    totalSignups: number;
    totalReferrals: number;
    tierBreakdown: Record<string, number>;
  };
}

const TIER_COLORS: Record<string, string> = {
  standard: 'bg-white/10 text-white/60',
  priority: 'bg-blue-500/20 text-blue-400',
  vip: 'bg-purple-500/20 text-purple-400',
  founding: 'bg-warning/20 text-warning',
};

export default function AdminWaitlistPage() {
  const { publicKey, connected, signMessage } = useWallet();
  const walletAddress = publicKey?.toBase58();
  const { isAuthenticated, isLoading: authLoading, signIn, authenticatedFetch, error: authError } = useAuth();

  // Admin verification state - starts as unverified
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [data, setData] = useState<WaitlistData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created_at' | 'referral_count' | 'position'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Verify admin status with server-side check
  const verifyAdmin = useCallback(async () => {
    if (!walletAddress || !signMessage) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const timestamp = Date.now().toString();
      const message = `DegenDome:admin:${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request wallet signature
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      // Verify with server
      const response = await fetch('/api/auth/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          signature: signatureBase58,
          timestamp,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isAdmin) {
          setIsVerifiedAdmin(true);
        } else {
          setVerificationError('Access denied');
        }
      } else {
        setVerificationError('Access denied');
      }
    } catch (err: any) {
      if (err.message?.includes('User rejected')) {
        setVerificationError('Signature required for admin access');
      } else {
        setVerificationError('Verification failed');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [walletAddress, signMessage]);

  // Auto-verify when wallet connects
  useEffect(() => {
    if (connected && walletAddress && signMessage && !isVerifiedAdmin && !isVerifying) {
      verifyAdmin();
    }
  }, [connected, walletAddress, signMessage, isVerifiedAdmin, isVerifying, verifyAdmin]);

  // Reset verification when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setIsVerifiedAdmin(false);
      setVerificationError(null);
    }
  }, [connected]);

  const fetchData = useCallback(async () => {
    if (!walletAddress || !isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/waitlist/admin/entries?sortBy=${sortBy}&sortOrder=${sortOrder}&limit=500`
      );

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Not authorized. Admin access required.');
        }
        if (res.status === 401) {
          throw new Error('Session expired. Please sign in again.');
        }
        throw new Error('Failed to fetch data');
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, isAuthenticated, authenticatedFetch, sortBy, sortOrder]);

  // Auto sign-in for admin if verified but not authenticated
  useEffect(() => {
    if (isVerifiedAdmin && walletAddress && !isAuthenticated && !authLoading) {
      signIn();
    }
  }, [isVerifiedAdmin, walletAddress, isAuthenticated, authLoading, signIn]);

  // Fetch data once authenticated
  useEffect(() => {
    if (isVerifiedAdmin && isAuthenticated) {
      fetchData();
    }
  }, [isVerifiedAdmin, isAuthenticated, sortBy, sortOrder, fetchData]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportCSV = () => {
    if (!data) return;

    const headers = ['Position', 'Email', 'Wallet', 'Referral Code', 'Referred By', 'Referrals', 'Tier', 'Source', 'Joined'];
    const rows = data.entries.map((e) => [
      e.position,
      e.email,
      e.walletAddress || '',
      e.referralCode,
      e.referredBy || '',
      e.referralCount,
      e.tier,
      e.utmSource || '',
      formatDate(e.createdAt),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Not connected - show minimal connect prompt
  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Restricted Area</h1>
          <p className="text-white/60 mb-6">Connect wallet to continue</p>
          <WalletMultiButton className="!bg-white/10 !border !border-white/20 !rounded-xl" />
        </div>
      </div>
    );
  }

  // Verifying admin status
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <div className="w-8 h-8 border-2 border-warning border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not verified as admin - show nothing useful
  if (!isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <p className="text-white/40 text-sm">
            {verificationError || 'Access denied'}
          </p>
          {verificationError === 'Signature required for admin access' && (
            <button
              onClick={verifyAdmin}
              className="mt-4 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/20"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // Verified admin - show dashboard
  return (
    <div className="min-h-screen bg-[#0a0908] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-warning hover:underline text-sm mb-2 inline-block">&larr; Back to site</Link>
            <h1 className="text-3xl font-bold">Waitlist Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={exportCSV}
              disabled={!data || data.entries.length === 0}
              className="px-4 py-2 bg-warning/20 border border-warning/40 rounded-lg text-warning text-sm hover:bg-warning/30 transition-colors disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black/60 border border-white/10 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Total Signups</p>
              <p className="text-3xl font-bold text-warning">{data.stats.totalSignups}</p>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Total Referrals</p>
              <p className="text-3xl font-bold">{data.stats.totalReferrals}</p>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Priority+</p>
              <p className="text-3xl font-bold text-blue-400">
                {(data.stats.tierBreakdown.priority || 0) + (data.stats.tierBreakdown.vip || 0) + (data.stats.tierBreakdown.founding || 0)}
              </p>
            </div>
            <div className="bg-black/60 border border-white/10 rounded-xl p-4">
              <p className="text-white/60 text-sm mb-1">Founding Members</p>
              <p className="text-3xl font-bold text-warning">{data.stats.tierBreakdown.founding || 0}</p>
            </div>
          </div>
        )}

        {/* Auth status */}
        {!isAuthenticated && isVerifiedAdmin && (
          <div className="bg-warning/20 border border-warning/40 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-warning">
              {authLoading ? 'Signing in...' : 'Please sign in to load data'}
            </span>
            {!authLoading && (
              <button
                onClick={signIn}
                className="px-4 py-2 bg-warning text-black font-bold rounded-lg hover:bg-warning/80 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {(error || authError) && (
          <div className="bg-danger/20 border border-danger/40 rounded-xl p-4 mb-6 text-danger">
            {error || authError}
          </div>
        )}

        {/* Sort controls */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-white/60 text-sm">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="created_at">Date Joined</option>
            <option value="referral_count">Referrals</option>
            <option value="position">Position</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-black/60 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-black/60 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Wallet</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Referred By</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Refs</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/60 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : data && data.entries.length > 0 ? (
                  data.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm font-mono text-white/60">{entry.position}</td>
                      <td className="px-4 py-3 text-sm">{entry.email}</td>
                      <td className="px-4 py-3 text-sm font-mono text-white/60">
                        {entry.walletAddress ? `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-warning">{entry.referralCode}</td>
                      <td className="px-4 py-3 text-sm font-mono text-white/60">{entry.referredBy || '-'}</td>
                      <td className="px-4 py-3 text-sm font-bold">{entry.referralCount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS[entry.tier] || TIER_COLORS.standard}`}>
                          {entry.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">{entry.utmSource || 'direct'}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{formatDate(entry.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                      No entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {data && data.total > 0 && (
          <p className="text-sm text-white/40 mt-4">
            Showing {data.entries.length} of {data.total} entries
          </p>
        )}
      </div>
    </div>
  );
}
