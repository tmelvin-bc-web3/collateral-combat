# DegenDome Frontend - Claude Code Context

## Overview

Next.js 16 frontend with App Router, React, TailwindCSS, and Solana wallet integration.

**Live URL**: https://www.degendome.xyz

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **Real-time**: Socket.IO client
- **Blockchain**: Solana Wallet Adapter
- **Charts**: TradingView, Lightweight Charts
- **Package Manager**: pnpm

## Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm typecheck    # TypeScript checking
vercel --prod     # Deploy to Vercel
```

## Directory Structure

```
web/src/
├── app/                      # App Router pages
│   ├── battle/              # Battle arena
│   ├── predict/             # Oracle predictions
│   ├── draft/               # Draft tournaments
│   ├── spectate/            # Watch & wager
│   ├── lds/                 # Last Degen Standing
│   ├── token-wars/          # Token Wars
│   ├── leaderboard/         # Rankings
│   ├── progression/         # XP and perks
│   ├── profile/[wallet]/    # User profiles
│   └── docs/                # Documentation
│
├── components/              # React components
│   ├── battle/             # Battle-specific
│   ├── prediction/         # Oracle-specific
│   ├── progression/        # XP/level UI
│   ├── ranks/              # Leaderboard
│   └── ui/                 # Shared UI
│
├── hooks/                   # Custom hooks
│   ├── useSessionBetting.ts # Balance & session management
│   ├── usePrices.ts        # Real-time prices
│   └── useBattleOnChain.ts # Battle blockchain integration
│
├── lib/                     # Utilities
│   ├── socket.ts           # Socket.IO client singleton
│   └── session-betting/    # Solana program client
│       ├── client.ts       # Program interactions
│       └── types.ts        # Constants & types
│
├── contexts/               # React contexts
│   └── BattleContext.tsx   # Battle state management
│
├── config/                 # Configuration
│   └── whitelist.ts       # Early access wallets
│
└── types/                  # TypeScript types
```

## Key Files

### Pages
- `app/predict/page.tsx` - Oracle predictions (main feature)
- `app/battle/page.tsx` - Battle arena
- `app/draft/page.tsx` - Draft tournaments
- `app/spectate/page.tsx` - Spectator wagering

### Components
- `components/BattleArena.tsx` - Main trading interface
- `components/BattleLobby.tsx` - Battle matchmaking
- `components/WalletBalance.tsx` - Deposit/withdraw/session modal
- `components/TradingViewChart.tsx` - Chart embed

### Hooks
- `hooks/useSessionBetting.ts` - Core hook for balance, sessions, wagering
- `hooks/usePrices.ts` - Real-time price feeds via WebSocket

### Lib
- `lib/socket.ts` - Socket.IO singleton (connects to backend)
- `lib/session-betting/client.ts` - Solana program interactions

## Design System

### Theme: "Wasteland"
Post-apocalyptic aesthetic with dark backgrounds and orange accents.

### Colors
| Name | Value | Usage |
|------|-------|-------|
| `warning` | `#ff5500` | Primary accent/CTA |
| `success` | `#7fba00` | Long positions, wins |
| `danger` | `#cc2200` | Short positions, losses |
| `bg-primary` | `#080705` | Main background |

### Glass-morphism Pattern
```css
bg-black/40 backdrop-blur border border-white/10
```

### Typography
- **Headers**: Impact font for dramatic effect
- **Body**: Inter for readability

## Common Patterns

### Client Components
```tsx
'use client';  // Required for interactivity, hooks, wallet
```

### Socket Connection
```typescript
import { socket } from '@/lib/socket';
socket.emit('subscribe_prediction', 'SOL');
socket.on('prediction_round', handleRound);
```

### Session Betting Hook
```typescript
const {
  balance,
  sessionActive,
  deposit,
  withdraw,
  createSession,
  placeBet,
} = useSessionBetting();
```

### Wallet Connection
```typescript
import { useWallet } from '@solana/wallet-adapter-react';
const { publicKey, connected, signTransaction } = useWallet();
```

## Environment Variables

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA
```

## Common Issues & Solutions

### 1. Color classes not working
Use explicit Tailwind colors (`text-warning`, `bg-success`) instead of CSS variable-based ones.

### 2. TradingView chart sizing
Use iframe embed with 100% width/height in a flex container.

### 3. Hydration errors
Ensure client-only code (wallet, localStorage) is in `'use client'` components with proper loading states.

### 4. Socket not connecting
Check that backend is running on port 3001 and `NEXT_PUBLIC_BACKEND_URL` is set.

## Deployment

- **Production**: Vercel (manual deploy with `vercel --prod`)
- **Preview**: Auto-deploys on PR branches
- **Domain**: degendome.xyz (configured in Vercel)

## Testing

```bash
pnpm build  # Must pass before deploying
```

Manual testing:
- Oracle page: http://localhost:3000/predict
- Battle page: http://localhost:3000/battle
- Connect wallet and test session creation
