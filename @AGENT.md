# DegenDome - Agent Build Instructions

## Project Setup

### Frontend (Next.js)
```bash
cd web
pnpm install
```

### Backend (Node.js)
```bash
cd backend
npm install
```

### Solana Programs (Anchor/Rust)
```bash
cd prediction_program  # or battle_program, draft_program
anchor build
```

## Running Development Servers

### Frontend
```bash
cd web
pnpm run dev
# Opens at http://localhost:3000
```

### Backend
```bash
cd backend
npm run dev
# Socket server starts on configured port
```

### Solana Local Validator (for testing)
```bash
solana-test-validator
```

## Build Commands

### Frontend Production Build
```bash
cd web
pnpm run build
```

### Solana Program Build
```bash
cd prediction_program
anchor build
```

## Deployment

### Deploy to Vercel (Production)
```bash
cd web
vercel --prod --yes
# Live site: https://degendome.xyz
```

### Deploy Solana Program
```bash
anchor deploy --provider.cluster devnet
```

## Key File Locations

### Frontend
- `web/src/app/predict/page.tsx` - Oracle betting page
- `web/src/app/progression/page.tsx` - Ranks and perks
- `web/src/config/whitelist.ts` - Early access wallets

### Backend
- `backend/src/services/progressionService.ts` - XP/leveling logic
- `backend/src/db/progressionDatabase.ts` - Database operations

### Solana Programs
- `prediction_program/programs/prediction_program/src/lib.rs`
- `battle_program/programs/battle_program/src/lib.rs`

## Key Learnings

### Styling
- Use `text-white` or `text-black` for button selected states (NOT `text-bg-primary`)
- Keep UI compact to avoid scrolling on main pages
- Use existing Tailwind theme classes: `bg-primary`, `bg-secondary`, `text-accent`

### Package Manager
- Frontend uses **pnpm** (not npm)
- Backend still uses npm

### Wallet Integration
- Uses @solana/wallet-adapter-react
- Whitelist check happens in middleware/proxy

### XP System
- ~25 XP per bet average
- Level thresholds in `progressionService.ts`
- Perks last for 50 bets once activated

## Feature Completion Checklist

Before marking ANY feature as complete:

- [ ] `pnpm run build` passes in /web (no TypeScript errors)
- [ ] Backend runs without errors
- [ ] Changes tested locally at localhost:3000
- [ ] All changes committed with descriptive messages
- [ ] All commits pushed to remote (git push origin main)
- [ ] @fix_plan.md task marked as complete
- [ ] Deployed to Vercel if significant change

## Git Workflow

```bash
# Stage and commit
git add .
git commit -m "feat: descriptive message"

# Push to remote
git push origin main

# Deploy
cd web && vercel --prod --yes
```

## Common Issues

### Peer Dependency Warnings
- Expected from older wallet adapter packages
- Safe to ignore, doesn't affect functionality

### Middleware Deprecation Warning
- Next.js 16 deprecated middleware convention
- Should migrate to proxy pattern when time allows
