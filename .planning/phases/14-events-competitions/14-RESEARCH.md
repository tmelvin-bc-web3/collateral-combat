# Phase 14: Events & Competitions - Research

**Researched:** 2026-01-24
**Domain:** Tournament brackets, scheduled events, notifications, fight cards
**Confidence:** HIGH

## Summary

Phase 14 implements scheduled events (fight cards) and single-elimination tournaments for the DegenDome platform. This phase builds on existing infrastructure for scheduled matches, notifications, and the draft tournament system.

The platform already has robust foundations: `scheduledMatchManager.ts` provides cron-based event scheduling with registration, ready checks, and no-show handling; `notificationDatabase.ts` offers a notification persistence layer; and `draftTournamentManager.ts` demonstrates tournament lifecycle management with prize pool distribution.

**Primary recommendation:** Extend the existing `scheduledMatchManager` pattern for events/fight cards, create a new `tournamentManager.ts` for bracket-based competitions using the LDS manager pattern for game lifecycle, and use `@g-loot/react-tournament-brackets` for bracket visualization on the frontend.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node-cron` | ^3.x | Event scheduling | Already used in scheduledMatchManager |
| `better-sqlite3` | ^9.x | Tournament persistence | Consistent with project patterns |
| `uuid` | ^9.x | Unique IDs | Already used throughout |
| `@g-loot/react-tournament-brackets` | ^1.x | Bracket visualization | Well-maintained, customizable, SVG-based |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| socket.io | ^4.x | Real-time updates | Already core to project |
| styled-components | ^6.x | Bracket theming | If custom theme needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@g-loot/react-tournament-brackets` | `react-brackets` | Less maintained, fewer features |
| SQLite | PostgreSQL | Overkill for tournament data volume |
| Custom bracket component | Build from scratch | Much more effort, same result |

**Installation:**
```bash
# Backend - no new dependencies (use existing stack)
# Frontend:
cd web && pnpm add @g-loot/react-tournament-brackets
```

## Architecture Patterns

### Recommended Project Structure
```
backend/src/
├── services/
│   ├── eventManager.ts           # Fight card/event lifecycle
│   └── tournamentManager.ts      # Bracket tournament lifecycle
├── db/
│   ├── eventDatabase.ts          # Event persistence
│   └── tournamentDatabase.ts     # Tournament/bracket persistence
└── types.ts                      # Extended with Event/Tournament types

web/src/
├── components/
│   ├── events/                   # Fight card components
│   │   ├── FightCard.tsx
│   │   ├── EventCountdown.tsx
│   │   └── UpcomingEvents.tsx
│   └── tournament/               # Tournament components
│       ├── BracketViewer.tsx
│       ├── TournamentLobby.tsx
│       └── TournamentLeaderboard.tsx
└── app/
    ├── events/page.tsx           # Main events page
    └── tournament/[id]/page.tsx  # Tournament bracket view
```

### Pattern 1: Event Manager (Singleton with Cron)
**What:** Central service managing fight card lifecycle
**When to use:** All event creation, registration, notifications
**Example:**
```typescript
// Source: Pattern from existing scheduledMatchManager.ts
class EventManager {
  private eventTimers: Map<string, NodeJS.Timeout> = new Map();
  private schedulerTimer: NodeJS.Timeout | null = null;

  initialize(): void {
    // Schedule daily events using node-cron
    cron.schedule('0 0 * * *', () => this.createDailyEvents());
    this.startNotificationTicker();
  }

  private startNotificationTicker(): void {
    // Check every 60 seconds for events starting soon
    setInterval(() => {
      this.checkUpcomingNotifications();
    }, 60_000);
  }

  private checkUpcomingNotifications(): void {
    const events = this.getEventsStartingIn(5 * 60 * 1000); // 5 min
    for (const event of events) {
      this.notifySubscribers(event);
    }
  }
}
```

### Pattern 2: Tournament Bracket Structure
**What:** Single elimination bracket with power-of-2 players
**When to use:** 8, 16, or future 32-player tournaments
**Example:**
```typescript
// Source: Common bracket structure for 8 players
interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;        // 1=Quarterfinals, 2=Semifinals, 3=Finals
  position: number;     // Position within round (0-3 for QF, 0-1 for SF, 0 for F)
  player1Wallet: string | null;
  player2Wallet: string | null;
  winnerWallet: string | null;
  battleId: string | null; // Link to actual battle
  scheduledTime: number;
  status: 'pending' | 'in_progress' | 'completed';
}

// 8-player single elimination = 7 matches (4 QF + 2 SF + 1 Final)
// 16-player single elimination = 15 matches (8 + 4 + 2 + 1)
```

