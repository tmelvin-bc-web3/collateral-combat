'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatInTimeZone } from 'date-fns-tz';
import { getSocket } from '@/lib/socket';
import { ScheduledMatch, ScheduledMatchStatus } from '@/types/scheduled';
import { Clock, Users, AlertCircle, Check, X, Calendar } from 'lucide-react';

// Props for UpcomingMatches component
interface UpcomingMatchesProps {
  showHeader?: boolean;  // Show "Upcoming Matches" heading
  limit?: number;        // Max matches to show (default: all)
}

// Ready check modal state
interface ReadyCheckState {
  matchId: string;
  expiresAt: number;
  timeRemaining: number;
}

export function UpcomingMatches({ showHeader = true, limit }: UpcomingMatchesProps) {
  const { publicKey, connected } = useWallet();
  const walletAddress = publicKey?.toBase58() || null;

  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readyCheck, setReadyCheck] = useState<ReadyCheckState | null>(null);
  const [registrationPending, setRegistrationPending] = useState<string | null>(null);

  // Auto-detect user's timezone
  const userTimezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

  // Update now every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update ready check countdown
  useEffect(() => {
    if (readyCheck) {
      const remaining = Math.max(0, Math.floor((readyCheck.expiresAt - now) / 1000));
      if (remaining <= 0) {
        setReadyCheck(null);
      } else if (remaining !== readyCheck.timeRemaining) {
        setReadyCheck(prev => prev ? { ...prev, timeRemaining: remaining } : null);
      }
    }
  }, [now, readyCheck]);

  // Socket subscription
  useEffect(() => {
    const socket = getSocket();

    socket.emit('subscribe_scheduled_matches', 'battle');
    setIsLoading(true);

    const handleMatchesList = (data: ScheduledMatch[]) => {
      setMatches(data.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime));
      setIsLoading(false);
      setError(null);
    };

    const handleMatchUpdated = (match: ScheduledMatch) => {
      setMatches(prev => {
        const idx = prev.findIndex(m => m.id === match.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = match;
          return updated.sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
        }
        return [...prev, match].sort((a, b) => a.scheduledStartTime - b.scheduledStartTime);
      });
    };

    const handleMatchCreated = (match: ScheduledMatch) => {
      setMatches(prev => [...prev, match].sort((a, b) => a.scheduledStartTime - b.scheduledStartTime));
    };

    const handleReadyCheck = (data: { matchId: string; expiresAt: number }) => {
      setReadyCheck({
        matchId: data.matchId,
        expiresAt: data.expiresAt,
        timeRemaining: Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000))
      });
    };

    const handleRegistrationSuccess = (data: { matchId: string }) => {
      setRegistrationPending(null);
    };

    const handleError = (message: string) => {
      setError(message);
      setRegistrationPending(null);
    };

    // Type-safe event handlers - cast socket to any for untyped events
    const anySocket = socket as any;
    anySocket.on('scheduled_matches_list', handleMatchesList);
    anySocket.on('scheduled_match_updated', handleMatchUpdated);
    anySocket.on('scheduled_match_created', handleMatchCreated);
    anySocket.on('scheduled_ready_check', handleReadyCheck);
    anySocket.on('match_registration_success', handleRegistrationSuccess);
    socket.on('error', handleError);

    return () => {
      socket.emit('unsubscribe_scheduled_matches', 'battle');
      anySocket.off('scheduled_matches_list', handleMatchesList);
      anySocket.off('scheduled_match_updated', handleMatchUpdated);
      anySocket.off('scheduled_match_created', handleMatchCreated);
      anySocket.off('scheduled_ready_check', handleReadyCheck);
      anySocket.off('match_registration_success', handleRegistrationSuccess);
      socket.off('error', handleError);
    };
  }, []);

  // Register for match
  const handleRegister = useCallback((matchId: string) => {
    if (!walletAddress) return;

    const socket = getSocket();
    setRegistrationPending(matchId);
    setError(null);

    // Type assertion for untyped event
    (socket as any).emit('register_for_match', { matchId, wallet: walletAddress });
  }, [walletAddress]);

  // Unregister from match
  const handleUnregister = useCallback((matchId: string) => {
    if (!walletAddress) return;

    const socket = getSocket();
    setRegistrationPending(matchId);
    setError(null);

    (socket as any).emit('unregister_from_match', { matchId, wallet: walletAddress });
  }, [walletAddress]);

  // Ready check response
  const handleReadyResponse = useCallback((ready: boolean) => {
    if (!walletAddress || !readyCheck) return;

    const socket = getSocket();
    (socket as any).emit('scheduled_ready_check_response', {
      matchId: readyCheck.matchId,
      wallet: walletAddress,
      ready
    });
    setReadyCheck(null);
  }, [walletAddress, readyCheck]);

  // Format countdown
  const formatCountdown = (targetTime: number): string => {
    const diff = targetTime - now;
    if (diff <= 0) return 'Starting...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Format time for display
  const formatTime = (timestamp: number): string => {
    return formatInTimeZone(timestamp, userTimezone, 'h:mm a zzz');
  };

  // Get countdown urgency color
  const getUrgencyColor = (targetTime: number): string => {
    const diff = targetTime - now;
    if (diff <= 60000) return 'text-danger'; // < 1 min
    if (diff <= 300000) return 'text-warning'; // < 5 min
    return 'text-white';
  };

  // Check if user is registered
  const isRegistered = (match: ScheduledMatch): boolean => {
    return walletAddress ? match.registeredPlayers.includes(walletAddress) : false;
  };

  // Check if registration is open
  const canRegister = (match: ScheduledMatch): boolean => {
    return match.status === 'registration_open' &&
           match.registeredPlayers.length < match.maxPlayers;
  };

  // Filter and limit matches
  const displayMatches = limit ? matches.slice(0, limit) : matches;

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 text-white/60">
          <div className="w-4 h-4 border-2 border-white/20 border-t-warning rounded-full animate-spin" />
          <span>Loading scheduled matches...</span>
        </div>
      </div>
    );
  }

  // No matches
  if (displayMatches.length === 0) {
    return (
      <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-6 text-center">
        <Calendar className="w-10 h-10 mx-auto mb-3 text-white/30" />
        <p className="text-white/60">No upcoming scheduled matches</p>
        <p className="text-sm text-white/40 mt-1">Check back soon for the next battle!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-bold text-white">Upcoming Scheduled Battles</h3>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 flex items-center gap-2 text-danger text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-danger/60 hover:text-danger"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Match cards */}
      <div className="space-y-3">
        {displayMatches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            now={now}
            isRegistered={isRegistered(match)}
            canRegister={canRegister(match)}
            isPending={registrationPending === match.id}
            onRegister={() => handleRegister(match.id)}
            onUnregister={() => handleUnregister(match.id)}
            formatCountdown={formatCountdown}
            formatTime={formatTime}
            getUrgencyColor={getUrgencyColor}
            walletConnected={connected}
          />
        ))}
      </div>

      {/* Ready Check Modal */}
      {readyCheck && (
        <ReadyCheckModal
          timeRemaining={readyCheck.timeRemaining}
          onReady={() => handleReadyResponse(true)}
          onNotReady={() => handleReadyResponse(false)}
        />
      )}
    </div>
  );
}

