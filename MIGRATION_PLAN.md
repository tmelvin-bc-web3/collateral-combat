# Migration Plan

> Canonical task backlog. Manager reads this file to dispatch work.
>
> States: `[ ]` unclaimed | `[@wN]` claimed by worker N | `[x]` done | `[!]` failed

---

## P0 - Critical (Security Audit)

- [x] T001 Scan codebase for exposed API keys and secrets
  - Scope: entire repo
  - Verify: no matches for API_KEY, SECRET, PRIVATE_KEY patterns
  - Files: all .ts, .tsx, .js, .json, .env*

- [x] T002 Audit public endpoints for auth requirements
  - Scope: backend/src/routes/
  - Verify: all non-public routes have auth middleware
  - Files: backend/src/routes/*.ts, backend/src/middleware/auth.ts

- [x] T003 Check frontend for hardcoded sensitive data
  - Scope: web/src/
  - Verify: no hardcoded URLs, keys, or credentials
  - Files: web/src/**/*.ts, web/src/**/*.tsx

- [x] T004 Verify .env handling and gitignore
  - Scope: root, backend, web
  - Verify: .env* in .gitignore, no secrets in git history
  - Files: .gitignore, backend/.gitignore, web/.gitignore

- [x] T005 Review CORS and origin restrictions
  - Scope: backend/src/
  - Verify: CORS whitelist is restrictive, not wildcard
  - Files: backend/src/index.ts, backend/src/config.ts

---

## P1 - High Priority (Mobile & Polish)

- [x] T010 Progression page mobile layout
  - Scope: web/src/app/progression/
  - Verify: responsive at 375px, 768px breakpoints
  - Files: web/src/app/progression/page.tsx

- [x] T011 Leaderboard page mobile layout
  - Scope: web/src/app/leaderboard/
  - Verify: responsive at 375px, 768px breakpoints
  - Files: web/src/app/leaderboard/page.tsx

- [x] T012 Header mobile menu implementation
  - Scope: web/src/components/Header/
  - Verify: hamburger menu works, closes on navigation
  - Files: web/src/components/Header/*.tsx

- [x] T013 Consistent card styling across pages
  - Scope: web/src/components/
  - Verify: all cards use shared Card component
  - Files: web/src/components/ui/Card.tsx, web/src/components/**/*.tsx

---

## P1.5 - Oracle UX Overhaul (High Priority)

> ⚠️ **LOCKED** - Do not modify Oracle UI without explicit human approval. All tasks complete.

> Core principle: Preserve existing color palette (orange/green/dark), fonts, layout structure.
> Improve: visual hierarchy, decision clarity, urgency, micro-interactions.

- [x] T040 Oracle countdown timer enhancement
  - Scope: web/src/app/predict/
  - Verify: countdown 25-30% larger, pulsing orange glow (0.4→0.8 opacity, 1s ease-in-out), positioned prominently near/on chart
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T041 Oracle chart line improvements
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: line stroke +1px thicker, gradient fill under line (green, 5-8% opacity fading to transparent)
  - Files: web/src/components/RealtimeChart.tsx

- [x] T042 Oracle lock price line styling
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: lock price line is dashed, brighter than grid, has label "LOCK $XXX.XX"
  - Files: web/src/components/RealtimeChart.tsx

- [x] T043 Oracle last tick direction indicator
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: arrow at right edge of chart (↑ green if positive, ↓ red if negative)
  - Files: web/src/components/RealtimeChart.tsx

