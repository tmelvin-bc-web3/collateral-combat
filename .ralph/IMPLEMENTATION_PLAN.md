# Implementation Plan

> Tasks for Ralph to execute. One task per loop iteration.
> Format: `[ ]` pending | `[x]` done | `[!]` blocked

---

## Story 1: Oracle Backend Finalization (Critical)

### Tasks

- [x] **T200** Add database persistence for prediction bets
  - Save bets to database when placed (create prediction_bets table if needed)
  - Call `userStatsDb.recordWager()` when bet settled
  - Store round history with outcomes
  - Files: `backend/src/services/predictionService.ts`, `backend/src/db/userStatsDatabase.ts`
  - Verify: Bets persist across server restart
  - **Done:** Added `recordBetToDatabase()` method in predictionService.ts that calls `userStatsDb.recordWager()` when bets are settled

- [x] **T201** Add prediction bet history API endpoint
  - GET `/api/predictions/history/:wallet` - user's bet history (filtered to prediction type)
  - GET `/api/predictions/round/:roundId` - round details with all bets
  - Files: `backend/src/index.ts`, `backend/src/db/userStatsDatabase.ts`
  - Verify: Frontend can fetch historical bets
  - **Done:** Added both endpoints in index.ts, added `getWagersByRoundId()` function in userStatsDatabase.ts

---

## Story 2: Smart Contract Alignment (USE SOLANA MCP)

> All tasks in this story MUST use Solana MCP for building, testing, and deploying.

### Tasks

- [ ] **T210** Fix smart contract timing constants
  - Change: LOCK_PERIOD from 10s to 5s to match backend
  - Files: `prediction_program/programs/prediction_program/src/lib.rs`
  - Verify: On-chain round timing matches off-chain (25s betting, 5s locked)
  - REQUIRES: Solana MCP, deploy to devnet first

- [ ] **T211** Add early bird multiplier to smart contract
  - Store `bet_timestamp` in PlayerPosition PDA
  - Calculate early bird multiplier in claim_winnings (20% max, linear decay)
  - Formula: `multiplier = 1 + (0.20 * (1 - timeIntoRound/bettingDuration))`
  - Files: `prediction_program/programs/prediction_program/src/state.rs`, `lib.rs`
  - Verify: Early bets receive bonus payout on-chain
  - REQUIRES: Solana MCP

- [ ] **T212** Add round status enum for locked state
  - Change: RoundStatus from `{Open, Settled}` to `{Betting, Locked, Settled}`
  - Update crank instruction to transition through Locked state
  - Update place_bet to only allow bets during Betting status
  - Files: `prediction_program/programs/prediction_program/src/state.rs`, `lib.rs`
  - Verify: Frontend type mismatch resolved
  - REQUIRES: Solana MCP

---

## Story 3: Frontend Integration

### Tasks

- [x] **T220** Fix frontend type definitions for round status
  - Update RoundStatus type to match contract (Betting/Locked/Settled)
  - Update status mapping and display logic
  - Files: `web/src/lib/prediction/types.ts`, `web/src/hooks/usePrediction.ts`
  - Verify: No TypeScript errors, correct status shown in UI
  - **Done:** Changed `Open` to `Betting` in RoundStatus enum, updated parseRound to use `betting` instead of `open`

- [ ] **T221** Add claim winnings UI flow
  - Add "Claim Winnings" button when user has unclaimed on-chain wins
  - Add loading state during claim transaction
  - Add success/error toasts after claim
  - Files: `web/src/app/predict/page.tsx`, `web/src/hooks/usePrediction.ts`
  - Verify: User can claim on-chain wins through UI
  - NOTE: Do NOT modify Oracle UI layout - only add claim button

- [ ] **T222** Replace mock Live Bets with real data
  - Change mock `liveBets` array to real socket stream
  - Subscribe to `bet_placed` socket event from backend
  - Show actual bets as they come in (last 10)
  - Files: `web/src/app/predict/page.tsx`
  - Verify: Live bets sidebar shows real activity