// Individual match card component
interface MatchCardProps {
  match: ScheduledMatch;
  now: number;
  isRegistered: boolean;
  canRegister: boolean;
  isPending: boolean;
  onRegister: () => void;
  onUnregister: () => void;
  formatCountdown: (time: number) => string;
  formatTime: (time: number) => string;
  getUrgencyColor: (time: number) => string;
  walletConnected: boolean;
}

function MatchCard({
  match,
  now,
  isRegistered,
  canRegister,
  isPending,
  onRegister,
  onUnregister,
  formatCountdown,
  formatTime,
  getUrgencyColor,
  walletConnected
}: MatchCardProps) {
  const statusLabel = getStatusLabel(match.status);
  const statusColor = getStatusColor(match.status);
  const countdown = formatCountdown(match.scheduledStartTime);
  const urgencyColor = getUrgencyColor(match.scheduledStartTime);
  const playerProgress = (match.registeredPlayers.length / match.maxPlayers) * 100;

  return (
    <div className="bg-black/40 backdrop-blur border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-sm text-white/60">
            {match.entryFee} SOL entry
          </span>
        </div>
        <div className={`text-lg font-bold ${urgencyColor}`}>
          {countdown}
        </div>
      </div>

      {/* Time display */}
      <div className="flex items-center gap-2 mb-3 text-sm text-white/70">
        <Clock className="w-4 h-4" />
        <span>Starts at {formatTime(match.scheduledStartTime)}</span>
      </div>

      {/* Player count with progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <div className="flex items-center gap-1 text-white/70">
            <Users className="w-4 h-4" />
            <span>Players</span>
          </div>
          <span className="font-medium">
            {match.registeredPlayers.length} / {match.maxPlayers}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-warning to-fire transition-all duration-300"
            style={{ width: `${playerProgress}%` }}
          />
        </div>
        {match.registeredPlayers.length < match.minPlayers && (
          <p className="text-xs text-white/50 mt-1">
            Minimum {match.minPlayers} players required
          </p>
        )}
      </div>

      {/* Action button */}
      <div className="flex gap-2">
        {!walletConnected ? (
          <button
            disabled
            className="flex-1 min-h-[44px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40 text-sm font-medium cursor-not-allowed"
          >
            Connect Wallet to Register
          </button>
        ) : isRegistered ? (
          <>
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-success/10 border border-success/30 rounded-lg text-success text-sm font-medium">
              <Check className="w-4 h-4" />
              <span>Registered</span>
            </div>
            <button
              onClick={onUnregister}
              disabled={isPending || match.status !== 'registration_open'}
              className="min-h-[44px] px-4 py-2 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm font-medium hover:bg-danger/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-danger/20 border-t-danger rounded-full animate-spin" />
              ) : (
                'Leave'
              )}
            </button>
          </>
        ) : canRegister ? (
          <button
            onClick={onRegister}
            disabled={isPending}
            className="flex-1 min-h-[44px] px-4 py-2 bg-gradient-to-r from-warning to-fire text-black font-bold rounded-lg hover:shadow-lg hover:shadow-warning/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto" />
            ) : (
              'Register Now'
            )}
          </button>
        ) : match.registeredPlayers.length >= match.maxPlayers ? (
          <button
            disabled
            className="flex-1 min-h-[44px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40 text-sm font-medium cursor-not-allowed"
          >
            Match Full
          </button>
        ) : (
          <button
            disabled
            className="flex-1 min-h-[44px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/40 text-sm font-medium cursor-not-allowed"
          >
            Registration Closed
          </button>
        )}
      </div>
    </div>
  );
}