### Pattern 3: Prize Pool Distribution
**What:** Percentage-based distribution after rake
**When to use:** Tournament settlement
**Example:**
```typescript
// Source: Industry standard for esports/poker tournaments
const PRIZE_DISTRIBUTION = {
  8: [
    { place: 1, percent: 50 },
    { place: 2, percent: 30 },
    { place: 3, percent: 20 },  // 3rd place match or split among SF losers
  ],
  16: [
    { place: 1, percent: 40 },
    { place: 2, percent: 25 },
    { place: 3, percent: 15 },  // Both SF losers
    { place: 4, percent: 10 },
    { place: 5, percent: 10 },  // Split among remaining places
  ],
};

// After 5% platform rake (from existing PLATFORM_FEE_PERCENT)
const distributePrizes = (prizePool: number, playerCount: 8 | 16) => {
  const netPool = prizePool * 0.95;
  const distribution = PRIZE_DISTRIBUTION[playerCount];
  return distribution.map(d => ({
    place: d.place,
    payout: Math.floor(netPool * d.percent / 100),
  }));
};
```

### Pattern 4: Countdown Timer Sync
**What:** Server-authoritative countdown with client prediction
**When to use:** Event countdowns, round timers
**Example:**
```typescript
// Source: Existing pattern in LDS and prediction rounds
// Server broadcasts absolute timestamps, not relative durations
interface EventUpdate {
  eventId: string;
  scheduledStartTime: number;  // Absolute Unix timestamp
  registrationEnds: number;    // Absolute Unix timestamp
  status: EventStatus;
}

// Client calculates remaining time
const getTimeRemaining = (targetTime: number) => {
  return Math.max(0, targetTime - Date.now());
};
```

### Anti-Patterns to Avoid
- **Building custom bracket rendering:** Use `@g-loot/react-tournament-brackets` instead of SVG/canvas from scratch
- **Client-side timers without sync:** Always use server timestamps, re-sync on reconnect
- **Polling for notifications:** Use WebSocket push from existing Socket.io infrastructure
- **In-memory only state:** Persist all tournament state to SQLite for crash recovery

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bracket visualization | Custom SVG/canvas | `@g-loot/react-tournament-brackets` | Handles panning, zooming, responsive, theming |
| Cron scheduling | Custom interval logic | `node-cron` | Already in project, handles edge cases |
| Notification queue | Custom polling | Existing notification database + Socket.io | Pattern already established |
| Prize distribution math | Manual calculations | Lookup table + standard formula | Avoids floating point errors, auditable |
| Tournament seeding | Random shuffle | Fisher-Yates + ELO-based seeding | Fairness matters for competitive integrity |

**Key insight:** The project already has most infrastructure needed. Reuse `scheduledMatchManager` patterns, `notificationDatabase`, and `draftTournamentManager` lifecycle patterns.

## Common Pitfalls

### Pitfall 1: Race Conditions in Match Advancement
**What goes wrong:** Two players finish a bracket match simultaneously, both try to advance winner
**Why it happens:** No atomic update of bracket state
**How to avoid:** Use database transactions for match result + next match seeding
**Warning signs:** Duplicate entries in next round, missing players

### Pitfall 2: Timezone Confusion for Scheduled Events
**What goes wrong:** Events start at wrong times for international users
**Why it happens:** Mixing local time with UTC
**How to avoid:** Store and transmit all times as UTC timestamps, convert in UI only
**Warning signs:** "Event started 3 hours ago" complaints

### Pitfall 3: Orphaned Tournament State After Crash
**What goes wrong:** Server restarts mid-tournament, matches never complete
**Why it happens:** In-memory state not persisted
**How to avoid:** Follow LDS pattern - persist all state to SQLite, resume on startup
**Warning signs:** Tournaments stuck in "in_progress" forever