- [x] T044 Oracle Long/Short button redesign
  - Scope: web/src/app/predict/
  - Verify: buttons 15-20% taller, show "LONG ↑ Win: X.XX SOL" format, hover glow + arrow nudge (±2px), click flash + scale(0.98→1)
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T045 Oracle bet amount selector improvements
  - Scope: web/src/app/predict/
  - Verify: selected state has bright outline + glow + pressed appearance, win values update immediately, optional MAX button
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T046 Oracle recent history row polish
  - Scope: web/src/app/predict/
  - Verify: older ticks fade progressively (left→right), spacing every 5 ticks, hover tooltip shows % change
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T047 Oracle right column de-emphasis
  - Scope: web/src/app/predict/
  - Verify: "This Round" and pool stats have reduced contrast, smaller font, never compete with Long/Short buttons
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T048 Oracle copy/text clarity updates
  - Scope: web/src/app/predict/
  - Verify: "PLACE YOUR WAGER" → "LOCK YOUR BET", add subtext "Final price after 30s decides the outcome."
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T049 Oracle motion and feedback polish
  - Scope: web/src/app/predict/
  - Verify: price updates animate smoothly (120-180ms interpolation), round end dims screen + winner flash (300-400ms), respects prefers-reduced-motion
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T050 Oracle layout flow optimization
  - Scope: web/src/app/predict/
  - Verify: reduced right column padding, visual stack order is Chart → Countdown → Long/Short, clear see→decide→click flow
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

---

## P1.6 - Oracle Structural Reframe (High Priority)

> ⚠️ **LOCKED** - Do not modify Oracle UI without explicit human approval. All tasks complete.

> Mental model shift: "configure a trade" → "make a decision under pressure"
> User flow: See countdown → Choose direction → Confirm amount
> Constraints: No new features, no color/font changes, rearrangement + emphasis only

- [x] T060 Oracle layout restructure - reorder to Chart→Buttons→Amount
  - Scope: web/src/app/predict/
  - Verify: layout order is (1) Chart+Countdown (2) Long/Short buttons (3) Bet amount selector, right column minimized
  - Files: web/src/app/predict/page.tsx

- [x] T061 Oracle countdown overlay inside chart
  - Scope: web/src/app/predict/, web/src/components/RealtimeChart.tsx
  - Verify: countdown floats inside chart container (top-center or top-right), no box/card, ~2x font size, 80% opacity, orange glow, text "Final price decides." below number
  - Files: web/src/app/predict/page.tsx, web/src/components/RealtimeChart.tsx

- [x] T062 Oracle Long/Short buttons bet-to-win format
  - Scope: web/src/app/predict/
  - Verify: buttons show "LONG ↑ / 0.1 SOL → Win 0.2 SOL" format, win value updates instantly when bet amount changes, buttons are visually dominant (primary CTA)
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T063 Oracle hover commitment effect
  - Scope: web/src/app/predict/
  - Verify: hovering Long/Short dims entire UI to ~70% opacity EXCEPT the hovered button, creates psychological commitment moment, CSS-only preferred, respects prefers-reduced-motion
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T064 Oracle right column pre/post-bet states
  - Scope: web/src/app/predict/
  - Verify: pre-bet shows minimal info (hide pool size, long/short counts), post-bet expands to show full stats, clean state transition
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T065 Oracle chart height reduction
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: chart height reduced ~15%, maintains readability, provides momentum context not analysis detail
  - Files: web/src/components/RealtimeChart.tsx

- [x] T066 Oracle copy refinements
  - Scope: web/src/app/predict/
  - Verify: remove "PLACE YOUR WAGER" / "LOCK YOUR BET", keep taglines "Predict or perish." and "30 seconds. No second chances.", countdown shows "Final price decides."
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T067 Oracle bet amount de-emphasis
  - Scope: web/src/app/predict/
  - Verify: bet amount selector below Long/Short buttons, reduced glow/contrast, smaller container, feels secondary to direction choice
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

---

## P2 - Medium Priority (UX Improvements)

- [x] T014 Oracle chart polish and animations
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: smooth bezier curves, cleaner colors, no jank
  - Files: web/src/components/RealtimeChart.tsx

