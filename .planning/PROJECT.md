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

### Active

<!-- v1.1 Code & Security Audit -->

- [ ] Code quality audit — Dead code removal, redundancy consolidation, naming/readability, type safety
- [ ] Security audit — Input validation, auth/session, race conditions
- [ ] Smart contract audit — Full code quality + security + verification patterns
- [ ] All issues documented and fixed

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

## Current Milestone: v1.1 Code & Security Audit

**Goal:** Comprehensive audit of codebase and smart contract for code quality and security before mainnet deployment.

**Target deliverables:**
- Clean, readable codebase with no dead code or redundancies
- Tight TypeScript types throughout
- All inputs validated, auth hardened, race conditions eliminated
- Smart contract fully audited with verification patterns
- All issues documented and fixed

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
*Last updated: 2026-01-22 after v1.1 milestone start*
