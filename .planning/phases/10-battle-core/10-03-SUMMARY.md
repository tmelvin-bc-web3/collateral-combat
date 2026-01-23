---
phase: 10-battle-core
plan: 03
subsystem: battle-history
tags: [sqlite, persistence, api, tie-handling]
dependency-graph:
  requires: ["10-01", "10-02"]
  provides: ["battle-history-persistence", "battle-stats-api", "tie-handling"]
  affects: ["11-profiles", "12-leaderboards"]
tech-stack:
  added: []
  patterns: ["repository-pattern", "player-centric-queries"]
key-files:
  created:
    - backend/src/db/battleHistoryDatabase.ts
  modified:
    - backend/src/services/battleManager.ts
    - backend/src/index.ts
decisions:
  - id: tie-threshold
    choice: "< 0.01% PnL difference"
    rationale: "Prevents micro-differences from determining winner unfairly"
  - id: tie-payout
    choice: "Refund entry fee"
    rationale: "Fair to both players, no rake taken on ties"
  - id: history-storage
    choice: "Separate SQLite database"
    rationale: "Follows existing pattern (progressionDatabase), isolated concerns"
metrics:
  duration: "~6 minutes"
  completed: "2026-01-23"
---

# Phase 10 Plan 03: Battle History Database Summary

Battle history persistence with tie handling and API endpoints for fighter profiles and statistics.

## One-liner

SQLite battle history with tie detection (< 0.01% PnL), refund payouts, and REST API for player stats.

## What Was Built

### 1. Battle History Database (Task 1)

Created `backend/src/db/battleHistoryDatabase.ts` with:

- **BattleHistoryRecord** - Full battle record with both players, winner, PnL, entry fee, duration
- **PlayerBattleHistory** - Player-centric view with opponent, result, payout
- **PlayerBattleStats** - Aggregated wins/losses/ties/winRate

Key functions:
- `saveBattleResult()` - Persist battle after completion
- `getBattleHistory(wallet, limit)` - Get player's battle history
- `getBattleById(battleId)` - Get specific battle record
- `getPlayerStats(wallet)` - Get aggregated statistics

Database schema with indexes on player wallets and end time for efficient queries.

### 2. Tie Handling in Battle Manager (Task 2)

Modified `backend/src/services/battleManager.ts` to:

- **Detect ties**: `Math.abs(player1Pnl - player2Pnl) < 0.01` (less than 0.01% difference)
- **Handle tie payouts**: Both players get entry fee refunded (no rake taken)
- **Record tie outcome**: `push` outcome in userStatsDb, `isTie: true` in history
- **Update chat messages**: "Battle ended in a TIE! Both players refunded."
- **Save history**: Every 1v1 battle is persisted to battleHistoryDatabase

### 3. Battle History API Endpoints (Task 3)

Added to `backend/src/index.ts`:

```
GET /api/battles/history/:wallet?limit=20
  Returns: { history: PlayerBattleHistory[] }

GET /api/battles/stats/:wallet
  Returns: { totalBattles, wins, losses, ties, winRate }

GET /api/battles/record/:battleId
  Returns: { record: BattleHistoryRecord }
```

Routes placed before generic `:id` route for correct Express matching.

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tie threshold | < 0.01% | Prevents micro-differences from determining winner |
| Tie payout | Refund entry fee | Fair to both, no platform rake on ties |
| Storage | Separate SQLite DB | Follows progressionDatabase pattern |
| Stats aggregation | Query-time | Simple, accurate, no cache invalidation |

## Files Changed

| File | Change |
|------|--------|
| `backend/src/db/battleHistoryDatabase.ts` | Created - Full battle history persistence layer |
| `backend/src/services/battleManager.ts` | Modified - Tie detection, history persistence, refund logic |
| `backend/src/index.ts` | Modified - Three new API endpoints |

## Commits

| Hash | Description |
|------|-------------|
| 66aa666 | Create battle history database with SQLite schema |
| 8d0d071 | Add tie handling and history persistence to battleManager |
| f15a769 | Add battle history API endpoints |

## Verification

- [x] `npm run build` passes
- [x] battleHistoryDatabase.ts exports saveBattleResult, getBattleHistory, getBattleById, getPlayerStats
- [x] Tie detection threshold is 0.01% PnL difference
- [x] API endpoints ordered correctly (before :id route)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Battle history is now persisted and queryable. Ready for:
- **Phase 11**: Fighter profiles can display battle history and stats
- **Phase 12**: Leaderboards can incorporate win rates and battle counts
