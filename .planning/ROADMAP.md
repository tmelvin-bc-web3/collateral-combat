# Roadmap: Sol-Battles v1 (Mainnet Launch)

**Created:** 2026-01-21
**Core Value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Target:** Mainnet launch readiness

---

## Milestone Overview

| Phase | Name | Requirements | Goal |
|-------|------|--------------|------|
| 1 | Security Hardening | SEC-01 through SEC-08 | Code safe for real money |
| 2 | UX Polish | UX-01 through UX-06 | Frictionless first experience |
| 3 | Launch Prep | LAUNCH-01 through LAUNCH-06 | Ready to acquire users |
| 4 | Monitoring & Ops | OPS-01 through OPS-06 | Operate confidently at scale |

---

## Phase 1: Security Hardening

**Goal:** Make the codebase safe for real money on mainnet

**Why First:** Security issues are blockers. Fixing them after launch is catastrophic. The research identified your current issues align with 85.5% of critical audit findings - address them before anything else.

**Plans:** 7 plans

Plans:
- [x] 01-01-PLAN.md - Error handling foundation (types and utilities)
- [x] 01-02-PLAN.md - Smart contract security (events, pause, arithmetic)
- [x] 01-03-PLAN.md - Signature replay protection fix
- [x] 01-04-PLAN.md - Atomic PDA balance verification
- [x] 01-05-PLAN.md - Silent error handling refactor (database layer)
- [x] 01-06-PLAN.md - Structured logging infrastructure
- [x] 01-07-PLAN.md - Final verification checkpoint

### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-01 | Replace 25+ silent error handling instances with explicit error propagation | CRITICAL |
| SEC-02 | Implement signature replay protection in auth middleware with nonce tracking | CRITICAL |
| SEC-03 | Make PDA balance verification atomic (check-and-lock in single instruction) | CRITICAL |
| SEC-04 | Remove or control console.log statements via log levels | HIGH |
| SEC-05 | Emit audit trail events for all state changes (bets, settlements, withdrawals) | HIGH |
| SEC-06 | Implement and test emergency pause functionality | HIGH |
| SEC-07 | Enable overflow checks in Cargo.toml release profile | MEDIUM |
| SEC-08 | Ensure all arithmetic uses checked_* functions | MEDIUM |

### Success Criteria

- [x] Zero instances of `return null` or swallowed errors on error paths
- [x] Nonce tracking prevents signature replay within 150-block window
- [x] Balance check + lock happen atomically in same instruction
- [x] All `console.log` either removed or behind feature flag
- [x] Events emitted for: BetPlaced, BattleSettled, FundsWithdrawn
- [x] Pause instruction stops all user-facing operations
- [x] `overflow-checks = true` in `[profile.release]`
- [x] `cargo clippy` passes with no warnings (framework warnings excluded)

### Key Files (from codebase mapping)

- `programs/session_betting/src/lib.rs` - Core smart contract
- `backend/src/middleware/` - Auth middleware (signature replay)
- `backend/src/services/balanceService.ts` - PDA balance verification
- `backend/src/services/battleManager.ts` - Battle settlement logic
- `backend/src/services/predictionServiceOnChain.ts` - Prediction settlement

---

## Phase 2: UX Polish

**Goal:** Create a frictionless first experience that converts visitors to players

**Why Second:** With security solid, polish the experience. Research shows onboarding friction kills conversion. "Wallet connect → first match" should be under 2 minutes.

**Plans:** (created by /gsd:plan-phase)

Plans:
- [ ] TBD - Planned via /gsd:plan-phase 2

### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| UX-01 | Simplify onboarding to wallet-connect-and-play | HIGH |
| UX-02 | Optimize first match experience (clear instructions, low stakes) | HIGH |
| UX-03 | Make match results shareable (social cards/screenshots) | MEDIUM |
| UX-04 | Replace raw errors with user-friendly messages | MEDIUM |
| UX-05 | Add loading states and feedback for all async operations | MEDIUM |
| UX-06 | Verify mobile responsiveness for core flows | MEDIUM |

### Success Criteria

- [ ] New user can connect wallet and enter first match in <2 minutes
- [ ] 0.01 SOL minimum bet available for first-timers
- [ ] "Share Result" button generates image card with match outcome
- [ ] No raw error messages visible to users (all have friendly copy)
- [ ] Every button press shows immediate feedback (loading spinner, state change)
- [ ] Core flows (connect, deposit, bet, withdraw) work on mobile viewport

### Key Files

