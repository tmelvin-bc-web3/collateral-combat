# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-23)

**Core value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Current focus:** v2.0 Battles System

## Current Position

Phase: 14 - Events & Competitions
Plan: 06 of 6
Status: In progress
Last activity: 2026-01-24 - Completed 14-06-PLAN.md (Tournament Leaderboard)

Progress: [==========] Phase 10: 7/7 | Phase 11: 4/4 | Phase 12: 5/5 | Phase 13: 5/5 | Phase 14: 5/6

## v2.0 Milestone Overview

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 10 | Battle Core | 15 (MATCH, EXEC, SETTLE) | Complete |
| 11 | Spectator Experience | 11 (VIEW, BET) | Complete |
| 12 | Social & Engagement | 9 (CHAT, SHARE) | Complete |
| 13 | Fighter Identity | 8 (PROF) | Complete |
| 14 | Events & Competitions | 11 (EVENT, TOUR) | In Progress |

**Total:** 54 requirements across 5 phases

## Performance Metrics

**Velocity:**
- Total plans completed: 40 (18 v1.0 + 10 v1.1 + 12 v2.0)
- Average duration: ~25 min
- Total execution time: ~15.5 hours

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
| 11. Spectator Exp | 4 | ~10min | 2.5 min |

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
- [Phase 11.2]: Fighter 1/Fighter 2 labels for spectator neutrality (not You/Opponent)
- [Phase 11.2]: Spectator PnL bar uses same rope physics as participant view
- [Phase 11.1]: FighterPositionCard reuses LiquidationIndicator from Phase 10
- [Phase 11.1]: Compact mode prop for mobile optimization in position cards
- [Phase 11.3]: Chart collapsed by default on mobile, always visible on desktop (lg:)
- [Phase 11.3]: Safe-area padding (pb-20 lg:pb-0) reserves space for quick bet strip
- [Phase 11.3]: Mobile-first with flex-col lg:grid pattern for responsive layouts
- [Phase 11.4]: QuickBetStrip receives odds via props, not direct WebSocket subscription
- [Phase 11.4]: 5% threshold for auto-accept odds - smaller changes don't interrupt user
- [Phase 11.4]: lg:hidden for QuickBetStrip - only visible on mobile viewports
- [Phase 12.1]: Wallet-gating: Users must have PDA balance > 0 to chat or react
- [Phase 12.1]: 8 allowed emojis for reactions: fire, skull, rocket, money, clown, 100, cry, laugh
- [Phase 12.1]: Rate limits: 1 message per 3 seconds, 1 reaction per second
- [Phase 12.1]: Reaction limits: max 8 unique emojis per message, max 20 reactors per emoji
- [Phase 12.3]: Satori + Sharp for server-side image generation (no Canvas/Puppeteer)
- [Phase 12.3]: Inter font family for image typography
- [Phase 12.3]: 24h cache for battle images, 1h for profile images
- [Phase 12.5]: ProfileShareButton shows referral code only for own profile
- [Phase 12.5]: Next.js opengraph-image convention for automatic og:image generation
- [Phase 12.5]: Layout.tsx for metadata generation when page is client component
- [Phase 12.5]: Referral code generated as DEGEN + last 4 wallet chars
- [Phase 12.2]: ChatMessage component with hover-reveal emoji picker
- [Phase 12.2]: Client-side 3s rate limiting matches backend for immediate feedback
- [Phase 12.2]: canChat state tracks wallet-gating for disabled input display
- [Phase 12.4]: Next.js opengraph-image.tsx convention for Twitter Card og:image
- [Phase 12.4]: Edge runtime for fast og:image generation
- [Phase 12.4]: Referral code in share URL via ?ref=CODE query param
- [Phase 12.4]: Download fetches from backend /api/share/battle/:id/image
- [Phase 13.1]: Trading style derived from battle outcomes (aggression, leverage estimation)
- [Phase 13.1]: Default favorite assets SOL/ETH/BTC for new fighters
- [Phase 13.1]: Streak tracking: positive = win streak, negative = loss streak
- [Phase 13.1]: ROI calculation includes all battles with 2 decimal precision
- [Phase 13.2]: Tier colors match opengraph-image.tsx for visual consistency
- [Phase 13.2]: Protected tier shows 'NEW' label for new fighters
- [Phase 13.2]: RecentFormIndicator pads with empty slots when less than maxItems
- [Phase 13.3]: Battle Stats section only displays when user has battles
- [Phase 13.3]: Streak calculated client-side from form data
- [Phase 13.3]: ROI display with green/red coloring for positive/negative
- [Phase 13.4]: ComparisonStat rows highlight winner with green color and + indicator
- [Phase 13.4]: Fighter headers use accent (fighter1) and fire (fighter2) color schemes
- [Phase 13.4]: Compare button only visible when logged in viewing another's profile
- [Phase 13.4]: higherIsBetter parameter for flexible stat comparison
- [Phase 13.5]: Violet-500 color scheme for Trading Style card (matches battle theme)
- [Phase 13.5]: Amber-500 color scheme for Favorite Assets card (star/highlight theme)
- [Phase 13.5]: Cards only render when data is available (tradingStyle.totalPositions > 0, favoriteAssets.length > 0)
- [Phase 14.1]: Registration opens 24h before event, closes 30min before start
- [Phase 14.1]: Event start notifications sent 5 minutes before event
- [Phase 14.1]: EventManager ticker runs every 60 seconds for state checks
- [Phase 14.2]: Countdown timer uses absolute UTC timestamps, client calculates remaining time
- [Phase 14.2]: Socket events cast as 'any' for new event_update type (types not yet updated)
- [Phase 14.2]: Events grouped by date with locale-aware formatting
- [Phase 14.4]: Separate tournaments.db SQLite file for tournament isolation
- [Phase 14.4]: Standard bracket seeding (1v8, 4v5, 3v6, 2v7) for 8-player tournaments
- [Phase 14.4]: Twice-daily tournament scheduling at 12:00 and 20:00 UTC via cron
- [Phase 14.4]: Tournament GameMode added to balanceDatabase and balanceService
- [Phase 14.3]: Persistent notifications via notifyEventStarting() for offline retrieval
- [Phase 14.3]: Wallet-socket mapping in eventManager for targeted WebSocket delivery
- [Phase 14.3]: Event socket handlers (subscribe_events, join_event_room) for room-based updates
- [Phase 14.6]: Leaderboard UPSERT pattern for incremental stat updates after tournaments
- [Phase 14.6]: Sorting by earnings default, wins optional for tournament leaderboard

