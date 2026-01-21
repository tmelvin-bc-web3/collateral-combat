# Sol-Battles

## What This Is

A PvP skill-based crypto betting platform on Solana where traders compete against each other predicting price movements — no house edge, pure player vs player. Think poker for crypto traders: your winnings come from other players, not the house.

## Core Value

Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ **Oracle Predictions** — Real-time price betting using Pyth oracles (v0-devnet)
- ✓ **1v1 Battles** — Head-to-head prediction competitions (v0-devnet)
- ✓ **Draft Tournaments** — Multi-round tournament format (v0-devnet)
- ✓ **Progression System** — XP and leveling mechanics (v0-devnet)
- ✓ **Spectator Betting** — Watch and bet on others' battles (v0-devnet)
- ✓ **Wallet Authentication** — Solana wallet signature verification (v0-devnet)
- ✓ **Session Keys** — Frictionless betting without constant signing (v0-devnet)
- ✓ **Real-time Updates** — WebSocket-based live state sync (v0-devnet)

### Active

<!-- Current scope. Building toward mainnet launch. -->

- [ ] Security hardening — Address critical vulnerabilities before mainnet
- [ ] UX polish — Remove friction, improve onboarding flow
- [ ] Launch strategy — Define go-to-market, initial user acquisition
- [ ] Monitoring & ops — Observability, alerting, incident response

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- House betting / liquidity pools — Undermines core PvP value prop
- Social features beyond spectating — Focus on core betting first
- Mobile app — Web-first for v1, mobile later
- Fiat on-ramp integration — Users bring their own SOL for now
- KYC/AML compliance — Assess regulatory requirements post-launch

## Context

**Current state:** Fully functional on devnet. Smart contracts deployed, backend running, frontend complete. Never been live on mainnet.

**Architecture:** Hybrid on-chain/off-chain. Core betting logic (escrow, settlement) on-chain via Anchor. Game orchestration, matchmaking, real-time updates handled by Express backend with Socket.IO.

**Tech stack:** TypeScript/Next.js frontend, Express backend, Rust/Anchor smart contracts, PostgreSQL + SQLite databases, Pyth oracles for price feeds.

**Known issues from codebase mapping:**
- Silent error handling (25+ instances returning null on error)
- Signature replay race condition in auth middleware
- PDA balance verification gap (balance checked but not atomically locked)
- 576+ uncontrolled console.log statements (need structured logging)
- Missing audit trail for regulatory defensibility

**Market positioning:** "The poker of crypto trading" — skill-based, no house edge, player vs player. Target audience: crypto degens and gamblers who want fair competition.

**Launch blocker:** Fear of launching to zero users. Has waitlist with 2 signups (1 is self). No existing audience or distribution channel.

## Constraints

- **Codebase**: Brownfield — must work within existing architecture
- **Blockchain**: Solana mainnet-beta target
- **Budget**: Bootstrap / solo developer
- **Timeline**: Launch when ready, not rushing

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PvP-only, no house edge | Core differentiator, regulatory simplicity | — Pending |
| Hybrid on-chain/off-chain | Faster UX, lower costs, on-chain settlement | ✓ Good |
| Session keys for betting | Removes signing friction | ✓ Good |
| Pyth oracles for prices | Reliable, low-latency, Solana-native | ✓ Good |

---
*Last updated: 2026-01-21 after project initialization*
