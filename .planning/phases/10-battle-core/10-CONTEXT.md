# Phase 10: Battle Core - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can find opponents through matchmaking queue or challenges, execute leveraged trades in real-time 1v1 battles, and receive instant on-chain payouts. This phase covers the core battle loop: find opponent → trade → settle.

Spectator features, chat, sharing, profiles, and tournaments are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Matchmaking Flow
- **Background queue** — User joins queue and can browse other pages while searching; gets notified when matched
- Challenge visibility: **Both** dedicated challenge board page AND quick-preview sidebar on battle page
- Challenges filterable by stake amount and ELO tier
- **Ready check** — Both players confirm ready before battle starts, then redirect to battle screen

### Battle Interface
- PnL display: **Tug-of-war bar** — Visual bar showing who's ahead, with numbers secondary
- Trading controls: **Advanced order form** — Size, leverage, limit orders, stop-loss
- Must show both fighters' current positions and PnL
- Liquidation distance indicator visible for both fighters

### Position Mechanics
- **Multiple positions allowed** — Fighter can have several positions open at once
- **Full close only** — No partial position closes; must close entire position
- Liquidation behavior: **Capital reduction** — Liquidated position loses its capital, battle continues with remainder
- **Zero capital = instant loss** — If a fighter loses ALL capital through liquidations, battle ends and they lose

### Settlement Experience
- Payout confirmation: **Both** — Show in results screen with tx link AND toast notification
- Post-battle: **Rematch button prominent** as primary CTA
- Instant on-chain payout (no claim step)

### Claude's Discretion
- Queue waiting experience (toast vs floating widget)
- Battle screen layout (chart-dominant vs split view vs fighter-focused)
- Timer display style (countdown vs progress bar vs both)
- Result display (full-screen celebration vs modal vs inline)
- Audio (full sounds vs minimal vs none)

</decisions>

<specifics>
## Specific Ideas

- "UFC of Crypto Trading" — battles should feel like a competitive fight, not just trading
- Research found tug-of-war bar makes battles 10x more watchable
- Background queue pattern from research: user shouldn't be stuck waiting
- Ready check prevents one player being AFK when battle starts

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

All spectator, social, profile, and tournament features are already mapped to Phases 11-14.

</deferred>

---

*Phase: 10-battle-core*
*Context gathered: 2026-01-23*
