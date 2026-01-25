# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Players can confidently bet against each other on price predictions with fair, transparent, on-chain settlement.
**Current focus:** Phase 18: Polish — In Progress

## Current Position

Phase: 18 of 18 (Polish)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-25 — Completed 18-02-PLAN.md

Progress: [████████░░] v2.1: 80% | 8/10 plans

## Milestone Summary

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Mainnet Launch | 1-4 | 18 | Complete | 2026-01-22 |
| v1.1 Code & Security | 5-9 | 10 | Complete | 2026-01-23 |
| v2.0 Battles System | 10-14 | 27 | Complete | 2026-01-24 |
| v2.1 Arena Experience | 15-18 | 10 | In Progress | — |

**Total:** 18 phases, 65 plans (63 shipped, 2 planned)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Key v2.0 decisions:
- ELO K=32 new, K=16 established for matchmaking
- Wallet-gating for chat (PDA balance > 0)
- Satori + Sharp for server-side image generation
- Single elimination tournaments for v2.0

Key v2.1 decisions (15-01):
- 4 tabs for bottom nav: Arena, Watch, Fight, Profile
- 56px min-height touch targets (exceeds 44px accessibility requirement)
- Swipe threshold 50px horizontal, 100px max vertical deviation

Key v2.1 decisions (15-02):
- FightCardBattle type separate from existing Battle type (avoid conflicts)
- UFC-style fight card hierarchy: hero, live strip, main card, undercard
- Single-line className strings (Turbopack compatibility)
- Mock data for development (socket integration deferred)

Key v2.1 decisions (16-01):
- react-swipeable for gesture detection
- CSS scroll-snap for TikTok-style navigation
- 40vh/60vh chart/betting split for portrait mobile
- 60px pull threshold for refresh trigger
- 3-second delay before auto-advance on battle end

Key v2.1 decisions (16-02):
- Preset bet amounts: [0.01, 0.05, 0.1, 0.5] SOL per MOB-07
- Swipe direction: left = Fighter 1, right = Fighter 2
- Default bet amount: 0.1 SOL (middle of range)
- 8-second message fade in floating chat
- State machine pattern for bet flow (idle -> amount_selected -> confirming -> placing -> success/error)

Key v2.1 decisions (17-01):
- FloatingConnectPill at z-30 (below QuickBetStrip z-40)
- PostConnectFeedback at z-50 (above all UI for visibility)
- Just-connected detection via useRef tracking previous state

Key v2.1 decisions (17-02):
- Per-wallet localStorage keys for first bet tracking (prefix + pubkey)
- First-time users default to 0.05 SOL, returning users to 0.1 SOL
- Confetti triggers on state transition to 'success' via useRef previous state tracking

Key v2.1 decisions (17-03):
- First-bet gating in ProfileSetupWrapper (not ProfileContext) due to provider nesting
- 500ms delay after celebration dismisses for breathing room
- Username validation: 3-20 characters (minimum added)

Key v2.1 decisions (18-02):
- Button press pattern: active:scale-95 with transition-transform duration-150
- Changed active:bg-white/20 to hover:bg-white/20 (active used for scale)
- buttonPress keyframe added for programmatic triggering
- Non-active slides: opacity-80 scale-[0.98] for visual focus

### v2.1 Requirements Mapping

| Phase | Requirements | Count |
|-------|--------------|-------|
| 15. Core Structure | NAV-01 to NAV-05, HOME-01 to HOME-11 | 16 |
| 16. Watch Experience | MOB-01 to MOB-07 | 7 |
| 17. Onboarding | ONB-01 to ONB-08 | 8 |
| 18. Polish | POL-01 to POL-07 | 7 |

**Coverage:** 38/38 requirements mapped

### Blockers/Concerns

**For Mainnet (deferred to v2.2):**
- Multi-sig member keys needed — must be hardware wallets
- Redis deployment — Production must have REDIS_URL for replay protection

**Technical Debt:**
- Logger adoption partial (some console.log remains)
- Phase 14 socket events cast as 'any' (types not yet updated)
- Homepage socket integration pending (uses mock data currently)

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 18-02-PLAN.md (button press animations)
Resume file: None
Next: `/gsd:execute-phase 18-03` or `/gsd:verify-phase 18`

---
*State updated: 2026-01-25 after 18-02 execution complete*
