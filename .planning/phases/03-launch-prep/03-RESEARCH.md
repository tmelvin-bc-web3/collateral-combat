# Phase 3: Launch Prep - Research

**Researched:** 2026-01-22
**Domain:** Scheduled match times and job scheduling for multiplayer gaming platforms
**Confidence:** HIGH

## Summary

Scheduled match times solve the cold-start problem by creating artificial player density at specific times. Instead of "play anytime" (which leads to empty matchmaking), scheduled sessions guarantee that players show up simultaneously, ensuring viable matches.

The research identifies three core technical domains:
1. **Job scheduling infrastructure** - Node.js scheduling libraries for triggering match starts
2. **Match time patterns** - Time windows vs instant starts, timezone handling, no-show policies
3. **UI patterns** - Countdown timers, upcoming matches display, player commitment flows

**Primary recommendation:** Use node-cron for simple scheduled match triggers (lightweight, no external dependencies), implement time-window matches (15-30 minute registration windows before instant start), display upcoming matches with countdown timers, and handle timezones by storing all times in UTC and converting client-side.

## Standard Stack

The established libraries/tools for scheduled events in Node.js gaming platforms:

### Core Scheduling Libraries
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | ^3.0.3 | Simple cron-based task scheduling | Lightweight, no external dependencies, perfect for time-based triggers |
| BullMQ | ^5.26.3 | Advanced queue system with Redis | Production-grade persistence, automatic retries, horizontal scaling |
| date-fns-tz | ^3.2.0 | Timezone-aware date manipulation | Lightweight alternative to moment-timezone, better tree-shaking |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dayjs | ^1.11.13 | Lightweight date library | Client-side date formatting and display |
| Redis | ^5.10.0 | In-memory store for BullMQ | If choosing BullMQ for job queue |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron | BullMQ + Redis | BullMQ offers persistence, retries, distributed workers, but requires Redis infrastructure and adds complexity |
| node-cron | Agenda + MongoDB | Agenda provides persistence with MongoDB, but you're not using MongoDB already |
| date-fns-tz | moment-timezone | moment is heavier bundle, deprecated in favor of luxon/dayjs/date-fns |

**Recommendation for Sol-Battles:**
Use **node-cron** - you already have WebSocket infrastructure and don't need job persistence. Scheduled matches are stateless triggers that start games; if the server restarts, the next cron tick will handle the next match. No need for Redis/MongoDB overhead.

**Installation:**
```bash
npm install node-cron
npm install date-fns-tz
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── services/
│   ├── scheduledMatchManager.ts    # Core scheduling logic
│   ├── matchScheduleStore.ts       # In-memory schedule storage
│   └── timezoneService.ts          # UTC conversion utilities
├── cron/
│   └── matchTriggers.ts            # Cron job definitions
└── types.ts                         # ScheduledMatch types
```

### Pattern 1: Scheduled Match Manager (Service Pattern)
**What:** Central service manages scheduled match times, registration windows, and player commitments
**When to use:** For any game mode that needs scheduled sessions (Battle Arena, Draft Tournaments)
**Example:**
```typescript
// Backend: scheduledMatchManager.ts
interface ScheduledMatch {
  id: string;
  gameMode: 'battle' | 'draft' | 'lds';
  scheduledStartTime: number; // UTC timestamp
  registrationOpens: number;  // UTC timestamp
  registrationCloses: number; // UTC timestamp (e.g., 5 min before start)
  minPlayers: number;
  maxPlayers: number;
  registeredPlayers: string[]; // wallet addresses
  confirmedPlayers: string[];  // players who passed ready check
  status: 'upcoming' | 'registration_open' | 'starting' | 'in_progress' | 'completed' | 'cancelled';
  entryFee: number;
}

class ScheduledMatchManager {
  private schedules: Map<string, ScheduledMatch> = new Map();
  private listeners: Set<(event: string, data: any) => void> = new Set();

  // Create scheduled matches (e.g., hourly battles, daily drafts)
  createRecurringSchedule(gameMode: string, pattern: string) {
    // pattern: '0 * * * *' for hourly, '0 12 * * *' for daily at noon UTC
    cron.schedule(pattern, () => {
      const match = this.createScheduledMatch(gameMode);
      this.notifyListeners('match_scheduled', match);
    });
  }

  // Register player for upcoming match
  registerPlayer(matchId: string, wallet: string): boolean {
    const match = this.schedules.get(matchId);
    if (!match) throw new Error('Match not found');
    if (match.status !== 'registration_open') throw new Error('Registration closed');
    if (match.registeredPlayers.length >= match.maxPlayers) throw new Error('Match full');

    match.registeredPlayers.push(wallet);
    this.notifyListeners('player_registered', { matchId, wallet });
    return true;
  }

  // Trigger match start (called by cron at scheduledStartTime)
  async startMatch(matchId: string): Promise<void> {
    const match = this.schedules.get(matchId);
    if (!match) return;

    // Check minimum players
    if (match.registeredPlayers.length < match.minPlayers) {
      match.status = 'cancelled';
      this.refundPlayers(match);
      this.notifyListeners('match_cancelled_insufficient_players', match);
      return;
    }

    // Ready check: give players 30 seconds to confirm
    await this.performReadyCheck(match);

    // Start the actual game with confirmed players
    if (match.confirmedPlayers.length >= match.minPlayers) {
      match.status = 'in_progress';
      await this.initializeGame(match);
    } else {
      match.status = 'cancelled';
      this.refundPlayers(match);
    }
  }
}
```