- [x] T020 Micro-interactions and hover feedback
  - Scope: web/src/components/
  - Verify: buttons have hover states, transitions smooth
  - Files: web/src/components/ui/*.tsx

- [x] T021 Toast notification system
  - Scope: web/src/
  - Verify: toast shows on success/error actions
  - Files: web/src/components/Toast.tsx, web/src/contexts/ToastContext.tsx

- [x] T022 Skeleton loaders for data fetches
  - Scope: web/src/components/
  - Verify: skeleton shows during loading states
  - Files: web/src/components/ui/Skeleton.tsx

---

## P3 - Nice to Have

- [x] T030 Dark/light theme toggle
  - Scope: web/src/
  - Verify: theme persists, all components respect theme
  - Files: web/src/contexts/ThemeContext.tsx, web/tailwind.config.ts

- [x] T031 Sound effects for wins/losses
  - Scope: web/src/hooks/
  - Verify: sounds play, can be muted
  - Files: web/src/hooks/useSound.ts, web/public/sounds/

- [x] T032 Confetti animation on level up
  - Scope: web/src/components/
  - Verify: confetti triggers on level milestone
  - Files: web/src/components/Confetti.tsx

---

## P0.5 - Oracle Corrective Pass (CRITICAL - REMOVAL FOCUSED)

> ⚠️ **LOCKED** - Do not modify Oracle UI without explicit human approval. All tasks complete.

> **CORE RULE**: ONE dominant focal point. If it duplicates info, DELETE it.
> **PRODUCT TRUTH**: This is not a trading interface. It is a timed decision trap.
> **WORKER MANDATE**: REMOVE elements, do NOT add. Strip everything non-essential.
> This UI should feel DANGEROUS, not helpful. Withhold information. Force instinct.

- [x] T070 Oracle remove duplicate countdowns - DELETION TASK
  - Scope: web/src/app/predict/, web/src/components/
  - Verify: ONLY ONE countdown exists (inside chart, top-right), NO card/background/label - just number, optional "Final price decides." below, DELETE all other countdown displays
  - Files: web/src/app/predict/page.tsx, web/src/components/RealtimeChart.tsx

- [x] T071 Oracle delete narrative UI blocks - DELETION TASK
  - Scope: web/src/app/predict/
  - Verify: DELETE "READY TO BET" box, DELETE "RULES OF THE ORACLE" box, DELETE any explanatory panels during betting - these kill tension
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T072 Oracle strip chart to bare essentials - DELETION TASK
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: chart shows ONLY price line + lock price + current price, DELETE all banners/status text/captions, chart must feel QUIET
  - Files: web/src/components/RealtimeChart.tsx

- [x] T073 Oracle single price consolidation - DELETION TASK
  - Scope: web/src/app/predict/
  - Verify: ONE price display only ("$142.52" with optional "SOL/USD" above), DELETE all duplicate price readouts, DELETE "from $X" helper text
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T074 Oracle Long/Short strict 3-line format
  - Scope: web/src/app/predict/
  - Verify: buttons show EXACTLY: line1="↑ LONG" line2="0.1 SOL → Win 0.20 SOL" line3="2.00× odds", tall buttons, strong glow, NO surrounding explanation text
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T075 Oracle remove duplicate win displays - DELETION TASK
  - Scope: web/src/app/predict/
  - Verify: win amount ONLY inside Long/Short buttons, DELETE standalone "Potential Return" card, DELETE any other win amount displays
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T076 Oracle remove or gut right column - DELETION TASK
  - Scope: web/src/app/predict/
  - Verify: right column REMOVED or shows ONLY wallet balance + bet amount, DELETE pools/counts/rules during betting phase
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T077 Oracle strip all instructional copy - DELETION TASK
  - Scope: web/src/app/predict/
  - Verify: KEEP ONLY "Predict or perish." + "30 seconds. No second chances.", DELETE "Ready to bet"/"Betting open"/any instructional prose
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [x] T078 Oracle fix countdown positioning - must not obscure chart
  - Scope: web/src/app/predict/, web/src/components/RealtimeChart.tsx
  - Verify: countdown positioned so it does NOT overlap/obscure price line or chart data, place OUTSIDE chart or in corner that doesn't block info, countdown smaller than price display
  - Files: web/src/app/predict/page.tsx, web/src/components/RealtimeChart.tsx

---

## P2.5 - UX Enhancements (Medium Priority)

- [ ] T100 Leaderboard weekly/monthly/all-time tabs
  - Scope: web/src/app/leaderboard/
  - Verify: tabs for weekly, monthly, all-time periods, data updates correctly per tab, current tab highlighted
  - Files: web/src/app/leaderboard/page.tsx, backend/src/services/progressionService.ts

- [ ] T101 Leaderboard pagination and search
  - Scope: web/src/app/leaderboard/
  - Verify: paginate results (25 per page), search by username/wallet, smooth transitions
  - Files: web/src/app/leaderboard/page.tsx

- [ ] T102 User profile page - basic structure
  - Scope: web/src/app/profile/
  - Verify: new /profile/[wallet] route, shows username, level, XP, rank, avatar
  - Files: web/src/app/profile/[wallet]/page.tsx

- [ ] T103 User profile page - betting history
  - Scope: web/src/app/profile/
  - Verify: shows last 50 bets with outcome, amount, date, win/loss record
  - Files: web/src/app/profile/[wallet]/page.tsx, backend/src/routes/profile.ts

- [ ] T104 User profile page - stats and achievements
  - Scope: web/src/app/profile/
  - Verify: win rate, total wagered, biggest win, streak records, unlocked perks
  - Files: web/src/app/profile/[wallet]/page.tsx

---

## P2.6 - Mobile Responsiveness (Medium Priority)

> ⚠️ **CONSTRAINT**: Mobile changes must NOT alter desktop layout. Use responsive breakpoints (sm:, md:, lg:) only. Test both mobile AND desktop before marking complete.

- [ ] T110 Oracle page mobile layout
  - Scope: web/src/app/predict/
  - Verify: fully usable at 375px width, buttons large enough to tap, chart readable, no horizontal scroll
  - Files: web/src/app/predict/page.tsx

- [ ] T111 Global mobile navigation improvements
  - Scope: web/src/components/
  - Verify: hamburger menu smooth, touch targets 44px+, proper spacing on small screens
  - Files: web/src/components/Header/*.tsx, web/src/app/globals.css

- [ ] T112 Touch interactions and gestures
  - Scope: web/src/
  - Verify: swipe gestures where appropriate, no hover-only interactions, tap feedback on all buttons
  - Files: web/src/app/**/*.tsx, web/src/components/**/*.tsx