### Pending Todos

- Continue Phase 14 (Events & Competitions) - Plan 05 next

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

## Phase 11 Progress

| Plan | Name | Status |
|------|------|--------|
| 11-01 | Fighter Position Cards | Complete |
| 11-02 | Spectator PnL Bar | Complete |
| 11-03 | Mobile Responsiveness & Chart | Complete |
| 11-04 | Quick Bet Strip | Complete |

## Phase 12 Progress

| Plan | Name | Status |
|------|------|--------|
| 12-01 | Chat Reactions & Wallet-Gating | Complete |
| 12-02 | Battle Chat Panel | Complete |
| 12-03 | Server-Side Image Generation | Complete |
| 12-04 | Battle Result Sharing | Complete |
| 12-05 | Profile Sharing | Complete |

## Phase 13 Progress

| Plan | Name | Status |
|------|------|--------|
| 13-01 | Fighter Stats API | Complete |
| 13-02 | Visual Profile Components | Complete |
| 13-03 | Profile Page Integration | Complete |
| 13-04 | Profile Comparison View | Complete |
| 13-05 | Trading Style & Favorite Assets UI | Complete |

## Phase 14 Progress

| Plan | Name | Status |
|------|------|--------|
| 14-01 | Events API & Database | Complete |
| 14-02 | Events Calendar & Countdown | Complete |
| 14-03 | Event Notifications | Complete |
| 14-04 | Tournament System (Database & Manager) | Complete |
| 14-05 | Event Notification Enhancements | Pending |
| 14-06 | Tournament Leaderboard | Complete |

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 14-06-PLAN.md (Tournament Leaderboard)
Resume file: None
Next: Continue Phase 14 (14-05 Event Notification Enhancements)

---
*State updated: 2026-01-24 after completing 14-06-PLAN.md*