### Pattern 2: Time Window Registration with Ready Check
**What:** Players register during a window (e.g., 15 minutes before match), then must confirm readiness right before start
**When to use:** For competitive modes where commitment is important (Battle Arena, tournaments)
**Example:**
```typescript
// Two-phase commitment system
// Phase 1: Registration window (15-30 min before match)
//   - Players browse upcoming matches
//   - Click "Register" to reserve slot
//   - Entry fee locked (not deducted yet)
//
// Phase 2: Ready check (30 sec before match start)
//   - All registered players receive notification
//   - Must click "Ready" within 30 seconds
//   - No-shows forfeit their slot (entry fee refunded minus 10% penalty)
//   - Match starts with ready players only

interface ReadyCheckState {
  matchId: string;
  playersRequired: string[];
  playersReady: string[];
  expiresAt: number;
}

async performReadyCheck(match: ScheduledMatch): Promise<void> {
  const readyCheck: ReadyCheckState = {
    matchId: match.id,
    playersRequired: [...match.registeredPlayers],
    playersReady: [],
    expiresAt: Date.now() + 30000 // 30 seconds
  };

  // Notify all registered players
  this.notifyListeners('ready_check_started', readyCheck);

  // Wait 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Determine who's ready
  match.confirmedPlayers = readyCheck.playersReady;
  const noShows = readyCheck.playersRequired.filter(
    p => !readyCheck.playersReady.includes(p)
  );

  // Penalize no-shows (10% penalty)
  noShows.forEach(wallet => {
    this.refundWithPenalty(wallet, match.entryFee, 0.10);
  });
}
```

