# Requirements: v2.1 Arena Experience

**Defined:** 2026-01-24
**Core Value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Milestone Focus:** Restructure the entire UX around "UFC of crypto trading" — battles and spectating are the main event.

## v2.1 Requirements

Requirements for Arena Experience milestone. Each maps to roadmap phases.

### Navigation (NAV)

- [x] **NAV-01**: Bottom tab bar with 4 tabs (Arena/Watch/Fight/Profile)
- [x] **NAV-02**: All touch targets minimum 44px for mobile accessibility
- [x] **NAV-03**: Mobile-first responsive navigation
- [x] **NAV-04**: Swipe gestures between navigation sections
- [x] **NAV-05**: Context-aware active states on navigation tabs

### Homepage (HOME)

- [x] **HOME-01**: Hero section with main event featuring countdown timer
- [x] **HOME-02**: Fighter face-off display in hero (avatars, names, stakes, leverage)
- [x] **HOME-03**: "Watch Live" and "Bet Now" CTAs in hero section
- [x] **HOME-04**: Live battles horizontal scroll strip below hero
- [x] **HOME-05**: Main card section showing next 3 featured upcoming battles
- [x] **HOME-06**: Undercard grid with all remaining upcoming battles
- [x] **HOME-07**: "Between Fights" section with side games (Oracle, Draft, LDS, Token Wars)
- [x] **HOME-08**: Spectator count displayed on battle cards (social proof)
- [x] **HOME-09**: "LIVE" status badges with pulse animation
- [x] **HOME-10**: Countdown timers on all upcoming battle cards
- [x] **HOME-11**: Empty state design when no battles are live or scheduled

### Mobile Experience (MOB)

- [x] **MOB-01**: Battle viewer fully functional on 375px screens
- [x] **MOB-02**: Bet buttons positioned in thumb zone (bottom area)
- [x] **MOB-03**: Collapsible chat overlay during spectating (doesn't cover bet actions)
- [x] **MOB-04**: Portrait-first design for all battle views
- [x] **MOB-05**: Vertical swipe navigation between live battles (TikTok-style)
- [x] **MOB-06**: Pull-to-refresh on battle lists
- [x] **MOB-07**: Quick bet strip with preset amounts (0.01, 0.05, 0.1, 0.5 SOL)

### Onboarding (ONB)

- [ ] **ONB-01**: Users can watch live battles without connecting wallet
- [ ] **ONB-02**: One-click wallet connect with Phantom prominently featured
- [ ] **ONB-03**: Plain language explanations for wallet connection ("Connect to bet. You control funds.")
- [ ] **ONB-04**: Guided first bet flow with preset amount suggestions
- [ ] **ONB-05**: Celebration animation on first successful bet
- [ ] **ONB-06**: Fighter identity creation prompt after first bet (name, optional avatar)
- [ ] **ONB-07**: Session key creation happens silently (no user-facing complexity)
- [ ] **ONB-08**: Post-connect balance display feedback ("Connected! Balance: X SOL")

### Polish & Feedback (POL)

- [ ] **POL-01**: Unambiguous win/loss full-screen feedback (celebration/commiseration)
- [ ] **POL-02**: Immediate balance updates with optimistic UI
- [ ] **POL-03**: Clear payout breakdown shown ("Bet: 0.5 | Won: 0.45 | New Balance: 2.95")
- [ ] **POL-04**: Micro-interactions on buttons (ripples, press animations)
- [ ] **POL-05**: Swipe animations between battles
- [ ] **POL-06**: Share prompt on bet wins
- [ ] **POL-07**: Sub-500ms state updates for live data (positions, odds, timer)

## Future Requirements

Deferred to later milestones. Not in v2.1 roadmap.

### Mainnet Launch (v2.2)
- Mainnet deployment — Deploy to Solana mainnet-beta
- Multi-sig authority transfer — Execute prepared scripts
- Redis production deployment — REDIS_URL for replay protection

### Growth Features (v2.2+)
- User acquisition campaigns — First 100 real users
- First bet insurance — Lose first bet, get it back
- Notification preferences — Push notification controls
- Sound design — Audio feedback for betting actions

### Advanced Features (v3.0+)
- Battle clip/highlight generation — Video sharing for virality
- Double elimination tournaments
- Copy betting (follow successful bettors)
- Clan/team competitions
- Seasonal championships

## Out of Scope

Explicitly excluded from v2.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Visual design system overhaul | v2.1 is IA/UX, not visual redesign |
| New game modes | Focus on restructuring existing features |
| Desktop-specific layouts | Mobile-first; desktop inherits responsive |
| Landscape battle viewer | Portrait-first per research |
| Tutorial/educational screens | Research says "show action, don't explain" |
| Notification system | Deferred to v2.2 (not critical for launch) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NAV-01 | Phase 15 | Complete |
| NAV-02 | Phase 15 | Complete |
| NAV-03 | Phase 15 | Complete |
| NAV-04 | Phase 15 | Complete |
| NAV-05 | Phase 15 | Complete |
| HOME-01 | Phase 15 | Complete |
| HOME-02 | Phase 15 | Complete |
| HOME-03 | Phase 15 | Complete |
| HOME-04 | Phase 15 | Complete |
| HOME-05 | Phase 15 | Complete |
| HOME-06 | Phase 15 | Complete |
| HOME-07 | Phase 15 | Complete |
| HOME-08 | Phase 15 | Complete |
| HOME-09 | Phase 15 | Complete |
| HOME-10 | Phase 15 | Complete |
| HOME-11 | Phase 15 | Complete |
| MOB-01 | Phase 16 | Pending |
| MOB-02 | Phase 16 | Pending |
| MOB-03 | Phase 16 | Pending |
| MOB-04 | Phase 16 | Pending |
| MOB-05 | Phase 16 | Pending |
| MOB-06 | Phase 16 | Pending |
| MOB-07 | Phase 16 | Pending |
| ONB-01 | Phase 17 | Pending |
| ONB-02 | Phase 17 | Pending |
| ONB-03 | Phase 17 | Pending |
| ONB-04 | Phase 17 | Pending |
| ONB-05 | Phase 17 | Pending |
| ONB-06 | Phase 17 | Pending |
| ONB-07 | Phase 17 | Pending |
| ONB-08 | Phase 17 | Pending |
| POL-01 | Phase 18 | Pending |
| POL-02 | Phase 18 | Pending |
| POL-03 | Phase 18 | Pending |
| POL-04 | Phase 18 | Pending |
| POL-05 | Phase 18 | Pending |
| POL-06 | Phase 18 | Pending |
| POL-07 | Phase 18 | Pending |

**Coverage:**
- v2.1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after roadmap creation — all requirements mapped*