// Ready Check Modal Component
interface ReadyCheckModalProps {
  timeRemaining: number;
  onReady: () => void;
  onNotReady: () => void;
}

function ReadyCheckModal({ timeRemaining, onReady, onNotReady }: ReadyCheckModalProps) {
  const urgency = timeRemaining <= 10 ? 'animate-pulse' : '';
  const progressWidth = (timeRemaining / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-md bg-[#0d0b09] border border-warning/30 rounded-xl overflow-hidden ${urgency}`}>
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-warning transition-all duration-1000"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 border border-warning/40 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Match Starting!</h2>
            <p className="text-white/60">Your scheduled match is about to begin</p>
          </div>

          {/* Countdown */}
          <div className="text-center mb-6">
            <div className={`text-5xl font-black ${timeRemaining <= 10 ? 'text-danger' : 'text-warning'}`}>
              {timeRemaining}s
            </div>
            <p className="text-white/50 text-sm mt-1">to confirm your spot</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onNotReady}
              className="flex-1 min-h-[52px] px-6 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger font-semibold hover:bg-danger/20 transition-colors touch-manipulation"
            >
              Not Ready
            </button>
            <button
              onClick={onReady}
              className="flex-1 min-h-[52px] px-6 py-3 bg-gradient-to-r from-success to-success/80 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-success/20 transition-all touch-manipulation"
            >
              Ready!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: Get status label
function getStatusLabel(status: ScheduledMatchStatus): string {
  switch (status) {
    case 'upcoming': return 'Upcoming';
    case 'registration_open': return 'Registration Open';
    case 'starting': return 'Starting Soon';
    case 'in_progress': return 'In Progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

// Helper: Get status color classes
function getStatusColor(status: ScheduledMatchStatus): string {
  switch (status) {
    case 'upcoming': return 'bg-white/10 text-white/70';
    case 'registration_open': return 'bg-success/20 text-success';
    case 'starting': return 'bg-warning/20 text-warning';
    case 'in_progress': return 'bg-accent/20 text-accent';
    case 'completed': return 'bg-white/10 text-white/50';
    case 'cancelled': return 'bg-danger/20 text-danger';
    default: return 'bg-white/10 text-white/70';
  }
}

// Export NextMatchBanner for use in battle page
export function NextMatchBanner() {
  const [nextMatch, setNextMatch] = useState<ScheduledMatch | null>(null);
  const [now, setNow] = useState(Date.now());

  const userTimezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

  // Update now every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Socket subscription for next match
  useEffect(() => {
    const socket = getSocket();

    socket.emit('subscribe_scheduled_matches', 'battle');

    const handleMatchesList = (data: ScheduledMatch[]) => {
      // Get first upcoming or registration_open match
      const upcoming = data
        .filter(m => m.status === 'upcoming' || m.status === 'registration_open')
        .sort((a, b) => a.scheduledStartTime - b.scheduledStartTime)[0];
      setNextMatch(upcoming || null);
    };

    const handleMatchUpdated = (match: ScheduledMatch) => {
      if (match.status === 'upcoming' || match.status === 'registration_open') {
        setNextMatch(prev => {
          if (!prev || match.scheduledStartTime < prev.scheduledStartTime) {
            return match;
          }
          return prev.id === match.id ? match : prev;
        });
      }
    };

    const anySocket = socket as any;
    anySocket.on('scheduled_matches_list', handleMatchesList);
    anySocket.on('scheduled_match_updated', handleMatchUpdated);

    return () => {
      socket.emit('unsubscribe_scheduled_matches', 'battle');
      anySocket.off('scheduled_matches_list', handleMatchesList);
      anySocket.off('scheduled_match_updated', handleMatchUpdated);
    };
  }, []);

  if (!nextMatch) return null;

  const formattedTime = formatInTimeZone(nextMatch.scheduledStartTime, userTimezone, 'h:mm a');

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-warning font-bold">Next Battle:</span>
        <span className="text-white">{formattedTime}</span>
        <span className="text-white/60">
          ({nextMatch.registeredPlayers.length}/{nextMatch.maxPlayers} registered)
        </span>
      </div>
      <a
        href="#scheduled"
        className="text-warning underline text-sm hover:text-warning/80 transition-colors touch-manipulation"
      >
        Register Now
      </a>
    </div>
  );
}