### Pattern 3: UTC Storage with Client-Side Conversion
**What:** Store all scheduled times in UTC on backend, convert to user's timezone in UI
**When to use:** Always (standard practice for global applications)
**Example:**
```typescript
// Backend: Always work in UTC
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

function createScheduledMatch(utcHour: number): ScheduledMatch {
  const now = new Date();
  const scheduledTime = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    utcHour,
    0,
    0
  ));

  return {
    scheduledStartTime: scheduledTime.getTime(),
    registrationOpens: scheduledTime.getTime() - 30 * 60 * 1000, // 30 min before
    registrationCloses: scheduledTime.getTime() - 5 * 60 * 1000,  // 5 min before
    // ...
  };
}

// Frontend: Convert to user's timezone
import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

function MatchScheduleCard({ match }: { match: ScheduledMatch }) {
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = utcToZonedTime(match.scheduledStartTime, userTimezone);

  return (
    <div>
      <p>Starts: {format(localTime, 'h:mm a zzz')}</p>
      <p>Registration closes: {format(
        utcToZonedTime(match.registrationCloses, userTimezone),
        'h:mm a'
      )}</p>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Don't store timezone offsets** - Use IANA timezone names (America/New_York) not UTC+5, offsets change with DST
- **Don't schedule based on local time** - Always calculate from UTC to avoid DST bugs
- **Don't skip ready checks for paid matches** - No-shows ruin the experience for committed players
- **Don't allow late joins** - Start matches exactly on time to build trust in schedule reliability

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setInterval loops with time checks | node-cron | Handles DST, leap seconds, complex patterns; battle-tested |
| Timezone conversion | Manual offset calculations | date-fns-tz or Intl API | DST transitions, historical timezone changes, edge cases |
| Countdown timers | Custom interval-based counters | Browser's Intl.RelativeTimeFormat or date-fns | Handles formatting, localization, accessibility |
| Job queue with persistence | Custom database polling | BullMQ + Redis (if needed) | Distributed locks, retries, priority, monitoring |
| Ready check system | Custom WebSocket protocol | Existing battle manager pattern | Already implemented in battleManager.ts for matchmaking |

**Key insight:** Scheduling seems trivial but has many edge cases (timezones, DST, leap seconds, server restarts). Use proven libraries rather than reimplementing time logic.

## Common Pitfalls

### Pitfall 1: No-Show Epidemic
**What goes wrong:** Players register for matches but don't show up, wasting time for committed players
**Why it happens:** No commitment mechanism, no penalty for flaking
**How to avoid:**
- Implement ready check 30-60 seconds before match start
- Small penalty for no-shows (10% of entry fee, or temp matchmaking cooldown)
- Require minimum confirmed players to start match
**Warning signs:** High registration but low actual match completion rates

### Pitfall 2: Timezone Confusion
**What goes wrong:** Players show up at wrong time because times displayed in wrong timezone
**Why it happens:** Storing times in server's local timezone, or displaying UTC to users
**How to avoid:**
- Store ALL times in UTC on backend
- Convert to user's timezone in frontend using `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Always show timezone abbreviation in UI (e.g., "7:00 PM PST")
- Test with users in different timezones
**Warning signs:** Players complaining "the match already started" or "I thought it was in 2 hours"

### Pitfall 3: DST Transition Bugs
**What goes wrong:** Matches scheduled at "2:00 AM" disappear during spring-forward DST transitions
**Why it happens:** Some local times don't exist during DST transitions
**How to avoid:**
- Schedule based on UTC, not local time
- Use libraries (date-fns-tz) that handle DST transitions
- Avoid scheduling near DST transition times (2-3 AM)
**Warning signs:** Mysterious missing matches twice a year (March/November)

### Pitfall 4: Server Restart = Lost Schedules
**What goes wrong:** Server restarts, all scheduled matches disappear
**Why it happens:** Cron jobs only exist in-memory, not persisted
**How to avoid:**
- For recurring patterns: Recreate cron jobs on server startup
- For one-off scheduled matches: Store in database, check on startup and reschedule
- OR use BullMQ with Redis for automatic persistence
**Warning signs:** Players lose registered matches after deployments

### Pitfall 5: Cold Start Still Happens (Not Enough Density)
**What goes wrong:** Scheduled matches at bad times still have no players
**Why it happens:** Too many schedule slots spreads players too thin
**How to avoid:**
- Start with FEWER schedule slots (e.g., hourly, not every 15 min)
- Concentrate density: better to have 2 full matches than 5 half-empty ones
- Show player counts on upcoming matches to create FOMO
- Cancel matches that don't hit minimum threshold BEFORE start time
**Warning signs:** Lots of cancelled matches due to insufficient players

### Pitfall 6: Instant Start Without Registration Window
**What goes wrong:** Players browse match list, by the time they decide, match already started
**Why it happens:** Zero registration window, instant start on the hour
**How to avoid:**
- Open registration 15-30 minutes before match start
- Show countdown "Registration closes in 5 minutes"
- Lock registration 5 minutes before start for ready check
**Warning signs:** Players frustrated they can't join matches they see listed

## Code Examples

Verified patterns from Node.js ecosystem and gaming best practices:

