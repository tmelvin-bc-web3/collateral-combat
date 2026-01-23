# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Current focus:** v2.0 Battles System

## Current Position

Phase: 10 - Battle Core
Plan: 07 of 7 (Challenge Board UI)
Status: Complete
Last activity: 2026-01-23 - Completed 10-07-PLAN.md (Challenge Board UI)

Progress: [==========] Phase 10: 7/7 plans complete

## v2.0 Milestone Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 10 | Battle Core | 15 (MATCH, EXEC, SETTLE) | Complete |
| 11 | Spectator Experience | 11 (VIEW, BET) | Pending |
| 12 | Social & Engagement | 9 (CHAT, SHARE) | Pending |
| 13 | Fighter Identity | 8 (PROF) | Pending |
| 14 | Events & Competitions | 11 (EVENT, TOUR) | Pending |

**Total:** 54 requirements across 5 phases

## Performance Metrics

**Velocity:**
- Total plans completed: 35 (18 v1.0 + 10 v1.1 + 7 v2.0)
- Average duration: ~30 min
- Total execution time: ~15.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Security (v1.0) | 4 | ~3h | 45 min |
| 2. UX (v1.0) | 5 | ~4h | 48 min |
| 3. Scheduling (v1.0) | 3 | ~2h | 40 min |
| 4. Operations (v1.0) | 6 | ~4.5h | 45 min |
| 5. Automated Analysis | 2 | ~17min | 8.5 min |
| 6. Contract Audit | 2 | ~25min | 12.5 min |
| 7. Backend Security | 2 | ~40min | 20 min |
| 8. Code Quality | 2 | ~11min | 5.5 min |
| 9. Integration | 2 | ~10min | 5 min |
| 10. Battle Core | 7 | ~65min | 9 min |

**v1.1 complete:** All 10 plans across 5 phases executed

## Accumulated Context

### Decisions

Decisions logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.0]: Atomic Redis SET NX EX for replay protection
- [v1.0]: verifyAndLockBalance pattern for balance race prevention
- [v1.1]: Audit order: automated -> contract -> backend -> cleanup -> integration
- [Phase 5.1]: Accepted bigint-buffer HIGH vulnerability (Solana dependency, no fix available)
- [Phase 5.1]: Accepted h3 HIGH vulnerability temporarily (appears fixed, verifying)
- [Phase 5.1]: Zero secrets found in 305 commits of git history
- [Phase 5.2]: Type coverage baselines set at 97.50% web, 90.67% backend to prevent regression
- [Phase 5.2]: WIP features (LDS, Token Wars, Draft, Referrals) documented in knip.json ignore list
- [Phase 5]: All 4 CI jobs (dependency-audit, secret-scanning, dead-code, type-coverage) block PRs
- [Phase 6.2]: Round state machine verified - no invalid transitions possible
- [Phase 6.2]: Double claim prevention confirmed (claimed flag at line 869, set before credit at line 887)
- [Phase 6.2]: Pyth oracle integration secure in both lock paths
- [Phase 6.2]: 60s staleness threshold is conservative (Pyth updates ~400ms)
- [Phase 6.1]: All 21 instructions pass signer checks - no missing signer vulnerabilities
- [Phase 6.1]: Session keys CANNOT withdraw or transfer authority - isolation verified
- [Phase 6.1]: init_if_needed on UserBalance is safe (PDA seeds + discriminator)
- [Phase 6.1]: 15 contract invariants documented for backend consumption
- [Phase 7.1]: Input validation at handler level - TypeScript types don't validate at runtime
- [Phase 7.1]: Replay cache Redis support verified already implemented correctly
- [Phase 7.2]: All 8 TOCTOU race conditions fixed via verifyAndLockBalance atomic pattern
- [Phase 7.2]: Error handling safe - no stack traces or SQL errors exposed to clients
- [Phase 7.2]: Partial failure handling verified - rollback/recovery implemented
- [Phase 8.1]: Fee constants centralized to backend/src/utils/fees.ts (PLATFORM_FEE_BPS=500, DRAFT_FEE_BPS=1000)
- [Phase 8.1]: Removed legacy WHITELISTED_TOKENS/TOKEN_BY_SYMBOL aliases - use TRADABLE_ASSETS/ASSET_BY_SYMBOL
- [Phase 8.2]: Zod runtime validation for battle configs (entryFee, duration, mode, maxPlayers)
- [Phase 8.2]: Database row interfaces defined for all progressionDatabase mappers
- [Phase 8.2]: toApiError adopted in 4 key money-handling services
- [Phase 9.2]: Multi-sig: 2-of-3 threshold using Squads Protocol v4
- [Phase 9.2]: Immutable configAuthority (configAuthority=null) for maximum security
- [Phase 9.2]: Security audit: CONDITIONAL PASS - 0 unresolved critical/high
- [Phase 10.2]: Direct challenges via targetWallet field - simple schema extension
- [Phase 10.2]: Challenges room for WebSocket broadcasts (socket.io rooms pattern)
- [Phase 10.4]: Total capital = balance + margin in positions + unrealized PnL
- [Phase 10.4]: Instant loss triggers when total capital <= 0 after liquidation
- [Phase 10.4]: endBattle respects pre-set finalPnl/ranks from liquidation handler
- [Phase 10.1]: ELO K-factors: K=32 new (<30 battles), K=16 established
- [Phase 10.1]: Protected tier threshold: 10 battles for matchmaking isolation
- [Phase 10.1]: ELO tiers: bronze<1000, silver<1500, gold<2000, platinum<2500, diamond>=2500
- [Phase 10.3]: Tie threshold < 0.01% PnL difference - prevents micro-differences from determining winner
- [Phase 10.3]: Tie payout refunds entry fee - fair to both, no platform rake on ties
- [Phase 10.3]: Battle history in separate SQLite database - follows progressionDatabase pattern
- [Phase 10.5]: Rope position = 50% + (delta * 2), clamped to prevent off-screen
- [Phase 10.5]: Danger zones at 20% (opponent losing) and 80% (user losing) positions
- [Phase 10.5]: Spring animation via cubic-bezier(0.34, 1.56, 0.64, 1) for natural rope feel
- [Phase 10.6]: Liquidation distance color thresholds: < 2% critical, 2-5% warning, 5-10% caution, > 10% safe
- [Phase 10.6]: Inverse progress bar fills as liquidation approaches (more danger = more filled)
- [Phase 10.7]: Challenge acceptance via WebSocket `accept_challenge` event with battle creation
- [Phase 10.7]: useChallenges hook provides fetchChallenges, createChallenge, acceptChallenge
- [Phase 10.7]: /battle?challenge=CODE URL param triggers challenge acceptance flow
- [Phase 10.7]: createBattleFromChallenge method composes existing addPlayerToBattle logic

