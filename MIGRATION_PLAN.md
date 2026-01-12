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

- [@w1] T010 Progression page mobile layout
  - Scope: web/src/app/progression/
  - Verify: responsive at 375px, 768px breakpoints
  - Files: web/src/app/progression/page.tsx

- [ ] T011 Leaderboard page mobile layout
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

## P2 - Medium Priority (UX Improvements)

- [ ] T014 Oracle chart polish and animations
  - Scope: web/src/components/RealtimeChart.tsx
  - Verify: smooth bezier curves, cleaner colors, no jank
  - Files: web/src/components/RealtimeChart.tsx

- [ ] T020 Micro-interactions and hover feedback
  - Scope: web/src/components/
  - Verify: buttons have hover states, transitions smooth
  - Files: web/src/components/ui/*.tsx

- [ ] T021 Toast notification system
  - Scope: web/src/
  - Verify: toast shows on success/error actions
  - Files: web/src/components/Toast.tsx, web/src/contexts/ToastContext.tsx

- [ ] T022 Skeleton loaders for data fetches
  - Scope: web/src/components/
  - Verify: skeleton shows during loading states
  - Files: web/src/components/ui/Skeleton.tsx

---

## P3 - Nice to Have

- [ ] T030 Dark/light theme toggle
  - Scope: web/src/
  - Verify: theme persists, all components respect theme
  - Files: web/src/contexts/ThemeContext.tsx, web/tailwind.config.ts

- [ ] T031 Sound effects for wins/losses
  - Scope: web/src/hooks/
  - Verify: sounds play, can be muted
  - Files: web/src/hooks/useSound.ts, web/public/sounds/

- [ ] T032 Confetti animation on level up
  - Scope: web/src/components/
  - Verify: confetti triggers on level milestone
  - Files: web/src/components/Confetti.tsx

---

## Completed

_Tasks marked [x] are moved here after verification_

---

## Failed/Blocked

_Tasks marked [!] need human intervention_
