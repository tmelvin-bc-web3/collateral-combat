'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface WaitlistStatus {
  position: number;
  referralCount: number;
  tier: string;
  referralsNeededForNextTier: number;
  rewards: string[];
  referralCode: string;
}

interface LeaderboardEntry {
  position: number;
  referralCode: string;
  referralCount: number;
  tier: string;
}

const TIER_CONFIG = {
  standard: { color: 'text-white/60', border: 'border-white/20', bg: 'bg-white/5', next: 'priority', threshold: 3 },
  priority: { color: 'text-blue-400', border: 'border-blue-400/40', bg: 'bg-blue-400/10', next: 'vip', threshold: 10 },
  vip: { color: 'text-purple-400', border: 'border-purple-400/40', bg: 'bg-purple-400/10', next: 'founding', threshold: 25 },
  founding: { color: 'text-warning', border: 'border-warning/40', bg: 'bg-warning/10', next: null, threshold: null },
};

export default function WaitlistDashboard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalSignups, setTotalSignups] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('waitlist_email');
    if (savedEmail) {
      setEmail(savedEmail);
      fetchStatus(savedEmail);
    }
    fetchLeaderboard();
  }, []);

  const fetchStatus = async (emailToFetch: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/waitlist/status/${encodeURIComponent(emailToFetch)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Email not found. Have you joined the waitlist?');
        }
        throw new Error('Failed to fetch status');
      }
      const data = await res.json();
      setStatus(data);
      localStorage.setItem('waitlist_email', emailToFetch);
    } catch (err: any) {
      setError(err.message);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/waitlist/leaderboard?limit=10`);
      const data = await res.json();
      setLeaderboard(data.topReferrers || []);
      setTotalSignups(data.totalSignups || 0);
    } catch {
      // Ignore leaderboard errors
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      fetchStatus(email);
    }
  };

  const copyReferralLink = () => {
    if (status) {
      navigator.clipboard.writeText(`https://www.degendome.xyz/ref/${status.referralCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tierConfig = status ? TIER_CONFIG[status.tier as keyof typeof TIER_CONFIG] : TIER_CONFIG.standard;

  return (
    <div className="min-h-screen bg-[#0a0908] p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-warning/5 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <span className="text-3xl font-black tracking-tight">
              <span className="text-warning">DEGEN</span>
              <span className="text-white">DOME</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold">Waitlist Dashboard</h1>
          {totalSignups > 0 && (
            <p className="text-white/60 text-sm mt-1">
              {totalSignups.toLocaleString()} total degens on the waitlist
            </p>
          )}
        </div>

        {!status ? (
          /* Email lookup form */
          <div className="max-w-md mx-auto">
            <form onSubmit={handleSubmit} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <p className="text-white/60 text-sm mb-4">Enter your email to view your waitlist status</p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-warning/50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="px-6 py-3 bg-warning text-black font-bold rounded-xl hover:bg-warning/90 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Check'}
                </button>
              </div>
              {error && (
                <p className="text-danger text-sm mt-3">{error}</p>
              )}
              <p className="text-white/40 text-xs mt-4">
                Not on the waitlist?{' '}
                <Link href="/waitlist" className="text-warning hover:underline">
                  Join now
                </Link>
              </p>
            </form>
          </div>
        ) : (
          /* Dashboard content */
          <div className="grid md:grid-cols-2 gap-6">
            {/* Status card */}
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Your Status</h2>
                <button
                  onClick={() => {
                    setStatus(null);
                    localStorage.removeItem('waitlist_email');
                  }}
                  className="text-white/40 text-sm hover:text-white/60"
                >
                  Change email
                </button>
              </div>

              {/* Position */}
              <div className="mb-6">
                <p className="text-white/60 text-sm mb-1">Waitlist Position</p>
                <p className="text-4xl font-bold text-warning">#{status.position}</p>
              </div>

              {/* Tier badge */}
              <div className="mb-6">
                <p className="text-white/60 text-sm mb-2">Current Tier</p>
                <span className={`inline-block px-4 py-2 rounded-full ${tierConfig.bg} ${tierConfig.border} border ${tierConfig.color} font-medium`}>
                  {status.tier.toUpperCase()}
                </span>
              </div>

              {/* Rewards */}
              <div>
                <p className="text-white/60 text-sm mb-2">Your Rewards</p>
                <ul className="space-y-1">
                  {status.rewards.map((reward, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {reward}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Referral card */}
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-6">Referrals</h2>

              {/* Referral count */}
              <div className="mb-6">
                <p className="text-white/60 text-sm mb-1">Total Referrals</p>
                <p className="text-4xl font-bold">{status.referralCount}</p>
              </div>

              {/* Progress to next tier */}
              {status.referralsNeededForNextTier > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/60">Progress to next tier</span>
                    <span className="text-warning">{status.referralsNeededForNextTier} more needed</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-warning to-fire rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (status.referralCount / (status.referralCount + status.referralsNeededForNextTier)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Referral link */}
              <div className="bg-black/40 rounded-xl p-4">
                <p className="text-white/60 text-sm mb-2">Your referral link</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`https://www.degendome.xyz/ref/${status.referralCode}`}
                    readOnly
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white/80"
                  />
                  <button
                    onClick={copyReferralLink}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-success/20 border border-success/40 text-success'
                        : 'bg-warning/20 border border-warning/40 text-warning hover:bg-warning/30'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div className="flex gap-3 mt-4">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏟️ Join me in the DegenDome arena!\n\n1v1 trading battles on Solana. May the best degen win.\n\nJoin the waitlist:`)}&url=${encodeURIComponent(`https://www.degendome.xyz/ref/${status.referralCode}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-black/40 border border-white/10 rounded-lg text-white/80 text-sm text-center hover:border-white/30 transition-colors"
                >
                  Share on X
                </a>
              </div>
            </div>

            {/* Tier rewards info */}
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:col-span-2">
              <h2 className="text-lg font-bold mb-4">Tier Rewards</h2>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl ${status.tier === 'standard' ? 'ring-2 ring-white/20' : ''} bg-white/5 border border-white/10`}>
                  <p className="text-white/60 text-sm mb-1">Standard</p>
                  <p className="font-medium mb-2">0 referrals</p>
                  <p className="text-xs text-white/40">Beta access lottery</p>
                </div>
                <div className={`p-4 rounded-xl ${status.tier === 'priority' ? 'ring-2 ring-blue-400' : ''} bg-blue-400/5 border border-blue-400/20`}>
                  <p className="text-blue-400 text-sm mb-1">Priority</p>
                  <p className="font-medium mb-2">3+ referrals</p>
                  <p className="text-xs text-white/40">Guaranteed beta access</p>
                </div>
                <div className={`p-4 rounded-xl ${status.tier === 'vip' ? 'ring-2 ring-purple-400' : ''} bg-purple-400/5 border border-purple-400/20`}>
                  <p className="text-purple-400 text-sm mb-1">VIP</p>
                  <p className="font-medium mb-2">10+ referrals</p>
                  <p className="text-xs text-white/40">Beta + 100 XP + Discord role</p>
                </div>
                <div className={`p-4 rounded-xl ${status.tier === 'founding' ? 'ring-2 ring-warning' : ''} bg-warning/5 border border-warning/20`}>
                  <p className="text-warning text-sm mb-1">Founding</p>
                  <p className="font-medium mb-2">25+ referrals</p>
                  <p className="text-xs text-white/40">Beta + 500 XP + Founding badge</p>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:col-span-2">
                <h2 className="text-lg font-bold mb-4">Top Referrers</h2>
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.position}
                      className={`flex items-center justify-between p-3 rounded-xl ${
                        entry.referralCode.includes(status.referralCode.substring(5, 8))
                          ? 'bg-warning/10 border border-warning/20'
                          : 'bg-black/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full ${
                          entry.position === 1 ? 'bg-warning/20 text-warning' :
                          entry.position === 2 ? 'bg-white/20 text-white' :
                          entry.position === 3 ? 'bg-orange-400/20 text-orange-400' :
                          'bg-white/10 text-white/60'
                        } font-bold text-sm`}>
                          {entry.position}
                        </span>
                        <span className="font-mono text-sm">{entry.referralCode}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${TIER_CONFIG[entry.tier as keyof typeof TIER_CONFIG]?.bg} ${TIER_CONFIG[entry.tier as keyof typeof TIER_CONFIG]?.color}`}>
                          {entry.tier}
                        </span>
                      </div>
                      <span className="font-bold">{entry.referralCount} refs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
