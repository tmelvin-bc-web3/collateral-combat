# Frontend UI Worker Plan

> Worker focusing on pages and components.
> Files: `web/src/app/`, `web/src/components/` only
> CONSTRAINT: Do NOT modify Oracle UI layout (predict/page.tsx visual structure)

---

## Story: Oracle Integration (Non-Visual)

- [ ] **T221** Add claim winnings UI flow
  - Add "Claim Winnings" button when user has unclaimed on-chain wins
  - Add loading state during claim transaction
  - Add success/error toasts after claim
  - Files: `web/src/app/predict/page.tsx`
  - NOTE: Only add claim button, do NOT change layout

- [ ] **T222** Replace mock Live Bets with real data
  - Change mock `liveBets` array to real socket stream
  - Subscribe to `bet_placed` socket event from backend
  - Show actual bets as they come in (last 10)
  - Files: `web/src/app/predict/page.tsx`

---

## Story: UX Enhancements

- [ ] **T100** Leaderboard weekly/monthly/all-time tabs
  - Add tabs for weekly, monthly, all-time periods
  - Data updates correctly per tab
  - Files: `web/src/app/leaderboard/page.tsx`

- [ ] **T101** Leaderboard pagination and search
  - Paginate results (25 per page)
  - Search by username/wallet
  - Files: `web/src/app/leaderboard/page.tsx`

- [ ] **T102** User profile page - basic structure
  - New `/profile/[wallet]` route
  - Shows username, level, XP, rank, avatar
  - Files: `web/src/app/profile/[wallet]/page.tsx`

- [ ] **T103** User profile page - betting history
  - Shows last 50 bets with outcome, amount, date
  - Files: `web/src/app/profile/[wallet]/page.tsx`

- [ ] **T104** User profile page - stats and achievements
  - Win rate, total wagered, biggest win
  - Files: `web/src/app/profile/[wallet]/page.tsx`

---

## Story: Mobile Responsiveness

> CONSTRAINT: Use responsive breakpoints only. Do NOT alter desktop layout.

- [ ] **T110** Oracle page mobile layout
  - Fully usable at 375px width
  - Only add responsive classes (sm:, md:, lg:)
  - Files: `web/src/app/predict/page.tsx`

- [ ] **T111** Global mobile navigation improvements
  - Hamburger menu smooth, touch targets 44px+
  - Files: `web/src/components/Header/*.tsx`

- [ ] **T112** Touch interactions and gestures
  - No hover-only interactions
  - Tap feedback on all buttons
  - Files: `web/src/components/**/*.tsx`

---

## Story: Sound Integration

- [ ] **T121** Betting sound effects
  - Sounds for: bet placed, countdown tick (last 5s), round lock, win, loss
  - Files: `web/src/app/predict/page.tsx`, `web/public/sounds/`

- [ ] **T122** UI feedback sounds
  - Subtle sounds for: button clicks, level up, achievement unlock
  - Files: `web/src/components/**/*.tsx`

---

## Constraints

- Do NOT modify Oracle UI visual layout or styling
- Only add responsive breakpoint classes for mobile
- Run `npm run build` in web to verify TypeScript compiles