### Recurring Match Scheduler
```typescript
// Source: node-cron documentation + gaming platform patterns
import cron from 'node-cron';

class MatchScheduler {
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();

  // Schedule hourly battle arenas at :00 (e.g., 1:00 PM, 2:00 PM, ...)
  scheduleHourlyBattles() {
    const job = cron.schedule('0 * * * *', () => {
      const startTime = Date.now() + 30 * 60 * 1000; // Start in 30 min
      const match = scheduledMatchManager.createScheduledMatch({
        gameMode: 'battle',
        scheduledStartTime: startTime,
        registrationOpens: Date.now(), // Open immediately
        registrationCloses: startTime - 5 * 60 * 1000, // Close 5 min before start
        minPlayers: 2,
        maxPlayers: 8,
        entryFee: 0.1, // 0.1 SOL
      });

      console.log(`[Scheduler] Created hourly battle at ${new Date(startTime).toISOString()}`);

      // Schedule the actual match start
      this.scheduleMatchStart(match);
    });

    this.activeJobs.set('hourly_battles', job);
  }

  // Schedule daily draft tournaments at 12:00 UTC
  scheduleDailyDrafts() {
    const job = cron.schedule('0 12 * * *', () => {
      const startTime = Date.now() + 2 * 60 * 60 * 1000; // Start in 2 hours (14:00 UTC)
      const match = scheduledMatchManager.createScheduledMatch({
        gameMode: 'draft',
        scheduledStartTime: startTime,
        registrationOpens: Date.now(),
        registrationCloses: startTime - 15 * 60 * 1000, // Close 15 min before
        minPlayers: 4,
        maxPlayers: 50,
        entryFee: 0.5,
      });

      console.log(`[Scheduler] Created daily draft at ${new Date(startTime).toISOString()}`);
      this.scheduleMatchStart(match);
    });

    this.activeJobs.set('daily_drafts', job);
  }

  // Schedule match start trigger
  private scheduleMatchStart(match: ScheduledMatch) {
    const delay = match.scheduledStartTime - Date.now();

    setTimeout(() => {
      scheduledMatchManager.startMatch(match.id);
    }, delay);
  }

  // Reinitialize schedules on server restart
  initialize() {
    console.log('[Scheduler] Initializing scheduled matches...');
    this.scheduleHourlyBattles();
    this.scheduleDailyDrafts();
    console.log('[Scheduler] All schedules active');
  }

  // Cleanup
  destroy() {
    this.activeJobs.forEach(job => job.stop());
    this.activeJobs.clear();
  }
}

export const matchScheduler = new MatchScheduler();
```

### WebSocket Events for Scheduled Matches
```typescript
// Backend: Socket.IO events
io.on('connection', (socket) => {

  // Subscribe to upcoming matches
  socket.on('subscribe_scheduled_matches', (gameMode: string) => {
    socket.join(`scheduled:${gameMode}`);

    // Send current upcoming matches
    const upcoming = scheduledMatchManager.getUpcomingMatches(gameMode);
    socket.emit('scheduled_matches_list', upcoming);
  });

  // Register for a scheduled match
  socket.on('register_for_match', async (data: { matchId: string; wallet: string }) => {
    const rateCheck = checkSocketRateLimit(socket.id, data.wallet, 'register_match', GAME_JOIN_LIMIT);
    if (!rateCheck.allowed) {
      socket.emit('error', rateCheck.error);
      return;
    }

    try {
      // Verify balance for entry fee
      const match = scheduledMatchManager.getMatch(data.matchId);
      if (!match) throw new Error('Match not found');

      const entryFeeLamports = match.entryFee * LAMPORTS_PER_SOL;
      const hasSufficient = await balanceService.hasSufficientBalance(data.wallet, entryFeeLamports);
      if (!hasSufficient) throw new Error('Insufficient balance');

      // Lock entry fee (don't deduct yet, just reserve)
      await balanceService.debitPending(data.wallet, entryFeeLamports, 'scheduled_match', match.id);

      // Register player
      scheduledMatchManager.registerPlayer(match.id, data.wallet);

      socket.emit('match_registration_success', { matchId: match.id });

      // Notify all subscribers of updated match
      io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated', match);
    } catch (error: any) {
      socket.emit('error', error.message);
    }
  });

  // Ready check response
  socket.on('ready_check_response', (data: { matchId: string; wallet: string; ready: boolean }) => {
    scheduledMatchManager.handleReadyCheckResponse(data.matchId, data.wallet, data.ready);
  });
});

// When match updates happen, notify subscribers
scheduledMatchManager.subscribe((event, data) => {
  if (event === 'player_registered' || event === 'player_unregistered') {
    const match = scheduledMatchManager.getMatch(data.matchId);
    if (match) {
      io.to(`scheduled:${match.gameMode}`).emit('scheduled_match_updated', match);
    }
  }

  if (event === 'ready_check_started') {
    // Notify all registered players
    data.playersRequired.forEach((wallet: string) => {
      const socketId = walletToSocketId.get(wallet);
      if (socketId) {
        io.to(socketId).emit('ready_check', {
          matchId: data.matchId,
          expiresAt: data.expiresAt
        });
      }
    });
  }
});
```

