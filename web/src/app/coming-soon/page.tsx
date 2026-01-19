'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { isWhitelisted } from '@/config/whitelist';
import { BACKEND_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import bs58 from 'bs58';


interface WaitlistSuccess {
  referralCode: string;
  position: number;
  tier: string;
  referralCount: number;
  referralLink: string;
}

export default function ComingSoon() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);
  const [waitlistData, setWaitlistData] = useState<WaitlistSuccess | null>(null);
  const [totalSignups, setTotalSignups] = useState(0);
  const [copied, setCopied] = useState(false);
  const { publicKey, connected, signMessage } = useWallet();
  const { isAuthenticated, signIn, token } = useAuth();

  // Track if we've attempted the whitelist flow to prevent repeated attempts
  const hasAttemptedWhitelistFlow = useRef(false);

  const walletAddress = publicKey?.toBase58();
  const hasAccess = isWhitelisted(walletAddress);

  useEffect(() => {
    setMounted(true);
    // Fetch total signups
    fetch(`${BACKEND_URL}/api/waitlist/count`)
      .then((res) => res.json())
      .then((data) => setTotalSignups(data.count))
      .catch(() => {});
  }, []);

  // Redirect whitelisted users to the full app (with secure verification)
  // Uses AuthContext for single signature - JWT proves identity
  useEffect(() => {
    if (!hasAccess || !mounted || !walletAddress || hasAttemptedWhitelistFlow.current) {
      return;
    }

    const verifyAndRedirect = async () => {
      hasAttemptedWhitelistFlow.current = true;

      try {
        // Step 1: If not authenticated, sign in via AuthContext (ONE signature)
        let currentToken = token;
        if (!isAuthenticated) {
          const success = await signIn();
          if (!success) {
            console.error('Sign in failed or rejected');
            hasAttemptedWhitelistFlow.current = false; // Allow retry
            return;
          }
          // Get the token from localStorage since state might not update immediately
          currentToken = localStorage.getItem('degendome_auth_token');
        }

        if (!currentToken) {
          console.error('No token available after sign in');
          hasAttemptedWhitelistFlow.current = false;
          return;
        }

        // Step 2: Set the whitelist cookie using JWT (no additional signature)
        const response = await fetch('/api/auth/set-whitelist-cookie', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
        });

        if (response.ok) {
          // Cookie is set by the API - now redirect
          window.location.href = '/predict';
        } else {
          console.error('Failed to set whitelist cookie');
          hasAttemptedWhitelistFlow.current = false;
        }
      } catch (error) {
        console.error('Error during whitelist verification:', error);
        hasAttemptedWhitelistFlow.current = false;
      }
    };

    verifyAndRedirect();
  }, [hasAccess, mounted, walletAddress, isAuthenticated, signIn, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      // Require wallet connection
      if (!connected || !publicKey) {
        throw new Error('Please connect your wallet above to join the waitlist');
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
          walletAddress: walletAddress,
          referralCode: refCode || undefined,
          utmSource: searchParams.get('utm_source') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setMessage(data.message || 'Successfully joined!');
        setWaitlistData({
          referralCode: data.referralCode,
          position: data.position,
          tier: data.tier,
          referralCount: data.referralCount || 0,
          referralLink: data.referralLink,
        });
        // Save email to localStorage
        localStorage.setItem('waitlist_email', email);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      setStatus('error');
      // Handle user rejection
      if (err.message?.includes('User rejected')) {
        setMessage('Wallet signature was rejected. Please try again.');
      } else {
        setMessage(err.message || 'Failed to join waitlist. Please try again.');
      }
    }
  };

  const copyReferralLink = () => {
    if (waitlistData) {
      navigator.clipboard.writeText(waitlistData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#080705] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff5500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080705] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,85,0,0.3) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,85,0,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#ff5500]/[0.08] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#8b0000]/[0.08] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#8b4513]/[0.05] rounded-full blur-[150px]" />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#ff5500]/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Scanlines overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8 relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#ff5500]/20 via-[#8b0000]/20 to-[#ff5500]/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#8b4513]/50 shadow-2xl shadow-[#ff5500]/20">
            <Image
              src="/logo.png"
              alt="DegenDome"
              fill
              className="object-cover scale-110"
              priority
            />
          </div>
        </div>

        {/* Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8b4513]/30 to-[#5c2e0d]/30 border border-[#8b4513]/40 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5500] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff5500]"></span>
            </span>
            <span className="text-[#e63900] text-xs font-bold uppercase tracking-[4px]">Coming Soon</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center mb-4">
          <span
            className="block text-6xl md:text-8xl lg:text-9xl font-black tracking-tight"
            style={{
              fontFamily: 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif',
              letterSpacing: '-2px'
            }}
          >
            <span className="text-[#e8dfd4]">DEGEN</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff5500] via-[#e63900] to-[#8b0000]">DOME</span>
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-[#8b4513] text-sm md:text-base font-bold uppercase tracking-[6px] mb-8">
          Two Enter · One Profits
        </p>

        {/* Description */}
        <p className="text-[#8a7f72] text-lg md:text-xl text-center max-w-lg mb-8 leading-relaxed">
          The wasteland&apos;s premier trading arena.
          <span className="text-[#e8dfd4]"> Predict. Battle. Draft. </span>
          Survive.
        </p>

        {/* Early Access - Wallet Connect */}
        <div className="w-full max-w-md mb-8">
          <div className="relative bg-[#0d0b09]/80 backdrop-blur-xl rounded-xl border border-[#8b4513]/30 p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-[#e8dfd4] mb-1">Early Access</h3>
              <p className="text-sm text-[#5c5348]">
                {connected
                  ? hasAccess
                    ? 'Access granted! Redirecting...'
                    : 'Wallet not on whitelist'
                  : 'Connect wallet to check whitelist status'
                }
              </p>
            </div>

            <div className="flex justify-center">
              <WalletMultiButton
                style={{
                  background: 'linear-gradient(180deg, #151210 0%, #0d0b09 100%)',
                  border: '1px solid #8b4513',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  height: '44px',
                  padding: '0 20px',
                }}
              />
            </div>

            {connected && !hasAccess && (
              <p className="text-xs text-[#5c5348] text-center mt-4">
                Join the waitlist below for access when we launch
              </p>
            )}

            {connected && hasAccess && (
              <div className="flex items-center justify-center gap-2 mt-4 text-[#7fba00]">
                <div className="w-5 h-5 border-2 border-[#7fba00] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold">Loading DegenDome...</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full max-w-md flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#8b4513]/30" />
          <span className="text-xs text-[#5c5348] uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#8b4513]/30" />
        </div>

        {/* Email signup card */}
        <div className="w-full max-w-md relative">
          {/* Card glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#8b4513]/50 via-[#ff5500]/30 to-[#8b4513]/50 rounded-2xl blur-lg opacity-50" />

          <div className="relative bg-[#0d0b09]/90 backdrop-blur-xl rounded-2xl border border-[#8b4513]/30 p-8 shadow-2xl">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#ff5500]/50 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#ff5500]/50 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#ff5500]/50 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#ff5500]/50 rounded-br-2xl" />

            <h2 className="text-xl font-bold text-[#e8dfd4] mb-2 text-center">
              Join the Waitlist
            </h2>
            <p className="text-sm text-[#5c5348] text-center mb-2">
              Be first to enter when the dome opens
            </p>
            {totalSignups > 0 && (
              <p className="text-xs text-[#ff5500] text-center mb-3">
                {totalSignups.toLocaleString()} degens already waiting
              </p>
            )}
            {totalSignups === 0 && <div className="mb-2" />}

            {/* Founding Degen callout */}
            {totalSignups < 1000 && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-gradient-to-r from-[#ff5500]/10 to-[#8b4513]/10 border border-[#ff5500]/20">
                <p className="text-xs text-center">
                  <span className="text-[#ff5500] font-bold">First 1,000 signups</span>
                  <span className="text-[#8a7f72]"> become </span>
                  <span className="text-[#e8dfd4] font-bold">Founding Degens</span>
                  <span className="text-[#8a7f72]"> with exclusive bonuses</span>
                </p>
                <p className="text-sm text-[#c4a574] text-center mt-2 font-semibold">
                  {1000 - totalSignups} spots remaining
                </p>
              </div>
            )}
            {totalSignups >= 1000 && <div className="mb-4" />}

            {status === 'success' && waitlistData ? (
              <div className="text-center py-2">
                {/* Success message */}
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-[#7fba00]/10 border border-[#7fba00]/30 mb-4">
                  <svg className="w-5 h-5 text-[#7fba00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold text-[#7fba00]">You&apos;re #{waitlistData.position} on the list!</span>
                </div>

                {/* Referral stats */}
                <div className="bg-[#0d0b09] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#5c5348]">Accepted Referrals</span>
                    <span className="text-lg font-bold text-[#e8dfd4]">{waitlistData.referralCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#5c5348]">Current Tier</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      waitlistData.tier === 'founding' ? 'bg-[#ff5500]/20 text-[#ff5500]' :
                      waitlistData.tier === 'vip' ? 'bg-purple-500/20 text-purple-400' :
                      waitlistData.tier === 'priority' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {waitlistData.tier.toUpperCase()}
                    </span>
                  </div>
                  {waitlistData.tier !== 'founding' && (
                    <p className="text-[10px] text-[#5c5348] mt-2">
                      {waitlistData.tier === 'standard' && `${3 - waitlistData.referralCount} more referrals for Priority tier`}
                      {waitlistData.tier === 'priority' && `${10 - waitlistData.referralCount} more referrals for VIP tier`}
                      {waitlistData.tier === 'vip' && `${25 - waitlistData.referralCount} more referrals for Founding tier`}
                    </p>
                  )}
                </div>

                {/* Referral link */}
                <div className="bg-[#0d0b09] rounded-xl p-4 mb-4">
                  <p className="text-xs text-[#5c5348] mb-2">Share to earn referrals:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={waitlistData.referralLink}
                      readOnly
                      className="flex-1 bg-[#151210] border border-[#2a2218] rounded-lg px-3 py-2 text-xs font-mono text-[#c4a574]"
                    />
                    <button
                      onClick={copyReferralLink}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        copied
                          ? 'bg-[#7fba00]/20 border border-[#7fba00]/40 text-[#7fba00]'
                          : 'bg-[#ff5500]/20 border border-[#ff5500]/40 text-[#ff5500] hover:bg-[#ff5500]/30'
                      }`}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Tier Benefits */}
                <div className="bg-[#0d0b09] rounded-xl p-4 mb-4">
                  <p className="text-xs text-[#5c5348] mb-3 text-left">Tier Rewards:</p>
                  <div className="space-y-2 text-left">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-medium shrink-0">STANDARD</span>
                      <span className="text-[10px] text-[#8a7f72]">Beta access lottery entry</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium shrink-0">PRIORITY</span>
                      <span className="text-[10px] text-[#8a7f72]">3+ refs = Guaranteed beta access</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium shrink-0">VIP</span>
                      <span className="text-[10px] text-[#8a7f72]">10+ refs = Beta + 100 XP + VIP role</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff5500]/20 text-[#ff5500] font-medium shrink-0">FOUNDING</span>
                      <span className="text-[10px] text-[#8a7f72]">25+ refs = Beta + 500 XP + Founding badge</span>
                    </div>
                  </div>
                </div>

                {/* Share on X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏟️ Just secured my spot in the DegenDome arena!\n\n1v1 trading battles on Solana. May the best degen win.\n\nJoin the waitlist:`)}&url=${encodeURIComponent(waitlistData.referralLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-[#151210] border border-[#2a2218] rounded-lg text-[#c4a574] text-xs hover:border-[#ff5500]/30 transition-colors"
                >
                  Share on X
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-5 py-4 rounded-xl bg-[#151210] border border-[#2a2218] text-[#e8dfd4] placeholder:text-[#5c5348] focus:outline-none focus:border-[#ff5500]/50 focus:ring-1 focus:ring-[#ff5500]/30 transition-all text-base"
                    disabled={status === 'loading'}
                  />
                </div>
                {!connected && (
                  <p className="text-xs text-[#ff5500] text-center">
                    Connect your wallet above to join
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading' || !email || !connected}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ff5500] to-[#e63900] hover:from-[#ff6622] hover:to-[#ff5500] disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wider transition-all text-[#e8dfd4] shadow-lg shadow-[#ff5500]/20 hover:shadow-[#ff5500]/40"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Signing & Joining...
                    </span>
                  ) : !connected ? (
                    'Connect Wallet First'
                  ) : (
                    'Enter the Waitlist'
                  )}
                </button>
              </form>
            )}

            {status === 'error' && (
              <p className="mt-4 text-sm text-[#cc2200] text-center">{message}</p>
            )}
          </div>
        </div>

        {/* Game modes preview */}
        <div className="mt-16 grid grid-cols-3 gap-6 md:gap-12 max-w-lg">
          {[
            { icon: 'chart', label: 'Predict', desc: '30s Rounds' },
            { icon: 'bolt', label: 'Battle', desc: '1v1 Duels' },
            { icon: 'grid', label: 'Draft', desc: 'Fantasy Leagues' },
          ].map((mode) => (
            <div key={mode.label} className="text-center group">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#151210] to-[#0d0b09] border border-[#2a2218] flex items-center justify-center text-[#8b4513] group-hover:text-[#ff5500] group-hover:border-[#8b4513]/50 transition-all duration-300 shadow-lg">
                {mode.icon === 'chart' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                )}
                {mode.icon === 'bolt' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {mode.icon === 'grid' && (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
              </div>
              <h3 className="font-bold text-sm text-[#c4a574] uppercase tracking-wider">{mode.label}</h3>
              <p className="text-xs text-[#5c5348] mt-1">{mode.desc}</p>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="mt-16 flex items-center gap-4">
          <a
            href="https://x.com/DegenDomeSolana"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-xl bg-[#151210] border border-[#2a2218] text-[#5c5348] hover:text-[#e8dfd4] hover:border-[#8b4513]/50 hover:bg-[#1f1a16] transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>

        {/* Footer text */}
        <p className="mt-12 text-xs text-[#3d3228] uppercase tracking-widest">
          Built on Solana by Degens, for Degens
        </p>
      </div>

      {/* Custom styles for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
