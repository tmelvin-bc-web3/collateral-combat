---
phase: 14
plan: 06
subsystem: events-competitions
tags: [tournament, leaderboard, rankings, sqlite, react]
requires: [14-04]
provides: [tournament-leaderboard, player-stats-api]
affects: []
tech-stack:
  added: []
  patterns: [aggregated-stats-table, upsert-pattern]
key-files:
  created:
    - web/src/components/tournament/TournamentLeaderboard.tsx
    - web/src/app/tournaments/leaderboard/page.tsx
    - web/src/hooks/useTournamentLeaderboard.ts
  modified:
    - backend/src/db/tournamentDatabase.ts
    - backend/src/services/tournamentManager.ts
    - backend/src/index.ts
decisions:
  - decision: Leaderboard uses UPSERT pattern for incremental stat updates
    rationale: Allows atomic updates of multiple stats per player after each tournament
  - decision: Sorting by earnings default, wins optional
    rationale: Earnings reflects overall tournament success, wins is secondary metric
metrics:
  duration: ~4 minutes
  completed: 2026-01-24
---

# Phase 14 Plan 06: Tournament Leaderboard Summary

Tournament leaderboard with aggregated stats across all tournaments, sortable by earnings or wins, with player stats card for connected wallet.

## What Was Built

### Backend

1. **Leaderboard Schema** (`tournamentDatabase.ts`)
   - `tournament_leaderboard` table with aggregated stats per wallet
   - Indexes on `total_earnings_lamports` and `tournaments_won` for fast sorting
   - UPSERT pattern for incrementing stats after each tournament

2. **Leaderboard Functions**
   - `getLeaderboard(limit, offset, sortBy)` - fetch top players by earnings or wins
   - `getPlayerTournamentStats(wallet)` - get individual player's tournament history
   - `updateLeaderboardEntry(...)` - increment stats after tournament completion
   - `getLeaderboardCount()` - total players for pagination

3. **Tournament Manager Update**
   - `completeTournament()` now updates leaderboard for each participant
   - Tracks: tournaments entered, tournaments won, matches played, matches won, earnings, best finish

4. **API Endpoints**
   - `GET /api/tournaments/leaderboard?sort=earnings|wins&limit=50&offset=0`
   - `GET /api/tournaments/stats/:wallet`

### Frontend

1. **Hook** (`useTournamentLeaderboard.ts`)
   - `useTournamentLeaderboard(sortBy)` - fetches and caches leaderboard data
   - `usePlayerTournamentStats(wallet)` - fetches individual player stats

2. **Component** (`TournamentLeaderboard.tsx`)
   - Sort tabs: By Earnings / By Wins
   - Table columns: Rank, Fighter, Tournaments, Wins, Win Rate, Earnings
   - Highlights connected wallet's row
   - Rank badges for top 3 positions

3. **Page** (`/tournaments/leaderboard/page.tsx`)
   - Header with back link to tournaments list
   - Personal stats card (when connected with tournament history)
   - Loading and error states
   - Empty state with CTA to view upcoming tournaments

## Commits

| Hash | Message |
|------|---------|
| 6450302 | feat(14-06): add tournament leaderboard schema and queries |
| 4d4c344 | feat(14-06): update tournament manager for leaderboard updates |
| 734ff72 | feat(14-06): create tournament leaderboard UI |

## Verification

- [x] Backend compiles: `cd backend && npx tsc --noEmit`
- [x] Frontend builds: `cd web && pnpm build`
- [x] `getLeaderboard` exists in tournamentDatabase.ts
- [x] `TournamentLeaderboard` exported from component
- [x] Leaderboard page at /tournaments/leaderboard (119 lines)
- [x] Hook consumption pattern: `useTournamentLeaderboard()`

## Deviations from Plan

None - plan executed exactly as written.

## Key Patterns

### Leaderboard UPSERT Pattern
```sql
INSERT INTO tournament_leaderboard (...) VALUES (...)
ON CONFLICT(wallet_address) DO UPDATE SET
  tournaments_entered = tournaments_entered + excluded.tournaments_entered,
  tournaments_won = tournaments_won + excluded.tournaments_won,
  ...
```

### Stats Aggregation on Tournament Complete
```typescript
// After each tournament completes, update all participants
for (const { place, wallet } of standings) {
  db.updateLeaderboardEntry(
    wallet,
    1,                    // tournaments entered
    place === 1 ? 1 : 0,  // tournaments won
    playerMatches.length, // matches played
    matchesWon,           // matches won
    payout,               // earnings
    place                 // finish position
  );
}
```

## Next Steps

- Plan 14-05: Event Notification Enhancements (pending)
- Consider adding player profiles link from leaderboard rows
- Add pagination controls when leaderboard grows

---
*Completed: 2026-01-24*
