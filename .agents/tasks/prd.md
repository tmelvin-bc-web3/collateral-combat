# Sol Battles - Product Requirements Document

## Overview

Sol Battles (DegenDome) is a Solana-based prediction gaming platform where users bet on cryptocurrency price movements. The core game mode is "Oracle" - a 30-second prediction game where users bet Long or Short on SOL price.

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Blockchain**: Solana, Anchor framework
- **Database**: JSON file-based (profiles.json), SQLite for stats

## Constraints

- **Oracle UI is LOCKED** - Do not modify visual layout without human approval
- **Mobile changes** must NOT alter desktop layout - use responsive breakpoints only
- **Smart contract tasks** require Solana MCP for building/testing/deploying

---

## Stories

### [x] US-001: Backend Persistence
Add database persistence for prediction bets and history API endpoints.

**Tasks:**
- [x] T200: Save bets to database when placed, call userStatsDb.recordWager()
- [x] T201: Add GET /api/predictions/history/:wallet and /api/predictions/round/:roundId

**Files:** backend/src/services/predictionService.ts, backend/src/db/userStatsDatabase.ts, backend/src/index.ts

**Verify:** Bets persist across server restart, frontend can fetch historical bets - ✅ VERIFIED

---

### [ ] US-002: Smart Contract Alignment
Fix timing, add early bird multiplier, and add locked status to smart contract.

**Requires:** Solana MCP

**Tasks:**
- T210: Change LOCK_PERIOD from 10s to 5s
- T211: Add bet_timestamp to PlayerPosition, calculate early bird multiplier in claim_winnings
- T212: Change RoundStatus from {Open, Settled} to {Betting, Locked, Settled}

**Files:** prediction_program/programs/prediction_program/src/lib.rs, state.rs

**Verify:** On-chain timing matches backend, early bets get bonus payout

---

### [ ] US-003: Frontend Types and Client
Fix type definitions and clean up prediction client.

**Tasks:**
- T220: Update RoundStatus type to match contract (Betting/Locked/Settled)
- T223: Remove dead code from client.ts (initializeRound, lockRound, settleRound)

**Files:** web/src/lib/prediction/types.ts, web/src/hooks/usePrediction.ts, web/src/lib/prediction/client.ts

**Verify:** No TypeScript errors, no dead code

---

### [ ] US-004: Frontend UI Integration
Add claim UI, replace mock data, improve UX.

**Tasks:**
- T221: Add "Claim Winnings" button for unclaimed on-chain wins
- T222: Replace mock liveBets with real socket stream

**Files:** web/src/app/predict/page.tsx

**Verify:** Users can claim wins, live bets shows real activity

---

### [ ] US-005: Leaderboard Enhancements
Add time period tabs, pagination, and search.

**Tasks:**
- T100: Add weekly/monthly/all-time tabs
- T101: Paginate results (25 per page), add search by username/wallet

**Files:** web/src/app/leaderboard/page.tsx, backend/src/services/progressionService.ts

**Verify:** Tabs switch data correctly, pagination works, search finds users

---

### [ ] US-006: User Profile Page
Create user profile page with stats, history, and achievements.

**Tasks:**
- T102: New /profile/[wallet] route with username, level, XP, rank, avatar
- T103: Show last 50 bets with outcome, amount, date
- T104: Display win rate, total wagered, biggest win, streak records

**Files:** web/src/app/profile/[wallet]/page.tsx, backend/src/routes/profile.ts

**Verify:** Profile loads for any wallet, shows correct stats

---

### [ ] US-007: Mobile Responsiveness
Improve mobile layouts without altering desktop.

**Constraint:** Only add responsive breakpoint classes (sm:, md:, lg:)

**Tasks:**
- T110: Oracle page mobile layout (375px width, large tap targets)
- T111: Mobile navigation (hamburger menu, 44px+ touch targets)
- T112: Touch interactions (no hover-only, tap feedback)

**Files:** web/src/app/predict/page.tsx, web/src/components/Header/*.tsx

**Verify:** Fully usable at 375px, desktop unchanged

---

### [ ] US-008: Sound and Haptic Feedback
Add sound effects and haptic feedback.

**Tasks:**
- T120: Create useSound hook with volume control and mute toggle
- T121: Betting sounds (bet placed, countdown tick, lock, win, loss)
- T122: UI sounds (button clicks, level up, achievement)
- T123: Haptic feedback via navigator.vibrate

**Files:** web/src/hooks/useSound.ts, web/src/contexts/SoundContext.tsx, web/src/hooks/useHaptic.ts

**Verify:** Sounds play correctly, haptics work on mobile

---

### [ ] US-009: Integration Testing
Add comprehensive test suite for Oracle.

**Tasks:**
- T230: Test bet placement, round lifecycle, payout calculation, on-chain/off-chain modes

**Files:** backend/tests/prediction.test.ts, web/src/__tests__/predict.test.ts

**Verify:** All critical paths covered, tests pass