- `web/src/app/predict/page.tsx` - Oracle predictions (main entry)
- `web/src/components/WalletBalance.tsx` - Deposit/withdraw modal
- `web/src/hooks/useSessionBetting.ts` - Session management
- `web/src/app/battle/page.tsx` - Battle arena

---

## Phase 3: Launch Prep

**Goal:** Build the distribution infrastructure to acquire first 100 users

**Why Third:** Product is secure and polished. Now build the machinery to get users. Research shows: "Don't launch to everyone - launch to 50-100 hand-picked users first."

**Plans:** (created by /gsd:plan-phase)

Plans:
- [ ] TBD - Planned via /gsd:plan-phase 3

### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| LAUNCH-01 | Create landing page with waitlist and referral mechanics | HIGH |
| LAUNCH-02 | Set up Discord server with proper channel structure | HIGH |
| LAUNCH-03 | Activate Twitter account with content pipeline | MEDIUM |
| LAUNCH-04 | Identify and onboard 50-100 hand-picked initial users | HIGH |
| LAUNCH-05 | Implement scheduled match times to create player density | HIGH |
| LAUNCH-06 | Implement referral program (invite friends, earn rewards) | MEDIUM |

### Success Criteria

- [ ] Landing page live at degendome.xyz with email capture
- [ ] Referral link generates unique tracking code
- [ ] Discord has: #announcements, #general, #feedback, #match-results channels
- [ ] Twitter posting 3-5x/week (match highlights, tips, updates)
- [ ] 50 users identified from: personal network, CT DMs, Discord outreach
- [ ] Match times scheduled (e.g., daily at 12pm, 6pm, 10pm UTC)
- [ ] Referral rewards tracked and claimable

### Key Actions (Non-Code)

- Create content calendar for Twitter
- Draft Discord welcome message and rules
- Compile list of 100 potential early users
- Design social share cards
- Plan first tournament/event

---

## Phase 4: Monitoring & Ops

**Goal:** Operate confidently when real money is on the line

**Why Fourth:** Before going live, ensure you can see what's happening and respond to issues. "If you can't measure it, you can't fix it."

**Plans:** (created by /gsd:plan-phase)

Plans:
- [ ] TBD - Planned via /gsd:plan-phase 4

### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| OPS-01 | Replace console.log with structured logging (with log levels) | HIGH |
| OPS-02 | Set up error alerting (critical errors notify team) | HIGH |
| OPS-03 | Create basic metrics dashboard (active users, matches, volume) | MEDIUM |
| OPS-04 | Document incident response runbook | MEDIUM |
| OPS-05 | Test mainnet deployment scripts | HIGH |
| OPS-06 | Document backup and recovery procedures | MEDIUM |

### Success Criteria

- [ ] Logging uses structured format (JSON) with DEBUG/INFO/WARN/ERROR levels
- [ ] Critical errors (settlement failures, balance mismatches) trigger Slack/Discord alert
- [ ] Dashboard shows: DAU, matches/day, total volume, error rate
- [ ] Runbook covers: pause procedure, rollback steps, escalation contacts
- [ ] Mainnet deployment tested on devnet fork
- [ ] Backup procedure documented for: database, program state, configs

### Key Files

- `backend/src/index.ts` - Server entry, logging setup
- `backend/src/services/` - All services need structured logging
- Deployment scripts (to be created)

---

## Phase Dependencies

```
Phase 1 (Security) ──┐
                     ├──► Phase 3 (Launch) ──► MAINNET
Phase 2 (UX) ────────┘           │
                                 │
Phase 4 (Ops) ───────────────────┘
```

- **Phase 1 & 2** can run in parallel (different focus areas)
- **Phase 3** depends on 1 & 2 (need secure, polished product before users)
- **Phase 4** can run parallel to Phase 3 (ops setup while prepping launch)

---

## Post-v1 (Deferred)

After successful mainnet launch with initial users:

| Item | Trigger |
|------|---------|
| Professional Security Audit | After 30+ days stable operation, before scaling |
| Token/Airdrop | After product-market fit validated |
| Influencer Partnerships | After organic growth mechanics proven |
| New Game Modes | After core modes have retention |

---

## Progress Tracking

| Phase | Status | Plans | Completion |
|-------|--------|-------|------------|
| 1: Security | ✅ Complete | 7/7 plans | 100% |
| 2: UX | ○ Pending | 0/? | 0% |
| 3: Launch | ○ Pending | 0/? | 0% |
| 4: Ops | ○ Pending | 0/? | 0% |

---
*Roadmap created: 2026-01-21*
*Last updated: 2026-01-21 - Phase 1 Security Hardening COMPLETE*
