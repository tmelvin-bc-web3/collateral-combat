# DegenDome - Claude Code Context

> This file is automatically read by Claude Code when you start a session in this project.

## Project Overview

**DegenDome** is a PvP trading arena on Solana. Users compete in skill-based games: predict price movements, battle traders with leverage, draft memecoin portfolios, and wager on live matches.

- **Live Site**: https://www.degendome.xyz
- **Network**: Solana Devnet
- **Program ID**: `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`

## Repository Structure

```
sol-battles/
├── web/                    # Next.js 16 frontend (pnpm)
├── backend/                # Node.js + Socket.IO server (npm)
├── programs/
│   └── session_betting/    # Anchor smart contract (Rust)
├── CLAUDE.md              # This file (auto-loaded)
├── PRODUCT.md             # Product overview
└── README.md              # Technical documentation
```

## Quick Start Commands

### Frontend
```bash
cd web
pnpm install
pnpm dev          # localhost:3000
pnpm build        # Production build
vercel --prod     # Deploy to Vercel
```

### Backend
```bash
cd backend
npm install
npm run dev       # localhost:3001
```

### Smart Contract
```bash
cd programs/session_betting
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Game Modes

| Mode | Description | Entry |
|------|-------------|-------|
| **Oracle** | 30-second SOL price predictions | 0.01+ SOL |
| **Battle** | 1v1 leveraged trading (5 min) | 0.1-5 SOL |
| **Draft** | Weekly memecoin portfolio tournament | 0.1-1 SOL |
| **Spectate** | Wager on live battles | 0.01+ SOL |
| **LDS** | Battle royale elimination | 0.1 SOL |
| **Token Wars** | Head-to-head token performance | 0.01-10 SOL |

## Tech Stack

- **Frontend**: Next.js 16, React, TailwindCSS, Socket.IO
- **Backend**: Node.js, Express, Socket.IO, TypeScript, SQLite
- **Blockchain**: Solana, Anchor 0.31.1, Pyth Network oracle
- **Deployment**: Vercel (frontend), Render (backend)

## Key Concepts

### Session Betting System
Users deposit SOL to a PDA vault, create a session key (24h), and wager instantly without wallet popups. Session keys can bet but CANNOT withdraw.

### Platform Fee
5% fee on winnings (taken from losing pool).

### Fund Locking
Wagers are locked on-chain immediately when placed - users cannot withdraw wagered funds.

## Design System

- **Theme**: "Wasteland" post-apocalyptic aesthetic
- **Colors**: Orange accent (#ff5500), Green success, Red danger
- **Background**: Dark (#080705)
- **Glass-morphism**: `bg-black/40 backdrop-blur border border-white/10`

## Important Files

### Frontend (`web/`)
- `src/app/predict/page.tsx` - Oracle predictions
- `src/app/battle/page.tsx` - Battle arena
- `src/components/BattleArena.tsx` - Trading interface
- `src/hooks/useSessionBetting.ts` - Wallet/session management
- `src/lib/session-betting/` - Solana program client

### Backend (`backend/`)
- `src/index.ts` - Express + Socket.IO server
- `src/services/battleManager.ts` - Battle logic
- `src/services/predictionServiceOnChain.ts` - Oracle rounds
- `src/services/balanceService.ts` - PDA balance checks

### Smart Contract
- `programs/session_betting/programs/session_betting/src/lib.rs`

## Coding Standards

- TypeScript strict mode
- Functional React components
- No `console.log` in production
- Use environment variables for URLs
- Server components by default, `'use client'` when needed

## For Detailed Context

See these files for more information:
- @PRODUCT.md - Full product overview with all game modes
- @README.md - Technical architecture and API documentation
- @CLAUDE_PROJECT_CONTEXT.md - Comprehensive development context
- @CLAUDE_TYPES_REFERENCE.md - All TypeScript types

## Subproject Context

- @web/CLAUDE.md - Frontend-specific context
- @backend/CLAUDE.md - Backend-specific context