---

## P2.7 - Sound & Feedback (Medium Priority)

- [ ] T120 Sound effects system setup
  - Scope: web/src/hooks/, web/public/sounds/
  - Verify: useSound hook created, sounds preloaded, volume control, mute toggle persists
  - Files: web/src/hooks/useSound.ts, web/src/contexts/SoundContext.tsx

- [ ] T121 Betting sound effects
  - Scope: web/src/app/predict/
  - Verify: sounds for bet placed, countdown tick (last 5s), round lock, win, loss
  - Files: web/src/app/predict/page.tsx, web/public/sounds/

- [ ] T122 UI feedback sounds
  - Scope: web/src/
  - Verify: subtle sounds for button clicks, level up, achievement unlock, error
  - Files: web/src/components/**/*.tsx, web/public/sounds/

- [ ] T123 Haptic feedback for mobile
  - Scope: web/src/hooks/
  - Verify: vibration on bet placed, win/loss, uses navigator.vibrate API, respects user preference
  - Files: web/src/hooks/useHaptic.ts, web/src/app/predict/page.tsx

---

## P1 - Oracle Finalization (Critical)

> These tasks complete the Oracle feature by ensuring backend, smart contracts, and frontend work together.

### Backend Persistence

- [ ] T200 Add database persistence for prediction bets
  - Scope: backend/src/services/predictionService.ts, backend/src/database/
  - Add: Save bets to database when placed (create prediction_bets table if needed)
  - Add: Call userStatsDb.recordWager() when bet placed
  - Add: Store round history with outcomes
  - Verify: Bets persist across server restart, stats tracked
  - Files: backend/src/services/predictionService.ts, backend/src/database/userStats.ts

- [ ] T201 Add prediction bet history API endpoint
  - Scope: backend/src/routes/
  - Add: GET /api/predictions/history/:wallet - user's bet history
  - Add: GET /api/predictions/round/:roundId - round details with all bets
  - Verify: Frontend can fetch historical bets
  - Files: backend/src/routes/predictions.ts (create if needed)

