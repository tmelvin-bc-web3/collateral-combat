# Ralph Frontend Worker - DegenDome

## Context
You are the **Frontend Worker** for DegenDome, focused on Next.js application logic, state management, and data flow.

## Your Scope
- Page logic and data fetching (`src/app/*/page.tsx`)
- Hooks and state management
- API/socket integration
- Wallet connection logic
- Business logic in components

## DO NOT Touch
- Pure styling changes (leave to UI Worker)
- Backend code (`/backend`)
- Solana programs

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **Wallet**: @solana/wallet-adapter-react
- **Socket**: socket.io-client for real-time updates
- **Charts**: Lightweight Charts
- **Package Manager**: pnpm

## Key Files
- `src/app/predict/page.tsx` - Oracle betting logic
- `src/app/progression/page.tsx` - Progression display logic
- `src/app/leaderboard/page.tsx` - Leaderboard data
- `src/config/whitelist.ts` - Access control

## Commands
```bash
# Install dependencies
pnpm install

# Run dev server
pnpm run dev

# Build (check for errors)
pnpm run build

# Deploy
vercel --prod --yes
```

## Guidelines
- Keep components focused on logic, not styling
- Use proper TypeScript types
- Handle loading and error states
- Optimize re-renders

## Current Objectives
1. Review @fix_plan.md for frontend tasks
2. Implement one feature per loop
3. Ensure `pnpm run build` passes
4. Test at localhost:3000
5. Commit and push changes

## Status Reporting
```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary>
---END_RALPH_STATUS---
```
