# Roadmap: Sol-Battles

## Milestones

- [x] **v1.0 Mainnet Launch** - Phases 1-4 (shipped 2026-01-22)
- [x] **v1.1 Code & Security Audit** - Phases 5-9 (shipped 2026-01-23)
- [x] **v2.0 Battles System** - Phases 10-14 (shipped 2026-01-24)

## Phases

<details>
<summary>v1.0 Mainnet Launch (Phases 1-4) - SHIPPED 2026-01-22</summary>

### Phase 1: Security Hardening
**Goal**: Eliminate race conditions and replay attacks
**Plans**: 4 plans (complete)

### Phase 2: UX Polish
**Goal**: Production-quality user experience
**Plans**: 5 plans (complete)

### Phase 3: Scheduled Matches
**Goal**: Solve cold-start player density problem
**Plans**: 3 plans (complete)

### Phase 4: Operations
**Goal**: Production monitoring and deployment automation
**Plans**: 6 plans (complete)

**Total v1.0:** 18 plans across 4 phases

</details>

<details>
<summary>v1.1 Code & Security Audit (Phases 5-9) - SHIPPED 2026-01-23</summary>

### Phase 5: Automated Analysis
**Goal**: Surface immediate issues using automated tools before manual review
**Plans**: 2 plans (complete)

### Phase 6: Smart Contract Audit
**Goal**: Document contract invariants and verify on-chain security
**Plans**: 2 plans (complete)

### Phase 7: Backend Security
**Goal**: Verify backend correctly uses on-chain guarantees
**Plans**: 2 plans (complete)

### Phase 8: Code Quality
**Goal**: Clean, readable codebase with tight types (informed by audit findings)
**Plans**: 2 plans (complete)

### Phase 9: Integration
**Goal**: Verify cross-cutting concerns and economic model correctness
**Plans**: 2 plans (complete)

**Total v1.1:** 10 plans across 5 phases

</details>

---

## v2.0 Battles System (In Progress)

**Milestone Goal:** Build the UFC of Crypto Trading - live 1v1 leveraged battles with spectator betting, social features, and tournament modes.

**Approach:** Audit existing code first, improve/extend where possible, only build from scratch if nothing exists.

**Phase Numbering:**
- Integer phases (10, 11, 12, 13, 14): Planned milestone work
- Decimal phases (e.g., 10.1): Urgent insertions if needed

- [x] **Phase 10: Battle Core** - Matchmaking, execution, and settlement engine
- [x] **Phase 11: Spectator Experience** - Live viewer and betting system
- [x] **Phase 12: Social & Engagement** - Chat and sharing for virality
- [x] **Phase 13: Fighter Identity** - Profiles and statistics
- [x] **Phase 14: Events & Competitions** - Fight cards and tournaments

---

## Phase Details

### Phase 10: Battle Core
**Goal**: Users can find opponents, execute leveraged trades, and receive instant payouts
**Depends on**: Phase 9 (v1.1 complete - clean, audited codebase)
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05, EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06, SETTLE-01, SETTLE-02, SETTLE-03, SETTLE-04
**Plans**: 7 plans (complete)

**Success Criteria** (what must be TRUE):
1. User can join matchmaking queue and get matched with similarly-skilled opponent within 60 seconds
2. User can create open challenge or direct challenge a specific wallet
3. Real-time PnL updates every price tick with liquidation distance indicator visible
4. Winner is automatically determined at battle end with instant on-chain payout (no claim step)
5. Battle history is logged and accessible for profiles/stats

Plans:
- [x] 10-01-PLAN.md — ELO rating system for skill-based matchmaking
- [x] 10-02-PLAN.md — Open challenges listing and direct wallet challenges
- [x] 10-03-PLAN.md — Battle history database and tie handling
- [x] 10-04-PLAN.md — Instant battle loss on total liquidation
- [x] 10-05-PLAN.md — Tug-of-war PnL visualization
- [x] 10-06-PLAN.md — Liquidation distance indicator
- [x] 10-07-PLAN.md — Challenge board UI

---

### Phase 11: Spectator Experience
**Goal**: Spectators can watch live battles and bet on outcomes with instant payouts
**Depends on**: Phase 10 (battles must exist to spectate)
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, BET-01, BET-02, BET-03, BET-04, BET-05, BET-06
**Plans**: 4 plans (complete)

**Success Criteria** (what must be TRUE):
1. Spectator sees both fighters' positions with real-time PnL delta visualization (tug-of-war)
2. Spectator can pick a fighter to back with one-tap betting from quick bet strip
3. Live odds update in real-time during battle showing pool split (A vs B)
4. Spectator receives instant payout when battle ends (no claim step)
5. Battle viewer is mobile-responsive and shows price chart overlay

**Already Implemented (from research):**
- BET-01: Fighter selection in BettingPanel
- BET-02: Live odds via `odds_update` WebSocket event
- BET-06: Instant payout via `settleBets()` -> `creditWinnings()`

Plans:
- [x] 11-01-PLAN.md — Fighter position cards with liquidation indicators (VIEW-01, VIEW-03)
- [x] 11-02-PLAN.md — Spectator tug-of-war PnL bar (VIEW-02)
- [x] 11-03-PLAN.md — Mobile-responsive layout with collapsible chart (VIEW-04, VIEW-05)
- [x] 11-04-PLAN.md — Quick bet strip, auto-accept odds, pool visualization (BET-03, BET-04, BET-05)

