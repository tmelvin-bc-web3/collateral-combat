# Roadmap: Sol-Battles

## Milestones

- [x] **v1.0 Mainnet Launch** - Phases 1-4 (shipped 2026-01-22)
- [x] **v1.1 Code & Security Audit** - Phases 5-9 (shipped 2026-01-23)
- [ ] **v2.0 Battles System** - Phases 10-14 (in progress)

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

- [ ] **Phase 10: Battle Core** - Matchmaking, execution, and settlement engine
- [ ] **Phase 11: Spectator Experience** - Live viewer and betting system
- [ ] **Phase 12: Social & Engagement** - Chat and sharing for virality
- [ ] **Phase 13: Fighter Identity** - Profiles and statistics
- [ ] **Phase 14: Events & Competitions** - Fight cards and tournaments

---

## Phase Details

### Phase 10: Battle Core
**Goal**: Users can find opponents, execute leveraged trades, and receive instant payouts
**Depends on**: Phase 9 (v1.1 complete - clean, audited codebase)
**Requirements**: MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05, EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, EXEC-06, SETTLE-01, SETTLE-02, SETTLE-03, SETTLE-04
**Plans**: 7 plans

**Success Criteria** (what must be TRUE):
1. User can join matchmaking queue and get matched with similarly-skilled opponent within 60 seconds
2. User can create open challenge or direct challenge a specific wallet
3. Real-time PnL updates every price tick with liquidation distance indicator visible
4. Winner is automatically determined at battle end with instant on-chain payout (no claim step)
5. Battle history is logged and accessible for profiles/stats

Plans:
- [ ] 10-01-PLAN.md — ELO rating system for skill-based matchmaking
- [ ] 10-02-PLAN.md — Open challenges listing and direct wallet challenges
- [ ] 10-03-PLAN.md — Battle history database and tie handling
- [ ] 10-04-PLAN.md — Instant battle loss on total liquidation
- [ ] 10-05-PLAN.md — Tug-of-war PnL visualization
- [ ] 10-06-PLAN.md — Liquidation distance indicator
- [ ] 10-07-PLAN.md — Challenge board UI

---

### Phase 11: Spectator Experience
**Goal**: Spectators can watch live battles and bet on outcomes with instant payouts
**Depends on**: Phase 10 (battles must exist to spectate)
**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, BET-01, BET-02, BET-03, BET-04, BET-05, BET-06

**Success Criteria** (what must be TRUE):
1. Spectator sees both fighters' positions with real-time PnL delta visualization (tug-of-war)
2. Spectator can pick a fighter to back with one-tap betting from quick bet strip
3. Live odds update in real-time during battle showing pool split (A vs B)
4. Spectator receives instant payout when battle ends (no claim step)
5. Battle viewer is mobile-responsive and shows price chart overlay

**Audit First:**
- Check existing `spectatorService.ts` for betting infrastructure
- Check existing WebSocket events for odds updates
- Check existing viewer components in `/web/src/app/spectate/`

**Plans**: TBD (phase planning)

---

### Phase 12: Social & Engagement
**Goal**: Users can engage with battles through chat and share results for virality
**Depends on**: Phase 11 (spectator features provide engagement context)
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, SHARE-01, SHARE-02, SHARE-03, SHARE-04

**Success Criteria** (what must be TRUE):
1. Spectators can chat in battle-specific rooms with emoji reactions
2. Chat is wallet-gated with rate limiting and basic moderation (mute/ban)
3. User can one-click share battle results to Twitter/X
4. Auto-generated battle result graphics and fighter profile cards are shareable
5. Battle clip/highlight generation available for key moments

**Audit First:**
- Check if any chat infrastructure exists in backend
- Check existing share functionality in frontend
- Check for image generation capabilities

**Plans**: TBD (phase planning)

---

### Phase 13: Fighter Identity
**Goal**: Fighters have rich profiles that showcase their trading reputation
**Depends on**: Phase 10 (battles generate stats), Phase 12 (share cards reference profiles)
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08

**Success Criteria** (what must be TRUE):
1. Fighter profile displays win/loss record with ELO ranking and tier badge
2. Win streak, best streak, and recent form (last 5 battles) visible
3. ROI percentage and trading style stats (aggression, avg leverage) calculated
4. Favorite asset tracking shows fighter's preferred markets
5. Two fighters can be compared side-by-side in profile comparison view

**Audit First:**
- Check existing `progressionService.ts` for stats infrastructure
- Check existing profile pages in `/web/src/app/profile/`
- Check database schema for battle history

**Plans**: TBD (phase planning)

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

**Plans**: TBD (phase planning)

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
| 10. Battle Core | v2.0 | 0/7 | Ready | — |
| 11. Spectator Experience | v2.0 | 0/? | Pending | — |
| 12. Social & Engagement | v2.0 | 0/? | Pending | — |
| 13. Fighter Identity | v2.0 | 0/? | Pending | — |
| 14. Events & Competitions | v2.0 | 0/? | Pending | — |

---

*Roadmap created: 2026-01-22*
*v1.1 phases: 5-9 (5 phases, 10 plans total)*
*v2.0 phases: 10-14 (5 phases, requirements mapped)*
*Last updated: 2026-01-23 after Phase 10 planning*
