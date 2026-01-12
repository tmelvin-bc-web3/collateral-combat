# Sol Battles - Frontend PRD

## Constraints
- **Oracle UI is LOCKED** - Do not modify visual layout without human approval
- **Mobile changes** must NOT alter desktop layout - use responsive breakpoints only
- Only modify files in `web/src/` directory

---

## Stories

### [ ] US-003: Frontend Types and Client
Fix type definitions and clean up prediction client.

**Tasks:**
- T220: Update RoundStatus type to match contract (Betting/Locked/Settled)
- T223: Remove dead code from client.ts (initializeRound, lockRound, settleRound methods)

**Files:** web/src/lib/prediction/types.ts, web/src/hooks/usePrediction.ts, web/src/lib/prediction/client.ts

**Verify:** No TypeScript errors, no dead code

---

### [ ] US-004: Frontend UI Integration
Add claim UI, replace mock data.

**Tasks:**
- T221: Add "Claim Winnings" button for unclaimed on-chain wins
- T222: Replace mock liveBets with real socket stream (subscribe to bet_placed event)

**Files:** web/src/app/predict/page.tsx

**Verify:** Users can claim wins, live bets shows real activity

---

### [ ] US-005: Leaderboard Enhancements
Add time period tabs, pagination, and search.

**Tasks:**
- T100: Add weekly/monthly/all-time tabs
- T101: Paginate results (25 per page), add search by username/wallet

**Files:** web/src/app/leaderboard/page.tsx

**Verify:** Tabs switch data correctly, pagination works, search finds users

---

### [ ] US-006: User Profile Page
Create user profile page with stats, history, and achievements.

**Tasks:**
- T102: New /profile/[wallet] route with username, level, XP, rank, avatar
- T103: Show last 50 bets with outcome, amount, date
- T104: Display win rate, total wagered, biggest win, streak records

**Files:** web/src/app/profile/[wallet]/page.tsx

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
