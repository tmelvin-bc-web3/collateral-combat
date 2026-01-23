# Requirements: Sol-Battles v2.0 Battles System

**Defined:** 2026-01-23
**Core Value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Milestone Goal:** Build the UFC of Crypto Trading — live 1v1 leveraged battles with spectator betting

## v2.0 Requirements

Requirements for the Battles System milestone. Each maps to roadmap phases.

### Matchmaking

- [ ] **MATCH-01**: User can join matchmaking queue with stake amount
- [ ] **MATCH-02**: User can create open challenge visible to other users
- [ ] **MATCH-03**: User can direct challenge a specific wallet
- [ ] **MATCH-04**: System matches users by ELO tier (within +/- range)
- [ ] **MATCH-05**: New players get protected queue for first 10 battles

### Battle Execution

- [ ] **EXEC-01**: Real-time PnL tracking updates every price tick
- [ ] **EXEC-02**: User can select leverage (2x, 5x, 10x, 20x)
- [ ] **EXEC-03**: User can open/close positions during battle
- [ ] **EXEC-04**: Liquidation triggers instant battle loss
- [ ] **EXEC-05**: PnL delta bar shows who's currently ahead
- [ ] **EXEC-06**: Liquidation distance indicator shows margin remaining

### Settlement

- [ ] **SETTLE-01**: Winner automatically determined at battle end
- [ ] **SETTLE-02**: Instant on-chain payout (no claiming step)
- [ ] **SETTLE-03**: Battle history logged for profiles and stats
- [ ] **SETTLE-04**: Tie handling when price unchanged

### Spectator Viewer

- [ ] **VIEW-01**: Live battle display shows both fighters' positions
- [ ] **VIEW-02**: Real-time PnL delta visualization (tug-of-war)
- [ ] **VIEW-03**: Liquidation distance indicators for both fighters
- [ ] **VIEW-04**: Price chart overlay during battle
- [ ] **VIEW-05**: Mobile-responsive battle viewer layout

### Spectator Betting

- [ ] **BET-01**: User can pick a fighter to back during battle
- [ ] **BET-02**: Live odds update in real-time during battle
- [ ] **BET-03**: Quick bet strip for one-tap betting
- [ ] **BET-04**: Auto-accept small odds changes (<5%)
- [ ] **BET-05**: Pool visualization shows A vs B betting split
- [ ] **BET-06**: Instant payout to spectators on battle end

### Live Chat

- [ ] **CHAT-01**: Battle-specific chat room for spectators
- [ ] **CHAT-02**: Emoji reactions for key moments
- [ ] **CHAT-03**: Rate limiting for spam protection
- [ ] **CHAT-04**: Wallet-gating (must be connected to chat)
- [ ] **CHAT-05**: Basic moderation (mute/ban)

### Social Sharing

- [ ] **SHARE-01**: One-click share to Twitter/X
- [ ] **SHARE-02**: Auto-generated battle result graphics
- [ ] **SHARE-03**: Battle clip/highlight generation
- [ ] **SHARE-04**: Fighter profile share cards

### Fighter Profiles

- [ ] **PROF-01**: Win/loss record displayed
- [ ] **PROF-02**: ELO ranking with tier badge
- [ ] **PROF-03**: Win streak and best streak tracking
- [ ] **PROF-04**: ROI percentage calculation
- [ ] **PROF-05**: Trading style stats (aggression, avg leverage)
- [ ] **PROF-06**: Favorite asset tracking
- [ ] **PROF-07**: Recent form indicator (last 5 battles)
- [ ] **PROF-08**: Profile comparison view (vs another fighter)

### Fight Cards (Scheduled Events)

- [ ] **EVENT-01**: Main card structure with featured battles
- [ ] **EVENT-02**: Countdown timers for upcoming events
- [ ] **EVENT-03**: Notifications when events start
- [ ] **EVENT-04**: Event creation admin flow
- [ ] **EVENT-05**: Event calendar/schedule view

### Tournament Mode