### Pending Todos

- Start Phase 11 (Spectator Experience)

### Blockers/Concerns

**For Mainnet Deployment:**
- [Phase 9.2]: Multi-sig member keys needed - must be hardware wallets
- [Phase 9.2]: Execute multi-sig setup and authority transfer scripts
- [Phase 7.2]: Redis deployment - Production must have REDIS_URL set for replay protection

**Technical Debt (Post-Mainnet):**
- [v1.0]: Logger adoption partial (some console.log remains)
- [v1.0]: Error boundary coverage limited to predict/battle pages
- [Phase 5.1]: bigint-buffer vulnerability requires quarterly review
- [Phase 5.2]: WIP features need decision - complete or remove?
- [Phase 8.2]: Backend type coverage at 91.42% (target was 93%+)

## v1.1 Deliverables

### Security Audit Results

- **Overall:** CONDITIONAL PASS
- **Findings:** 34 total (26 resolved, 6 accepted, 2 in-progress)
- **Report:** docs/SECURITY-AUDIT-REPORT.md

### Multi-Sig Authority

- **Scripts:** scripts/setup-multisig.ts, scripts/transfer-authority-to-multisig.ts
- **Documentation:** docs/MULTISIG-SETUP.md
- **Status:** Ready to execute with member keys

### CI/CD Security

- **Workflows:** .github/workflows/automated-analysis.yml
- **Jobs:** dependency-audit, secret-scanning, dead-code, type-coverage
- **Status:** All jobs block PRs on failure

## v2.0 Approach

**Audit-first methodology:**
1. Search codebase for existing implementations
2. Check for partial implementations to finish
3. Look for related code to extend
4. Fix/improve rather than rebuild

**Existing infrastructure to leverage:**
- `battleManager.ts` - Battle logic exists
- `spectatorService.ts` - Spectator wagering exists
- `progressionService.ts` - Stats/XP infrastructure exists
- `draftTournamentManager.ts` - Tournament bracket patterns exist
- Profile pages exist at `/web/src/app/profile/`

## Phase 10 Progress

| Plan | Name | Status |
|------|------|--------|
| 10-01 | ELO Rating System | Complete |
| 10-02 | Challenge Board API | Complete |
| 10-03 | Battle History | Complete |
| 10-04 | Instant Loss Detection | Complete |
| 10-05 | PnL Comparison Bar Tug-of-War | Complete |
| 10-06 | Liquidation Distance Indicator | Complete |
| 10-07 | Challenge Board UI | Complete |

## Session Continuity

Last session: 2026-01-23 22:15 UTC
Stopped at: Completed Phase 10 - Battle Core (all 7 plans)
Resume file: None
Next: Plan and execute Phase 11 (Spectator Experience)

---
*State updated: 2026-01-23 after completing Phase 10*