---

### Phase 12: Social & Engagement
**Goal**: Users can engage with battles through chat and share results for virality
**Depends on**: Phase 11 (spectator features provide engagement context)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, SHARE-01, SHARE-02, SHARE-03, SHARE-04
**Plans**: 5 plans (complete)

**Success Criteria** (what must be TRUE):
1. Spectators can chat in battle-specific rooms with emoji reactions
2. Chat is wallet-gated with rate limiting and basic moderation (mute/ban)
3. User can one-click share battle results to Twitter/X
4. Auto-generated battle result graphics and fighter profile cards are shareable
5. Battle clip/highlight generation available for key moments

**Note:** SHARE-03 (battle clips/highlights) deferred to future phase per research recommendation. Static image sharing prioritized for immediate value.

Plans:
- [x] 12-01-PLAN.md — Chat emoji reactions and wallet-gating (CHAT-02, CHAT-04)
- [x] 12-02-PLAN.md — Battle chat UI component with reactions
- [x] 12-03-PLAN.md — Server-side battle result graphics (SHARE-02)
- [x] 12-04-PLAN.md — Twitter Card integration with og:image (SHARE-01)
- [x] 12-05-PLAN.md — Fighter profile share cards (SHARE-04)

---

### Phase 13: Fighter Identity
**Goal**: Fighters have rich profiles that showcase their trading reputation
**Depends on**: Phase 10 (battles generate stats), Phase 12 (share cards reference profiles)
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08
**Plans**: 5 plans

**Success Criteria** (what must be TRUE):
1. Fighter profile displays win/loss record with ELO ranking and tier badge
2. Win streak, best streak, and recent form (last 5 battles) visible
3. ROI percentage and trading style stats (aggression, avg leverage) calculated
4. Favorite asset tracking shows fighter's preferred markets
5. Two fighters can be compared side-by-side in profile comparison view

Plans:
- [x] 13-01-PLAN.md — Backend fighter stats service and API endpoints
- [x] 13-02-PLAN.md — EloTierBadge and RecentFormIndicator components
- [x] 13-03-PLAN.md — Extended profile page with battle stats
- [x] 13-04-PLAN.md — Profile comparison view
- [x] 13-05-PLAN.md — Gap closure: Trading style and favorite assets display (PROF-05, PROF-06)

---

### Phase 14: Events & Competitions
**Goal**: Fighters can participate in scheduled events and tournaments
**Depends on**: Phase 13 (profiles needed for tournament display), Phase 10 (battle system for tournament rounds)
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, TOUR-01, TOUR-02, TOUR-03, TOUR-04, TOUR-05, TOUR-06

**Success Criteria** (what must be TRUE):
1. Main card structure with featured battles visible, with countdown timers for upcoming events
2. Users receive notifications when events they follow are starting
3. Single elimination bracket system supports 8-16 player tournaments
4. Prize pool calculated from entries with bracket visualization showing progression
5. Tournament leaderboard shows rankings across events

**Audit First:**
- Check existing scheduled match system from v1.0
- Check existing draft tournament bracket code in `draftTournamentManager.ts`
- Check notification infrastructure

**Plans**: 6 plans

Plans:
- [x] 14-01-PLAN.md — Event database and manager service (EVENT-01, EVENT-04)
- [x] 14-02-PLAN.md — Events calendar and countdown UI (EVENT-02, EVENT-05)
- [x] 14-03-PLAN.md — Event notifications (EVENT-03)
- [x] 14-04-PLAN.md — Tournament database and manager (TOUR-01, TOUR-02, TOUR-03, TOUR-06)
- [x] 14-05-PLAN.md — Tournament bracket visualization (TOUR-04)
- [x] 14-06-PLAN.md — Tournament leaderboard (TOUR-05)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 11 -> 12 -> 13 -> 14

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Security Hardening | v1.0 | 4/4 | Complete | 2026-01-22 |
| 2. UX Polish | v1.0 | 5/5 | Complete | 2026-01-22 |
| 3. Scheduled Matches | v1.0 | 3/3 | Complete | 2026-01-22 |
| 4. Operations | v1.0 | 6/6 | Complete | 2026-01-22 |
| 5. Automated Analysis | v1.1 | 2/2 | Complete | 2026-01-22 |
| 6. Smart Contract Audit | v1.1 | 2/2 | Complete | 2026-01-22 |
| 7. Backend Security | v1.1 | 2/2 | Complete | 2026-01-22 |
| 8. Code Quality | v1.1 | 2/2 | Complete | 2026-01-22 |
| 9. Integration | v1.1 | 2/2 | Complete | 2026-01-23 |
| 10. Battle Core | v2.0 | 7/7 | Complete | 2026-01-23 |
| 11. Spectator Experience | v2.0 | 4/4 | Complete | 2026-01-23 |
| 12. Social & Engagement | v2.0 | 5/5 | Complete | 2026-01-23 |
| 13. Fighter Identity | v2.0 | 5/5 | Complete | 2026-01-24 |
| 14. Events & Competitions | v2.0 | 6/6 | Complete | 2026-01-24 |

---

*Roadmap created: 2026-01-22*
*v1.1 phases: 5-9 (5 phases, 10 plans total)*
*v2.0 phases: 10-14 (5 phases, requirements mapped)*
*Last updated: 2026-01-24 after Phase 14 execution complete — v2.0 milestone shipped*
