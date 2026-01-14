'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { BACKEND_URL } from '@/config/api';
import { cn } from '@/lib/utils';

// Challenge data from API
interface ChallengeData {
  id: string;
  challengeCode: string;
  challengerWallet: string;
  challengerUsername?: string;
  entryFee: number;
  leverage: number;
  duration: number;
  status: 'pending' | 'accepted' | 'expired' | 'completed' | 'cancelled';
  expiresAt: number;
  createdAt: number;
  viewCount: number;
}

interface ChallengeResponse {
  challenge: ChallengeData;
  canAccept: boolean;
  reason: string | null;
}

// Validate challenge code format: FIGHT followed by 8 alphanumeric chars
function isValidChallengeCodeFormat(code: string): boolean {
  return /^FIGHT[A-HJ-NP-Z2-9]{8}$/i.test(code);
}

// Format time remaining
function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// Format duration in seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

// Truncate wallet address
function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ChallengeLandingPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();
  const { publicKey, connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [isLoading, setIsLoading] = useState(true);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [canAccept, setCanAccept] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch challenge details
  useEffect(() => {
    if (!code) {
      setError('No challenge code provided');
      setIsLoading(false);
      return;
    }

    // Validate code format first
    if (!isValidChallengeCodeFormat(code)) {
      setError('Invalid challenge code format');
      setIsLoading(false);
      return;
    }

    const fetchChallenge = async () => {
      try {
        const walletParam = publicKey ? `?wallet=${publicKey.toBase58()}` : '';
        const response = await fetch(
          `${BACKEND_URL}/api/challenges/${encodeURIComponent(code)}${walletParam}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Challenge not found');
          } else {
            setError('Failed to load challenge');
          }
          setIsLoading(false);
          return;
        }

        const data: ChallengeResponse = await response.json();
        setChallenge(data.challenge);
        setCanAccept(data.canAccept);
        setReason(data.reason);
        setIsLoading(false);
      } catch (err) {
        console.error('[Challenge] Fetch error:', err);
        setError('Failed to connect to server');
        setIsLoading(false);
      }
    };

    fetchChallenge();
  }, [code, publicKey]);

  // Accept challenge
  const handleAccept = useCallback(async () => {
    if (!connected || !publicKey) {
      setWalletModalVisible(true);
      return;
    }

    if (!challenge || !canAccept) return;

    setIsAccepting(true);
    setAcceptError(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/challenges/${encodeURIComponent(code)}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: publicKey.toBase58(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setAcceptError(data.error || 'Failed to accept challenge');
        setIsAccepting(false);
        return;
      }

      // Redirect to battle
      router.push(`/battle?id=${data.battleId}`);
    } catch (err) {
      console.error('[Challenge] Accept error:', err);
      setAcceptError('Failed to accept challenge');
      setIsAccepting(false);
    }
  }, [connected, publicKey, challenge, canAccept, code, router, setWalletModalVisible]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <Logo />
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading challenge...</p>
            <p className="text-white/40 text-xs mt-4 font-mono">{code}</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !challenge) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <Logo />
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 border-2 border-danger flex items-center justify-center">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {error || 'Challenge Not Found'}
            </h2>
            <p className="text-white/60 text-sm mb-6">
              This challenge may have expired or been cancelled.
            </p>
            <Link
              href="/battle"
              className="inline-block px-6 py-3 bg-warning hover:bg-warning/90 text-black font-bold rounded-lg transition-colors"
            >
              Go to Battle Arena
            </Link>
            <p className="text-white/40 text-xs mt-4 font-mono">{code}</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if challenge is expired/not pending
  const isExpired = challenge.status !== 'pending' || Date.now() > challenge.expiresAt;
  const isOwnChallenge = publicKey?.toBase58() === challenge.challengerWallet;
  const prizePool = challenge.entryFee * 2;

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center p-4">
      <BackgroundEffects />

      <div className="relative z-10 w-full max-w-lg">
        <Logo />

        {/* Challenge Card */}
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-warning/20 via-warning/10 to-warning/20 border-b border-white/10 p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="w-6 h-6 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-lg font-bold text-white uppercase tracking-wider">
                Battle Challenge
              </span>
            </div>
            <p className="text-center text-white/60 text-sm">
              {challenge.challengerUsername || truncateWallet(challenge.challengerWallet)}{' '}
              has challenged you to a 1v1 battle!
            </p>
          </div>

          {/* Challenge Details */}
          <div className="p-6">
            {/* Prize Pool */}
            <div className="text-center mb-6">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                Prize Pool
              </p>
              <p className="text-4xl font-bold text-warning drop-shadow-[0_0_10px_rgba(255,85,0,0.5)]">
                {prizePool.toFixed(2)} SOL
              </p>
              <p className="text-white/40 text-xs mt-1">
                ({challenge.entryFee} SOL entry each)
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Leverage
                </p>
                <p className="text-xl font-bold text-white">{challenge.leverage}x</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Duration
                </p>
                <p className="text-xl font-bold text-white">
                  {formatDuration(challenge.duration)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Entry Fee
                </p>
                <p className="text-xl font-bold text-white">{challenge.entryFee} SOL</p>
              </div>
            </div>

            {/* Expiration Status */}
            {!isExpired && (
              <div className="flex items-center justify-center gap-2 mb-6 text-white/60">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">{formatTimeRemaining(challenge.expiresAt)}</span>
              </div>
            )}

            {/* Action Area */}
            {isExpired ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-danger/20 border border-danger/30 rounded-lg text-danger mb-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">
                    {challenge.status === 'accepted'
                      ? 'Challenge Already Accepted'
                      : challenge.status === 'completed'
                      ? 'Battle Completed'
                      : challenge.status === 'cancelled'
                      ? 'Challenge Cancelled'
                      : 'Challenge Expired'}
                  </span>
                </div>
                <Link
                  href="/battle"
                  className="block w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  Create Your Own Challenge
                </Link>
              </div>
            ) : isOwnChallenge ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-warning/20 border border-warning/30 rounded-lg text-warning mb-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">This is your challenge</span>
                </div>
                <p className="text-white/60 text-sm mb-4">
                  Share this link with a friend to battle them!
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                  className="w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy Challenge Link
                </button>
              </div>
            ) : !connected ? (
              <div className="text-center">
                <button
                  onClick={() => setWalletModalVisible(true)}
                  className="w-full py-4 px-6 bg-warning hover:bg-warning/90 text-black font-bold rounded-lg transition-colors text-lg"
                >
                  Connect Wallet to Accept
                </button>
                <p className="text-white/40 text-xs mt-3">
                  You'll need to deposit {challenge.entryFee} SOL to enter
                </p>
              </div>
            ) : canAccept ? (
              <div className="text-center">
                {acceptError && (
                  <div className="mb-4 px-4 py-2 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                    {acceptError}
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className={cn(
                    'w-full py-4 px-6 font-bold rounded-lg transition-all text-lg',
                    isAccepting
                      ? 'bg-warning/50 text-black/50 cursor-not-allowed'
                      : 'bg-warning hover:bg-warning/90 text-black hover:scale-[1.02]'
                  )}
                >
                  {isAccepting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Accepting...
                    </span>
                  ) : (
                    `Accept Challenge (${challenge.entryFee} SOL)`
                  )}
                </button>
                <p className="text-white/40 text-xs mt-3">
                  Winner takes {prizePool.toFixed(2)} SOL
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-danger/20 border border-danger/30 rounded-lg text-danger mb-4">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">{reason || 'Cannot accept'}</span>
                </div>
                <Link
                  href="/battle"
                  className="block w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  Go to Battle Arena
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-4 bg-black/40">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="font-mono">{challenge.challengeCode}</span>
              <span>{challenge.viewCount} views</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 bg-black/40 backdrop-blur border border-white/10 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-warning"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            How Battle Arena Works
          </h3>
          <ul className="space-y-2 text-xs text-white/60">
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold">1.</span>
              Both players deposit the entry fee into the prize pool
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold">2.</span>
              Open leveraged positions on any crypto asset
            </li>
            <li className="flex items-start gap-2">
              <span className="text-warning font-bold">3.</span>
              Player with higher P&L when time runs out wins everything
            </li>
          </ul>
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link href="/battle" className="text-white/40 hover:text-white/60 text-sm transition-colors">
            ← Back to Battle Arena
          </Link>
        </div>
      </div>
    </div>
  );
}

// Background effects component
function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-warning/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-warning/10 via-transparent to-transparent" />
    </div>
  );
}

// Logo component
function Logo() {
  return (
    <div className="text-center mb-8">
      <Link href="/" className="inline-block">
        <span className="text-4xl font-black tracking-tight">
          <span className="text-warning">DEGEN</span>
          <span className="text-white">DOME</span>
        </span>
      </Link>
    </div>
  );
}