- [ ] **TOUR-01**: Bracket system (single elimination)
- [ ] **TOUR-02**: Support 8-16 player tournaments
- [ ] **TOUR-03**: Prize pool calculated from entries
- [ ] **TOUR-04**: Bracket visualization with progression
- [ ] **TOUR-05**: Tournament leaderboard
- [ ] **TOUR-06**: Scheduled tournament times

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### v2.1 Enhancements

- **ADV-01**: Double elimination tournament format
- **ADV-02**: Swiss format for large tournaments
- **ADV-03**: Copy betting (follow successful bettors)
- **ADV-04**: Clan/team competitions
- **ADV-05**: Seasonal championships
- **ADV-06**: Professional broadcast overlay mode
- **ADV-07**: Multi-battle view for tournaments
- **ADV-08**: Commentary integration

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| House betting / liquidity pools | Undermines core PvP value prop |
| Partial liquidation mechanics | Adds complexity, instant loss is cleaner |
| Double/Swiss elimination | Focus on single elimination for v2.0 |
| Clone trading / auto-follow | Deferred to v2.1 |
| Team vs team battles | Deferred to v2.1 |
| Mobile native app | Web-first, mobile responsive is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MATCH-01 | Phase 10 | Pending |
| MATCH-02 | Phase 10 | Pending |
| MATCH-03 | Phase 10 | Pending |
| MATCH-04 | Phase 10 | Pending |
| MATCH-05 | Phase 10 | Pending |
| EXEC-01 | Phase 10 | Pending |
| EXEC-02 | Phase 10 | Pending |
| EXEC-03 | Phase 10 | Pending |
| EXEC-04 | Phase 10 | Pending |
| EXEC-05 | Phase 10 | Pending |
| EXEC-06 | Phase 10 | Pending |
| SETTLE-01 | Phase 10 | Pending |
| SETTLE-02 | Phase 10 | Pending |
| SETTLE-03 | Phase 10 | Pending |
| SETTLE-04 | Phase 10 | Pending |
| VIEW-01 | Phase 11 | Pending |
| VIEW-02 | Phase 11 | Pending |
| VIEW-03 | Phase 11 | Pending |
| VIEW-04 | Phase 11 | Pending |
| VIEW-05 | Phase 11 | Pending |
| BET-01 | Phase 11 | Pending |
| BET-02 | Phase 11 | Pending |
| BET-03 | Phase 11 | Pending |
| BET-04 | Phase 11 | Pending |
| BET-05 | Phase 11 | Pending |
| BET-06 | Phase 11 | Pending |
| CHAT-01 | Phase 12 | Pending |
| CHAT-02 | Phase 12 | Pending |
| CHAT-03 | Phase 12 | Pending |
| CHAT-04 | Phase 12 | Pending |
| CHAT-05 | Phase 12 | Pending |
| SHARE-01 | Phase 12 | Pending |
| SHARE-02 | Phase 12 | Pending |
| SHARE-03 | Phase 12 | Pending |
| SHARE-04 | Phase 12 | Pending |
| PROF-01 | Phase 13 | Pending |
| PROF-02 | Phase 13 | Pending |
| PROF-03 | Phase 13 | Pending |
| PROF-04 | Phase 13 | Pending |
| PROF-05 | Phase 13 | Pending |
| PROF-06 | Phase 13 | Pending |
| PROF-07 | Phase 13 | Pending |
| PROF-08 | Phase 13 | Pending |
| EVENT-01 | Phase 14 | Pending |
| EVENT-02 | Phase 14 | Pending |
| EVENT-03 | Phase 14 | Pending |
| EVENT-04 | Phase 14 | Pending |
| EVENT-05 | Phase 14 | Pending |
| TOUR-01 | Phase 14 | Pending |
| TOUR-02 | Phase 14 | Pending |
| TOUR-03 | Phase 14 | Pending |
| TOUR-04 | Phase 14 | Pending |
| TOUR-05 | Phase 14 | Pending |
| TOUR-06 | Phase 14 | Pending |

**Coverage:**
- v2.0 requirements: 54 total
- Mapped to phases: 54
- Unmapped: 0

---
*Requirements defined: 2026-01-23*
*Last updated: 2026-01-23 after roadmap creation - all requirements mapped*
