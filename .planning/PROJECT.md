# Sol-Battles

## What This Is

A production-ready PvP skill-based crypto betting platform on Solana where traders compete against each other predicting price movements — no house edge, pure player vs player. Fully security-hardened, mobile-responsive, with operational monitoring ready for mainnet.

## Core Value

Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.

## Requirements

### Validated

<!-- Shipped and confirmed in v1.0 -->

- ✓ **Oracle Predictions** — Real-time price betting using Pyth oracles (v0-devnet)
- ✓ **1v1 Battles** — Head-to-head prediction competitions (v0-devnet)
- ✓ **Draft Tournaments** — Multi-round tournament format (v0-devnet)
- ✓ **Progression System** — XP and leveling mechanics (v0-devnet)
- ✓ **Spectator Betting** — Watch and bet on others' battles (v0-devnet)
- ✓ **Wallet Authentication** — Solana wallet signature verification (v0-devnet)
- ✓ **Session Keys** — Frictionless betting without constant signing (v0-devnet)
- ✓ **Real-time Updates** — WebSocket-based live state sync (v0-devnet)
- ✓ **Security Hardening** — Atomic operations, replay protection, checked arithmetic (v1.0)
- ✓ **UX Polish** — Error boundaries, loading states, mobile responsiveness (v1.0)
- ✓ **Scheduled Matches** — Cron-based match creation for player density (v1.0)
- ✓ **Operational Monitoring** — Discord alerts, health checks, backups (v1.0)
- ✓ **Deployment Automation** — Scripts and runbooks for mainnet (v1.0)
- ✓ **Code Quality Audit** — Dead code removal, type safety, fee consolidation (v1.1)
- ✓ **Security Audit** — Input validation, auth hardening, race condition fixes (v1.1)
- ✓ **Smart Contract Audit** — Sealevel attacks, betting logic, oracle security verified (v1.1)
- ✓ **Multi-sig Plan** — Squads Protocol setup documented, scripts ready (v1.1)

### Active

<!-- v2.0 Battles System -->

- [ ] Battle matchmaking — Queue system, challenges, tier/balance matching
- [ ] Battle execution — Real-time PnL tracking, leverage calc, liquidation logic
- [ ] Settlement system — Auto winner determination, instant payouts, history
- [ ] Spectator viewer — Live battle display, positions, price chart
- [ ] Spectator betting — Pick fighter, live odds, instant payout
- [ ] Live chat — Battle chat, reactions, spam protection
- [ ] Social sharing — One-click share, auto-generated graphics
- [ ] Fighter profiles — W/L record, rankings, streaks
- [ ] Fight cards — Scheduled events, countdowns, notifications
- [ ] Tournament mode — Brackets, elimination, prize pools

### Future

- [ ] Mainnet deployment — Deploy to Solana mainnet-beta
- [ ] User acquisition — First 100 real users
- [ ] Iteration based on feedback — Address issues found in production

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- House betting / liquidity pools — Undermines core PvP value prop
- Social features beyond spectating — Focus on core betting first
- Mobile app — Web-first for v1, mobile later
- Fiat on-ramp integration — Users bring their own SOL for now
- KYC/AML compliance — Assess regulatory requirements post-launch
- Professional security audit — Deferred until 30+ days stable operation

## Current Milestone: v2.0 Battles System

**Goal:** Build the UFC of Crypto Trading — live 1v1 leveraged battles with spectator betting, social features, and tournament modes.

**Approach:** Audit first, build second. Improve existing code where possible, only build from scratch if nothing exists.

**Target features:**
- Battle matchmaking (queue, challenges, tier matching)
- Battle execution engine (real-time PnL, leverage, liquidation)
- Settlement system (auto winner, instant payouts)
- Spectator viewer (live battle display, both fighters, price chart)
- Spectator betting (pick fighter, live odds, instant payout)
- Live chat (battle chat, reactions, spam protection)
- Social sharing (one-click share, auto-generated graphics)
- Fighter profiles (W/L record, rankings, streaks)
- Fight cards (scheduled events, countdowns, notifications)
- Tournament mode (brackets, elimination, prize pools)

**Success metrics:**
- Battles being watched by 10+ spectators
- Spectator bets on every battle
- Battle clips shared on Twitter daily

## Context

**Current state:** v1.0 shipped. Starting v1.1 audit cycle before mainnet.

**Codebase:**
- ~62 files, ~9,500 lines TypeScript/Rust changed in v1.0
- Frontend: Next.js 16, React, TailwindCSS, Socket.IO
- Backend: Express, Socket.IO, SQLite, TypeScript
- Smart contracts: Rust/Anchor on Solana
- Deployment: Vercel (frontend), Render (backend)

**Architecture:** Hybrid on-chain/off-chain. Core betting logic (escrow, settlement) on-chain via Anchor. Game orchestration, matchmaking, real-time updates handled by Express backend with Socket.IO.

**Known tech debt:**
- Logger adoption partial (some services still use console.log)
- Error boundary coverage limited to predict/battle pages
- Error rate metric not explicitly in dashboard

**Market positioning:** "The poker of crypto trading" — skill-based, no house edge, player vs player.

## Constraints

- **Codebase**: Brownfield — must work within existing architecture
- **Blockchain**: Solana mainnet-beta target
- **Budget**: Bootstrap / solo developer
- **Timeline**: Launch when ready, not rushing

## Key Decisions

<!-- Decisions that constrain future work -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PvP-only, no house edge | Core differentiator, regulatory simplicity | ✓ Good |
| Hybrid on-chain/off-chain | Faster UX, lower costs, on-chain settlement | ✓ Good |
| Session keys for betting | Removes signing friction | ✓ Good |
| Pyth oracles for prices | Reliable, low-latency, Solana-native | ✓ Good |
| Discord webhook alerting | Simple, team uses Discord, no infra needed | ✓ Good |
| Atomic Redis SET NX EX | Eliminates TOCTOU in replay protection | ✓ Good |
| verifyAndLockBalance pattern | Single instruction prevents balance race | ✓ Good |
| better-sqlite3 backup API | Safe during writes, no corruption risk | ✓ Good |
| Kubernetes health endpoints | Standard probes, easy container deployment | ✓ Good |
| 7-day backup retention | Balance storage cost vs recovery window | ✓ Good |

---
*Last updated: 2026-01-23 after v2.0 milestone start*
