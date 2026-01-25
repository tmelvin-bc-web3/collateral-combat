# Roadmap: Sol-Battles

## Milestones

- ✅ **v1.0 Mainnet Launch** - Phases 1-4 (shipped 2026-01-22)
- ✅ **v1.1 Code & Security Audit** - Phases 5-9 (shipped 2026-01-23)
- ✅ **v2.0 Battles System** - Phases 10-14 (shipped 2026-01-24)
- 🚧 **v2.1 Arena Experience** - Phases 15-18 (in progress)

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

<details>
<summary>v2.0 Battles System (Phases 10-14) - SHIPPED 2026-01-24</summary>

### Phase 10: Battle Core
**Goal**: Users can find opponents, execute leveraged trades, and receive instant payouts
**Plans**: 7 plans (complete)

### Phase 11: Spectator Experience
**Goal**: Spectators can watch live battles and bet on outcomes with instant payouts
**Plans**: 4 plans (complete)

### Phase 12: Social & Engagement
**Goal**: Users can engage with battles through chat and share results for virality
**Plans**: 5 plans (complete)

### Phase 13: Fighter Identity
**Goal**: Fighters have rich profiles that showcase their trading reputation
**Plans**: 5 plans (complete)

### Phase 14: Events & Competitions
**Goal**: Fighters can participate in scheduled events and tournaments
**Plans**: 6 plans (complete)

**Total v2.0:** 27 plans across 5 phases

</details>

---

## v2.1 Arena Experience (In Progress)

**Milestone Goal:** Restructure the entire UX around "UFC of crypto trading" — battles and spectating are the main event, everything else supports that.

**Approach:** Mobile-first UX/IA overhaul with fight card hierarchy, bottom navigation, streamlined onboarding, and polished feedback.

**Phase Numbering:**
- Integer phases (15, 16, 17, 18): Planned milestone work
- Decimal phases (e.g., 15.1): Urgent insertions if needed

- [x] **Phase 15: Core Structure** - Fight card homepage and bottom navigation foundation
- [x] **Phase 16: Watch Experience** - Mobile-optimized battle viewing and betting
- [x] **Phase 17: Onboarding** - Frictionless wallet connect and guided first bet
- [ ] **Phase 18: Polish** - Micro-interactions and win/loss feedback

---

## Phase Details

### Phase 15: Core Structure
**Goal**: Users navigate via bottom tabs and see battles organized as a fight card with main events, live battles, and upcoming fights
**Depends on**: Phase 14 (v2.0 complete)
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, HOME-06, HOME-07, HOME-08, HOME-09, HOME-10, HOME-11
**Success Criteria** (what must be TRUE):
  1. User sees bottom navigation bar with 4 tabs (Arena/Watch/Fight/Profile) on mobile
  2. User taps any nav tab and navigates to that section without page reload
  3. Homepage displays hero section with main event countdown and fighter face-off
  4. User scrolls horizontally through live battles strip below hero
  5. Homepage shows "Between Fights" section with side games (Oracle, Draft, LDS, Token Wars)
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md — Bottom navigation with 4 tabs, swipe gestures, 44px touch targets
- [x] 15-02-PLAN.md — Fight card homepage with hero, live strip, main/undercard, between fights

---

### Phase 16: Watch Experience
**Goal**: Users can spectate and bet on battles comfortably on mobile devices with thumb-friendly controls
**Depends on**: Phase 15
**Requirements**: MOB-01, MOB-02, MOB-03, MOB-04, MOB-05, MOB-06, MOB-07
**Success Criteria** (what must be TRUE):
  1. Battle viewer displays fully functional on 375px screen width
  2. User places bets using quick bet strip in thumb zone (bottom area of screen)
  3. User swipes vertically to navigate between live battles (TikTok-style)
  4. Chat overlay collapses without covering bet action buttons
  5. User pulls down to refresh battle lists
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md — TikTok-style battle feed with vertical swipe navigation and 40/60 layout
- [x] 16-02-PLAN.md — Quick bet strip with swipe-to-bet and floating chat overlay

---

### Phase 17: Onboarding
**Goal**: New users can watch battles without wallet, connect with one click, and complete their first bet with minimal friction
**Depends on**: Phase 16
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06, ONB-07, ONB-08
**Success Criteria** (what must be TRUE):
  1. User watches live battles without connecting wallet
  2. User connects wallet with one click (all wallets shown equally)
  3. User sees plain language explanation during wallet connect ("Connect to bet. Your funds stay in your wallet until you wager.")
  4. User completes first bet using guided flow with preset amounts (0.05 SOL default)
  5. User creates fighter identity (name) after placing first bet
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md — Anonymous spectating, floating connect pill, post-connect balance feedback
- [x] 17-02-PLAN.md — First bet detection, celebration animation, preset defaults
- [x] 17-03-PLAN.md — Profile setup trigger after first bet, updated messaging

---

### Phase 18: Polish
**Goal**: Users receive clear, satisfying feedback for all betting outcomes with smooth animations throughout
**Depends on**: Phase 17
**Requirements**: POL-01, POL-02, POL-03, POL-04, POL-05, POL-06, POL-07
**Success Criteria** (what must be TRUE):
  1. User sees contained celebration on bet win (unambiguous feedback)
  2. User sees immediate balance update after bet settles (optimistic UI)
  3. User sees clear payout breakdown ("Bet: 0.5 | Won: 0.45 | New Balance: 2.95")
  4. Buttons respond with micro-interactions (scale press animations)
  5. Live data updates within 500ms (positions, odds, timer)
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md — Win/loss feedback (WinModal, LossFlash, PayoutBreakdown) and useBetFeedback hook
- [x] 18-02-PLAN.md — Button micro-interactions (active:scale-95) and swipe animations
- [x] 18-03-PLAN.md — Live data animations (CountingNumber, DeltaBadge, UrgentTimer) with react-countup
- [ ] 18-04-PLAN.md — Gap closure: Real balance integration replacing mock balance (POL-02)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 15 -> 16 -> 17 -> 18

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
| 15. Core Structure | v2.1 | 2/2 | Complete | 2026-01-24 |
| 16. Watch Experience | v2.1 | 2/2 | Complete | 2026-01-25 |
| 17. Onboarding | v2.1 | 3/3 | Complete | 2026-01-25 |
| 18. Polish | v2.1 | 3/4 | Gap Closure | - |

---

*Roadmap created: 2026-01-22*
*v1.0: Phases 1-4 (18 plans)*
*v1.1: Phases 5-9 (10 plans)*
*v2.0: Phases 10-14 (27 plans)*
*v2.1: Phases 15-18 (11 plans)*
*Last updated: 2026-01-25 after gap closure plan created for Phase 18*