### Pitfall 4: Notification Spam
**What goes wrong:** Users get dozens of "event starting" notifications
**Why it happens:** Ticker fires multiple times, no deduplication
**How to avoid:** Track "notified_for_event" flag in database, check before sending
**Warning signs:** User complaints, unsubscribes

### Pitfall 5: Prize Pool Calculation Drift
**What goes wrong:** Distributed prizes don't match collected entry fees
**Why it happens:** Rounding errors accumulate, or entry refunds not tracked
**How to avoid:** Calculate from source of truth (entries table), use lamports not SOL
**Warning signs:** Vault balance mismatch, user complaints about payouts

## Code Examples

Verified patterns from existing codebase and official sources:

### Event Database Schema
```typescript
// Source: Pattern from draftDatabase.ts and ldsDatabase.ts
db.exec(`
  -- Scheduled Events (Fight Cards)
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_start_time INTEGER NOT NULL,
    registration_opens INTEGER NOT NULL,
    registration_closes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    entry_fee_lamports INTEGER NOT NULL,
    max_participants INTEGER NOT NULL,
    prize_pool_lamports INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    created_by TEXT NOT NULL
  );

  -- Featured battles within an event
  CREATE TABLE IF NOT EXISTS event_battles (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    player1_wallet TEXT NOT NULL,
    player2_wallet TEXT NOT NULL,
    battle_id TEXT,
    is_main_event INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'scheduled',
    FOREIGN KEY (event_id) REFERENCES events(id)
  );

  -- Event subscriptions for notifications
  CREATE TABLE IF NOT EXISTS event_subscriptions (
    wallet_address TEXT NOT NULL,
    event_id TEXT NOT NULL,
    notified INTEGER DEFAULT 0,
    subscribed_at INTEGER NOT NULL,
    PRIMARY KEY (wallet_address, event_id)
  );
`);
```

### Tournament Database Schema
```typescript
// Source: Extended from existing draft tournament pattern
db.exec(`
  -- Bracket Tournaments
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'single_elimination',
    size INTEGER NOT NULL,  -- 8 or 16
    entry_fee_lamports INTEGER NOT NULL,
    scheduled_start_time INTEGER NOT NULL,
    registration_opens INTEGER NOT NULL,
    registration_closes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    prize_pool_lamports INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  -- Tournament registrations
  CREATE TABLE IF NOT EXISTS tournament_registrations (
    tournament_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    seed INTEGER,  -- Assigned at registration close based on ELO
    entry_fee_paid_lamports INTEGER NOT NULL,
    registered_at INTEGER NOT NULL,
    PRIMARY KEY (tournament_id, wallet_address)
  );

  -- Tournament matches (bracket structure)
  CREATE TABLE IF NOT EXISTS tournament_matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    player1_wallet TEXT,
    player2_wallet TEXT,
    winner_wallet TEXT,
    battle_id TEXT,
    scheduled_time INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
    UNIQUE(tournament_id, round, position)
  );
`);
```

### Bracket Generation
```typescript
// Source: Standard single elimination algorithm
function generateBracket(tournamentId: string, players: string[]): void {
  const size = players.length; // Must be 8 or 16
  const rounds = Math.log2(size);

  // Seed players (already sorted by ELO in reverse - #1 seed first)
  // Standard seeding: 1v8, 4v5, 3v6, 2v7 for 8-player
  const seeded = seedPlayers(players, size);

  // Create first round matches
  for (let i = 0; i < size / 2; i++) {
    createMatch({
      tournamentId,
      round: 1,
      position: i,
      player1Wallet: seeded[i * 2],
      player2Wallet: seeded[i * 2 + 1],
      status: 'pending',
    });
  }

  // Create placeholder matches for subsequent rounds
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = size / Math.pow(2, round);
    for (let pos = 0; pos < matchesInRound; pos++) {
      createMatch({
        tournamentId,
        round,
        position: pos,
        player1Wallet: null,  // TBD from previous round
        player2Wallet: null,
        status: 'pending',
      });
    }
  }
}

// Standard seeding for fairness (#1 faces #8, not #2)
function seedPlayers(players: string[], size: number): string[] {
  if (size === 8) {
    // [1, 8, 4, 5, 3, 6, 2, 7]
    const positions = [0, 7, 3, 4, 2, 5, 1, 6];
    return positions.map(i => players[i]);
  }
  // 16-player seeding similar pattern
  // ...
}
```