- [x] **T223** Remove dead code from prediction client
  - Delete: `initializeRound()` method - not a real contract instruction
  - Delete: `lockRound()` method - not a real contract instruction
  - Delete: `settleRound()` method - not a real contract instruction
  - Files: `web/src/lib/prediction/client.ts`
  - Verify: No dead code remains
  - **Done:** Removed all three dead methods and unused `priceToScaled` import

---

## Story 4: UX Enhancements

### Tasks

- [ ] **T100** Leaderboard weekly/monthly/all-time tabs
  - Add tabs for weekly, monthly, all-time periods
  - Data updates correctly per tab, current tab highlighted
  - Files: `web/src/app/leaderboard/page.tsx`, `backend/src/services/progressionService.ts`

- [ ] **T101** Leaderboard pagination and search
  - Paginate results (25 per page)
  - Search by username/wallet
  - Smooth transitions
  - Files: `web/src/app/leaderboard/page.tsx`

- [ ] **T102** User profile page - basic structure
  - New `/profile/[wallet]` route
  - Shows username, level, XP, rank, avatar
  - Files: `web/src/app/profile/[wallet]/page.tsx`

- [ ] **T103** User profile page - betting history
  - Shows last 50 bets with outcome, amount, date
  - Win/loss record
  - Files: `web/src/app/profile/[wallet]/page.tsx`, `backend/src/routes/profile.ts`

- [ ] **T104** User profile page - stats and achievements
  - Win rate, total wagered, biggest win, streak records
  - Unlocked perks display
  - Files: `web/src/app/profile/[wallet]/page.tsx`

---

## Story 5: Mobile Responsiveness

> CONSTRAINT: Mobile changes must NOT alter desktop layout. Use responsive breakpoints only.

### Tasks

- [ ] **T110** Oracle page mobile layout
  - Fully usable at 375px width
  - Buttons large enough to tap, chart readable
  - No horizontal scroll
  - Files: `web/src/app/predict/page.tsx`
  - NOTE: Only add responsive classes, do NOT change desktop layout

- [ ] **T111** Global mobile navigation improvements
  - Hamburger menu smooth, touch targets 44px+
  - Proper spacing on small screens
  - Files: `web/src/components/Header/*.tsx`, `web/src/app/globals.css`

- [ ] **T112** Touch interactions and gestures
  - Swipe gestures where appropriate
  - No hover-only interactions
  - Tap feedback on all buttons
  - Files: `web/src/app/**/*.tsx`, `web/src/components/**/*.tsx`

---

## Story 6: Sound & Feedback

### Tasks

- [ ] **T120** Sound effects system setup
  - Create `useSound` hook, sounds preloaded
  - Volume control, mute toggle persists
  - Files: `web/src/hooks/useSound.ts`, `web/src/contexts/SoundContext.tsx`

- [ ] **T121** Betting sound effects
  - Sounds for: bet placed, countdown tick (last 5s), round lock, win, loss
  - Files: `web/src/app/predict/page.tsx`, `web/public/sounds/`

- [ ] **T122** UI feedback sounds
  - Subtle sounds for: button clicks, level up, achievement unlock, error
  - Files: `web/src/components/**/*.tsx`, `web/public/sounds/`

- [ ] **T123** Haptic feedback for mobile
  - Vibration on bet placed, win/loss
  - Uses `navigator.vibrate` API, respects user preference
  - Files: `web/src/hooks/useHaptic.ts`, `web/src/app/predict/page.tsx`

---

## Story 7: Testing

### Tasks

- [ ] **T230** Integration test suite for Oracle
  - Test bet placement and database persistence
  - Test round lifecycle (betting → locked → settled)
  - Test payout calculation with early bird multiplier
  - Test on-chain/off-chain mode switching
  - Files: `backend/tests/prediction.test.ts`, `web/src/__tests__/predict.test.ts`
  - Verify: All critical paths covered, tests pass

---

## Notes

- Oracle UI is LOCKED - do not modify visual layout without human approval
- Smart contract tasks require Solana MCP
- Always run tests after implementation
- Commit working changes with descriptive messages
