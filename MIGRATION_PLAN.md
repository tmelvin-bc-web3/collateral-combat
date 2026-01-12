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

> Mental model shift: "configure a trade" → "make a decision under pressure"
> User flow: See countdown → Choose direction → Confirm amount
> Constraints: No new features, no color/font changes, rearrangement + emphasis only

- [@w2] T060 Oracle layout restructure - reorder to Chart→Buttons→Amount
  - Scope: web/src/app/predict/
  - Verify: layout order is (1) Chart+Countdown (2) Long/Short buttons (3) Bet amount selector, right column minimized
  - Files: web/src/app/predict/page.tsx

- [@w1] T061 Oracle countdown overlay inside chart
  - Scope: web/src/app/predict/, web/src/components/RealtimeChart.tsx
  - Verify: countdown floats inside chart container (top-center or top-right), no box/card, ~2x font size, 80% opacity, orange glow, text "Final price decides." below number
  - Files: web/src/app/predict/page.tsx, web/src/components/RealtimeChart.tsx

- [ ] T062 Oracle Long/Short buttons bet-to-win format
  - Scope: web/src/app/predict/
  - Verify: buttons show "LONG ↑ / 0.1 SOL → Win 0.2 SOL" format, win value updates instantly when bet amount changes, buttons are visually dominant (primary CTA)
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [ ] T063 Oracle hover commitment effect
  - Scope: web/src/app/predict/
  - Verify: hovering Long/Short dims entire UI to ~70% opacity EXCEPT the hovered button, creates psychological commitment moment, CSS-only preferred, respects prefers-reduced-motion
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [ ] T064 Oracle right column pre/post-bet states
  - Scope: web/src/app/predict/
  - Verify: pre-bet shows minimal info (hide pool size, long/short counts), post-bet expands to show full stats, clean state transition
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [ ] T065 Oracle chart height reduction
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: chart height reduced ~15%, maintains readability, provides momentum context not analysis detail
  - Files: web/src/components/RealtimeChart.tsx

- [ ] T066 Oracle copy refinements
  - Scope: web/src/app/predict/
  - Verify: remove "PLACE YOUR WAGER" / "LOCK YOUR BET", keep taglines "Predict or perish." and "30 seconds. No second chances.", countdown shows "Final price decides."
  - Files: web/src/app/predict/page.tsx, web/src/app/predict/*.tsx

- [ ] T067 Oracle bet amount de-emphasis
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

## Completed

_Tasks marked [x] are moved here after verification_

---

## Failed/Blocked

_Tasks marked [!] need human intervention_