### Frontend: Upcoming Matches UI with Countdown
```typescript
// Frontend: components/UpcomingMatches.tsx
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { utcToZonedTime, format } from 'date-fns-tz';

interface UpcomingMatchesProps {
  gameMode: 'battle' | 'draft';
}

export function UpcomingMatches({ gameMode }: UpcomingMatchesProps) {
  const [matches, setMatches] = useState<ScheduledMatch[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const socket = getSocket();
  const { publicKey } = useWallet();

  useEffect(() => {
    // Subscribe to scheduled matches
    socket.emit('subscribe_scheduled_matches', gameMode);

    socket.on('scheduled_matches_list', (data: ScheduledMatch[]) => {
      setMatches(data);
    });

    socket.on('scheduled_match_updated', (match: ScheduledMatch) => {
      setMatches(prev => prev.map(m => m.id === match.id ? match : m));
    });

    // Update countdown every second
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.off('scheduled_matches_list');
      socket.off('scheduled_match_updated');
    };
  }, [gameMode]);

  const handleRegister = (matchId: string) => {
    if (!publicKey) return;
    socket.emit('register_for_match', {
      matchId,
      wallet: publicKey.toBase58()
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Upcoming Matches</h2>

      {matches.map(match => {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const startTime = utcToZonedTime(match.scheduledStartTime, userTimezone);
        const regCloses = utcToZonedTime(match.registrationCloses, userTimezone);

        const isRegistrationOpen = match.status === 'registration_open';
        const isFull = match.registeredPlayers.length >= match.maxPlayers;
        const timeUntilStart = match.scheduledStartTime - currentTime;
        const timeUntilRegCloses = match.registrationCloses - currentTime;

        return (
          <div key={match.id} className="border rounded-lg p-4 bg-black/40">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-lg font-bold">
                  {format(startTime, 'h:mm a zzz')}
                </p>
                <p className="text-sm text-gray-400">
                  Starts in {formatDistanceToNow(startTime)}
                </p>

                {isRegistrationOpen && (
                  <p className="text-xs text-warning mt-1">
                    Registration closes in {formatDistanceToNow(regCloses)}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-sm">
                  {match.registeredPlayers.length}/{match.maxPlayers} players
                </p>
                <p className="text-xs text-gray-400">
                  Min: {match.minPlayers}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm">Entry: {match.entryFee} SOL</span>

              <button
                onClick={() => handleRegister(match.id)}
                disabled={!isRegistrationOpen || isFull}
                className="px-4 py-2 bg-warning text-black rounded disabled:opacity-50"
              >
                {isFull ? 'Full' : isRegistrationOpen ? 'Register' : 'Closed'}
              </button>
            </div>

            {/* Player list preview */}
            {match.registeredPlayers.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                Registered: {match.registeredPlayers.slice(0, 3).map(w =>
                  w.slice(0, 6) + '...'
                ).join(', ')}
                {match.registeredPlayers.length > 3 && ` +${match.registeredPlayers.length - 3} more`}
              </div>
            )}
          </div>
        );
      })}

      {matches.length === 0 && (
        <p className="text-gray-400 text-center py-8">
          No upcoming matches scheduled
        </p>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Always-on matchmaking | Scheduled time slots | 2020-2023 | Solves cold-start by guaranteeing player density; used by indie multiplayer games |
| moment-timezone | date-fns-tz / Intl API | 2020+ | Smaller bundle size, better tree-shaking, native browser APIs |
| Bull (v3) | BullMQ (v5) | 2023 | Complete TypeScript rewrite, better performance, modern Redis features |
| Instant starts | Time windows + ready checks | 2022+ | Reduces no-shows, improves commitment, prevents wasted time |

**Deprecated/outdated:**
- **moment.js**: Deprecated in favor of date-fns, dayjs, luxon (too large for modern bundlers)
- **Bull v3**: Replaced by BullMQ (better TypeScript support, active maintenance)
- **Agenda**: Less active maintenance compared to BullMQ, MongoDB-only is limiting

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal schedule density for Sol-Battles**
   - What we know: Too many slots spreads players thin, too few creates long waits
   - What's unclear: Right balance for initial launch (hourly? every 2 hours?)
   - Recommendation: Start conservative (every 2 hours), monitor fill rates, increase frequency if matches fill consistently. Better to have 100% full matches than 50% empty slots.

2. **No-show penalty severity**
   - What we know: Need some penalty to discourage flaking, but too harsh hurts casual players
   - What's unclear: Right balance between 5% (too lenient) and 20% (too harsh) penalty
   - Recommendation: Start with 10% penalty + 15-minute matchmaking cooldown. Monitor no-show rates and adjust. Consider escalating penalties for repeat offenders.

3. **Ready check timing**
   - What we know: 30 seconds is standard, but may be too short if players aren't actively watching
   - What's unclear: Need for push notifications or email reminders for registered matches
   - Recommendation: 30-second ready check is fine IF players get push notification when it starts. Consider browser notification API or email reminder 5 minutes before match.

4. **Cross-mode scheduling**
   - What we know: Oracle predictions run continuously (30-sec rounds), battles would be scheduled
   - What's unclear: Whether to schedule other modes (Draft, LDS, Token Wars) or keep instant matchmaking
   - Recommendation: Only schedule high-commitment modes (Battle Arena with entry fees, Draft tournaments). Keep low-commitment modes (Oracle) as instant-play. LDS and Token Wars could work either way depending on player count.

## Sources

### Primary (HIGH confidence)
- [Schedulers in Node: A Comparison of the Top 10 Libraries | Better Stack Community](https://betterstack.com/community/guides/scaling-nodejs/best-nodejs-schedulers/)
- [Job Schedulers for Node: Bull or Agenda? | AppSignal Blog](https://blog.appsignal.com/2023/09/06/job-schedulers-for-node-bull-or-agenda.html)
- [BullMQ Documentation](https://docs.bullmq.io)
- [node-cron npm package](https://www.npmjs.com/package/node-cron)
- [Solving the Timezone Puzzle in Node.js Development | Medium](https://medium.com/@karanchugh02/solving-the-timezone-puzzle-in-node-js-development-832e7ef86bc5)
- [Using Node.js to Implement Dynamic Scheduled Notifications Across Time Zones](https://medium.com/@tempmailwithpassword/implementing-dynamic-scheduled-notifications-across-time-zones-with-node-js-3b99bf6ad7bd)

### Secondary (MEDIUM confidence)
- [Analysis: multiplayer game discovery & the 'cold start problem'](https://newsletter.gamediscover.co/p/analysis-multiplayer-game-discovery) - Excellent analysis of cold-start problem in multiplayer games
- [Game Matchmaking Architecture: Scaling to One Million Players](https://accelbyte.io/blog/scaling-matchmaking-to-one-million-players)
- [Tournament Settings | Limitless Docs](https://docs.limitlesstcg.com/organizer/reference) - No-show policies and ready checks
- [Mobile Gaming Trends 2026: Neural Networks, AI, and the Future](https://www.bigabid.com/mobile-gaming-trends-2026/) - AI-driven LiveOps and scheduled challenges

### Tertiary (LOW confidence)
- WebSearch results on gaming trends and matchmaking patterns - general industry direction but not prescriptive implementation details

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - node-cron is battle-tested for simple scheduling, BullMQ is production-standard for queues
- Architecture: HIGH - Patterns based on Node.js best practices and gaming platform standards
- Timezone handling: HIGH - UTC storage + client conversion is universal standard
- No-show policies: MEDIUM - Best practices from tournament platforms, but optimal values need testing
- UI patterns: MEDIUM - Countdown timers and upcoming matches are standard, but exact UX needs Sol-Battles-specific design

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - scheduling libraries are stable, patterns are established)
