# Sol Battles - Parallel PRD

## Overview
Sol Battles (DegenDome) is a Solana-based prediction gaming platform. This PRD is structured for parallel worker execution with scope-based task assignment.

## Worker Scopes
- **backend**: backend/ directory
- **frontend-lib**: web/src/lib, web/src/hooks, web/src/contexts
- **frontend-ui**: web/src/app, web/src/components
- **contracts**: prediction_program/ directory

---

## Stories

### [x] US-001: Backend Persistence
Add database persistence for prediction bets and history API endpoints.
@scope: backend/
@worker: backend

**Tasks:**
- [x] T200: Save bets to database when placed
- [x] T201: Add GET /api/predictions/history/:wallet and /api/predictions/round/:roundId

**Files:** backend/src/services/predictionService.ts, backend/src/db/userStatsDatabase.ts

---

### [x] US-002: Smart Contract Alignment
SKIPPED - Requires Solana MCP.
@scope: prediction_program/
@worker: contracts

---

### [ ] US-003: Frontend Types and Client
Fix type definitions and clean up prediction client.
@scope: web/src/lib
@worker: frontend-lib

**Tasks:**
- [ ] T220: Update RoundStatus type to match contract (Betting/Locked/Settled)
- [ ] T223: Remove dead code from client.ts (initializeRound, lockRound, settleRound)

**Files:** web/src/lib/prediction/types.ts, web/src/lib/prediction/client.ts

---

### [ ] US-004: Frontend UI Integration
Add claim UI, replace mock data, improve UX.
@scope: web/src/app
@worker: frontend-ui

**Tasks:**
- [ ] T221: Add "Claim Winnings" button for unclaimed on-chain wins
- [ ] T222: Replace mock liveBets with real socket stream

**Files:** web/src/app/predict/page.tsx

---

### [ ] US-005: Leaderboard Enhancements
Add time period tabs, pagination, and search.
@scope: web/src/app
@worker: frontend-ui

**Tasks:**
- [ ] T100: Add weekly/monthly/all-time tabs
- [ ] T101: Paginate results (25 per page), add search by username/wallet

**Files:** web/src/app/leaderboard/page.tsx

---

### [ ] US-006: User Profile Page
Create user profile page with stats, history, and achievements.
@scope: web/src/app
@worker: frontend-ui

**Tasks:**
- [ ] T102: New /profile/[wallet] route with username, level, XP, rank, avatar
- [ ] T103: Show last 50 bets with outcome, amount, date
- [ ] T104: Display win rate, total wagered, biggest win, streak records

**Files:** web/src/app/profile/[wallet]/page.tsx

---

### [ ] US-007: Mobile Responsiveness
Improve mobile layouts without altering desktop.
@scope: web/src/app|web/src/components
@worker: frontend-ui

**Tasks:**
- [ ] T110: Oracle page mobile layout (375px width, large tap targets)
- [ ] T111: Mobile navigation (hamburger menu, 44px+ touch targets)
- [ ] T112: Touch interactions (no hover-only, tap feedback)

**Files:** web/src/app/predict/page.tsx, web/src/components/Header/*.tsx

---

### [ ] US-008: Sound and Haptic Feedback
Add sound effects and haptic feedback.
@scope: web/src/hooks|web/src/contexts
@worker: frontend-lib

**Tasks:**
- [ ] T120: Create useSound hook with volume control and mute toggle
- [ ] T121: Betting sounds (bet placed, countdown tick, lock, win, loss)
- [ ] T122: UI sounds (button clicks, level up, achievement)
- [ ] T123: Haptic feedback via navigator.vibrate

**Files:** web/src/hooks/useSound.ts, web/src/contexts/SoundContext.tsx, web/src/hooks/useHaptic.ts

---

### [ ] US-009: Integration Testing
Add comprehensive test suite for Oracle.
@scope: backend/|web/src/
@worker: any

**Tasks:**
- [ ] T230: Test bet placement, round lifecycle, payout calculation

**Files:** backend/tests/prediction.test.ts, web/src/__tests__/predict.test.ts

---