### Smart Contract Alignment

> ⚠️ **USE SOLANA MCP** - Workers on these tasks MUST use the Solana MCP for building, testing, and deploying.

- [ ] T210 Fix smart contract timing constants
  - Scope: prediction_program/programs/prediction_program/src/
  - Change: LOCK_PERIOD from 10s to 5s to match backend
  - Verify: On-chain round timing matches off-chain (25s betting, 5s locked)
  - Files: prediction_program/programs/prediction_program/src/lib.rs
  - REQUIRES: Solana MCP, deploy to devnet first

- [ ] T211 Add early bird multiplier to smart contract
  - Scope: prediction_program/programs/prediction_program/src/
  - Add: Store bet_timestamp in PlayerPosition PDA
  - Add: Calculate early bird multiplier in claim_winnings (20% max, linear decay over betting period)
  - Formula: multiplier = 1 + (0.20 * (1 - timeIntoRound/bettingDuration))
  - Verify: Early bets receive bonus payout on-chain
  - Files: prediction_program/programs/prediction_program/src/state.rs, lib.rs
  - REQUIRES: Solana MCP, deploy to devnet first

- [ ] T212 Add round status enum for locked state
  - Scope: prediction_program/programs/prediction_program/src/
  - Change: RoundStatus enum from {Open, Settled} to {Betting, Locked, Settled}
  - Update: Crank instruction to transition through Locked state
  - Update: place_bet to only allow bets during Betting status
  - Verify: Frontend type mismatch resolved
  - Files: prediction_program/programs/prediction_program/src/state.rs, lib.rs
  - REQUIRES: Solana MCP, deploy to devnet first

### Frontend Integration

- [ ] T220 Fix frontend type definitions for round status
  - Scope: web/src/lib/prediction/, web/src/hooks/usePrediction.ts
  - Update: RoundStatus type to match contract (Betting/Locked/Settled)
  - Update: Status mapping and display logic in usePrediction.ts
  - Verify: No TypeScript errors, correct status shown in UI
  - Files: web/src/lib/prediction/types.ts, web/src/hooks/usePrediction.ts

- [ ] T221 Add claim winnings UI flow
  - Scope: web/src/app/predict/page.tsx
  - Add: "Claim Winnings" button when user has unclaimed on-chain wins
  - Add: Loading state during claim transaction
  - Add: Success/error toasts after claim
  - Verify: User can claim on-chain wins through UI
  - Files: web/src/app/predict/page.tsx, web/src/hooks/usePrediction.ts

- [ ] T222 Replace mock Live Bets with real data
  - Scope: web/src/app/predict/page.tsx
  - Change: Mock liveBets array to real socket stream
  - Add: Subscribe to bet_placed socket event from backend
  - Add: Show actual bets as they come in (last 10)
  - Verify: Live bets sidebar shows real activity
  - Files: web/src/app/predict/page.tsx

- [ ] T223 Remove dead code from prediction client
  - Scope: web/src/lib/prediction/client.ts
  - Delete: initializeRound() method - not a real contract instruction
  - Delete: lockRound() method - not a real contract instruction
  - Delete: settleRound() method - not a real contract instruction
  - Verify: No dead code, only methods that map to contract instructions remain
  - Files: web/src/lib/prediction/client.ts

### Testing

- [ ] T230 Integration test suite for Oracle
  - Scope: backend/tests/, web/tests/ (or web/src/__tests__/)
  - Add: Test bet placement and database persistence
  - Add: Test round lifecycle (betting → locked → settled)
  - Add: Test payout calculation with early bird multiplier
  - Add: Test on-chain/off-chain mode switching
  - Verify: All critical paths covered, tests pass
  - Files: backend/tests/prediction.test.ts, web/src/__tests__/predict.test.ts

---

## Completed

_Tasks marked [x] are moved here after verification_

---

## Failed/Blocked

_Tasks marked [!] need human intervention_
