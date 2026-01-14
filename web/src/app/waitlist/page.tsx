'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

const TIER_INFO = {
  standard: { color: 'text-white/60', benefits: ['Beta access lottery'] },
  priority: { color: 'text-blue-400', benefits: ['Guaranteed beta access'] },
  vip: { color: 'text-purple-400', benefits: ['Beta access', '100 bonus XP', 'Exclusive Discord role'] },
  founding: { color: 'text-warning', benefits: ['Beta access', '500 bonus XP', 'Founding badge'] },
};

export default function WaitlistPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');
  const { publicKey, connected, signMessage } = useWallet();

  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState(refCode || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    referralCode: string;
    position: number;
    tier: string;
    referralLink: string;
  } | null>(null);
  const [totalSignups, setTotalSignups] = useState<number>(0);

  // Fetch total signups count
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/waitlist/count`)
      .then((res) => res.json())
      .then((data) => setTotalSignups(data.count))
      .catch(() => {});
  }, []);

  // Update referral code from URL
  useEffect(() => {
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [refCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Require wallet connection
      if (!connected || !publicKey) {
        throw new Error('Please connect your wallet to join the waitlist');
      }

      if (!signMessage) {
        throw new Error('Your wallet does not support message signing');
      }

      // Create signature for verification
      const timestamp = Date.now().toString();
      const message = `DegenDome:waitlist:${timestamp}`;
      const messageBytes = new TextEncoder().encode(message);

      // Request wallet signature
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      const res = await fetch(`${BACKEND_URL}/api/waitlist/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signatureBase58,
          'x-timestamp': timestamp,
        },
        body: JSON.stringify({
          email,
          walletAddress: publicKey.toBase58(),
          referralCode: referralCode || undefined,
          utmSource: searchParams.get('utm_source') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setSuccess({
        referralCode: data.referralCode,
        position: data.position,
        tier: data.tier,
        referralLink: data.referralLink,
      });
      // Save email to localStorage for dashboard
      localStorage.setItem('waitlist_email', email);
    } catch (err: any) {
      // Handle user rejection
      if (err.message?.includes('User rejected')) {
        setError('Wallet signature was rejected. Please try again.');
      } else {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        {/* Background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-warning/5 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-warning/10 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-lg w-full">
          <div className="bg-black/60 backdrop-blur-xl border border-warning/30 rounded-2xl p-8 text-center">
            {/* Success checkmark */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/20 border-2 border-success flex items-center justify-center">
              <svg className="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold mb-2">You&apos;re In!</h1>
            <p className="text-white/60 mb-6">
              Position <span className="text-warning font-bold">#{success.position}</span> on the waitlist
            </p>

            {/* Tier badge */}
            <div className={`inline-block px-4 py-2 rounded-full bg-black/40 border ${success.tier === 'founding' ? 'border-warning text-warning' : success.tier === 'vip' ? 'border-purple-400 text-purple-400' : success.tier === 'priority' ? 'border-blue-400 text-blue-400' : 'border-white/20 text-white/60'} text-sm font-medium mb-6`}>
              {success.tier.toUpperCase()} TIER
            </div>

            {/* Referral link */}
            <div className="bg-black/40 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/60 mb-2">Your referral link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={success.referralLink}
                  readOnly
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(success.referralLink);
                  }}
                  className="px-4 py-2 bg-warning/20 border border-warning/40 rounded-lg text-warning text-sm font-medium hover:bg-warning/30 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Referral tiers info */}
            <div className="text-left mb-6">
              <p className="text-sm text-white/60 mb-3">Refer friends to unlock rewards:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-400">3 referrals</span>
                  <span className="text-white/60">Priority Access</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">10 referrals</span>
                  <span className="text-white/60">VIP + 100 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warning">25 referrals</span>
                  <span className="text-white/60">Founding + 500 XP</span>
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex gap-3 justify-center mb-6">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏟️ Just secured my spot in the DegenDome arena!\n\n1v1 trading battles on Solana. May the best degen win.\n\nJoin the waitlist:`)}&url=${encodeURIComponent(success.referralLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white/80 text-sm hover:border-white/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share
              </a>
            </div>

            <Link
              href="/waitlist/dashboard"
              className="text-warning text-sm hover:underline"
            >
              View your dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-warning/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-warning/10 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <span className="text-4xl font-black tracking-tight">
              <span className="text-warning">DEGEN</span>
              <span className="text-white">DOME</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold mb-3">Join the Waitlist</h1>
          <p className="text-white/60">
            Be first to enter the arena. Early access, exclusive rewards.
          </p>
          {totalSignups > 0 && (
            <p className="text-warning text-sm mt-2">
              {totalSignups.toLocaleString()} degens already waiting
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          {/* Email input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="degen@example.com"
              required
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-warning/50 transition-colors"
            />
          </div>

          {/* Wallet connect */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Wallet <span className="text-danger">*</span>
            </label>
            <div className="flex items-center gap-3">
              <WalletMultiButton className="!bg-black/40 !border !border-white/10 !rounded-xl !h-12 !px-4 hover:!border-warning/50 !transition-colors" />
              {connected && (
                <span className="text-success text-sm">Connected</span>
              )}
            </div>
            {!connected && (
              <p className="text-white/40 text-xs mt-2">
                Wallet required to verify your identity and prevent abuse
              </p>
            )}
          </div>

          {/* Referral code */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Referral Code <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="DEGENXXXX"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-warning/50 transition-colors font-mono"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-danger/20 border border-danger/40 rounded-xl text-danger text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || !email || !connected}
            className="w-full py-4 bg-gradient-to-r from-warning to-fire text-black font-bold rounded-xl hover:shadow-lg hover:shadow-warning/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Signing & Joining...' : !connected ? 'Connect Wallet to Join' : 'Join Waitlist'}
          </button>

          {/* Benefits preview */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/40 mb-3">Waitlist benefits:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-white/60">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Early access to the arena
              </li>
              <li className="flex items-center gap-2 text-white/60">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Refer friends for bonus rewards
              </li>
              <li className="flex items-center gap-2 text-white/60">
                <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Exclusive founding member perks
              </li>
            </ul>
          </div>
        </form>

        {/* Social links */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <a
            href="https://x.com/DegenDomeSolana"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-black/40 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