### React Bracket Component
```tsx
// Source: @g-loot/react-tournament-brackets documentation
import {
  SingleEliminationBracket,
  Match,
  SVGViewer,
  createTheme,
} from '@g-loot/react-tournament-brackets';

const wastelandTheme = createTheme({
  textColor: { main: '#FFFFFF', highlighted: '#ff5500', dark: '#888888' },
  matchBackground: { wonColor: '#1a1a1a', lostColor: '#0d0d0d' },
  score: { background: { wonColor: '#ff5500', lostColor: '#333333' } },
  border: { color: '#333333', highlightedColor: '#ff5500' },
});

interface TournamentBracketProps {
  matches: Match[];
  onMatchClick?: (match: Match) => void;
}

export function TournamentBracket({ matches, onMatchClick }: TournamentBracketProps) {
  return (
    <SingleEliminationBracket
      matches={matches}
      matchComponent={CustomMatch}
      theme={wastelandTheme}
      options={{
        style: {
          roundHeader: { backgroundColor: '#111111' },
          connectorColor: '#333333',
        },
      }}
    />
  );
}
```

### Notification Integration
```typescript
// Source: Existing notificationDatabase pattern
import { createNotification } from '../db/notificationDatabase';

export function notifyEventStarting(
  walletAddress: string,
  eventName: string,
  startsIn: number
): void {
  const minutes = Math.floor(startsIn / 60000);
  createNotification({
    walletAddress,
    type: 'system',  // Or add new 'event_starting' type
    title: 'Event Starting Soon',
    message: `${eventName} begins in ${minutes} minutes!`,
    data: { eventName, startsIn },
  });
}

export function notifyTournamentMatchReady(
  walletAddress: string,
  tournamentName: string,
  opponentWallet: string,
  round: number
): void {
  const roundName = getRoundName(round);  // "Quarterfinal", "Semifinal", "Final"
  createNotification({
    walletAddress,
    type: 'system',
    title: 'Tournament Match Ready',
    message: `Your ${roundName} match is ready!`,
    data: { tournamentName, opponentWallet, round },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Canvas bracket rendering | SVG with React | 2023+ | Better accessibility, easier styling |
| Polling for updates | WebSocket push | Standard | Required for real-time experience |
| In-memory tournament state | Persistent + cached | Standard | Crash recovery essential |

**Deprecated/outdated:**
- Manual bracket SVG generation: Use libraries
- Client-side countdown without server sync: Leads to drift
- Single notification channel: Modern apps support follow/subscribe patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Third-place match or split?**
   - What we know: Both approaches are valid. UFC doesn't have 3rd place matches, poker splits.
   - What's unclear: User preference for this platform
   - Recommendation: Start with split among semifinal losers (simpler), add 3rd place match in v2.1

2. **Event creation: Admin only or user-created?**
   - What we know: Requirements say "EVENT-04: Event creation admin flow"
   - What's unclear: Whether influencers/streamers should create events
   - Recommendation: Admin-only for v2.0, add user creation in future

3. **Tournament scheduling frequency**
   - What we know: Should be "TOUR-06: Scheduled tournament times"
   - What's unclear: How often - hourly, daily, weekly?
   - Recommendation: Start with daily at fixed times (e.g., 12:00 UTC, 20:00 UTC)

## Sources

### Primary (HIGH confidence)
- Existing codebase patterns: `scheduledMatchManager.ts`, `ldsManager.ts`, `draftTournamentManager.ts`
- `@g-loot/react-tournament-brackets` [npm documentation](https://www.npmjs.com/package/@g-loot/react-tournament-brackets)
- Existing notification infrastructure: `notificationDatabase.ts`

### Secondary (MEDIUM confidence)
- [Tournament prize pool distribution best practices](https://whatisesports.xyz/prize-pool-distribution/) - verified against poker/esports standards
- [Socket.io countdown timer patterns](https://robdodson.me/posts/building-a-countdown-timer-with-socket-dot-io/) - validated against existing LDS implementation

### Tertiary (LOW confidence)
- Prize distribution percentages - based on industry standards but may need tuning for this platform

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project patterns and well-maintained libraries
- Architecture: HIGH - Direct extension of existing manager patterns
- Pitfalls: MEDIUM - Some specific to new domain, but informed by existing implementations

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable domain, established patterns)
