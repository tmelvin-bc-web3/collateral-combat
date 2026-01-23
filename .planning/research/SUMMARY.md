# Research Summary: v2.0 Battles System

**Research Date:** 2026-01-23
**Mode:** Quick research (spectator betting UX + trading battle patterns)
**Confidence:** HIGH

---

## Key Insights

### Spectator Betting UX

1. **One-tap betting is table stakes** — Users expect 1-2 taps from seeing odds to confirmed bet. Quick bet strips anchored at screen bottom are the standard.

2. **Auto-accept small odds changes** — For 5-minute battles, auto-accept odds changes <5% to prevent frustrating bet rejections.

3. **Instant settlement is your advantage** — Solana's ~400ms finality means payouts in seconds (vs hours for traditional sportsbooks).

4. **Social proof drives engagement** — Live bet feeds, pool visualizations, and "high roller" activity transform betting from solitary to social.

### Trading Battle Patterns

1. **PnL Delta visualization is critical** — A simple tug-of-war bar showing who's ahead makes battles 10x more watchable.

2. **Liquidation distance creates drama** — Spectators seeing who's in danger adds tension. Visual warning when fighters approach liquidation.

3. **ELO-based matchmaking works** — Standard formula (K=32 new, K=16 established), tier-based matching, protected new player queues.

4. **5-minute battles favor partial liquidation** — Full liquidation = instant loss is too punishing. Recommend position size reduction as margin deteriorates.

---

## Recommendations by Priority Area

| Area | Key Pattern | Implementation |
|------|-------------|----------------|
| Matchmaking | ELO + tier gates | Bronze/Silver/Gold/Plat/Diamond tiers |
| Execution | PnL delta bar | Visual tug-of-war between fighters |
| Settlement | Instant on-chain | Smart contract pays winners in seconds |
| Spectator Viewer | Esports overlay | Liquidation distance, position timeline |
| Spectator Betting | Quick bet strip | Bottom-anchored, one-tap confirm |
| Live Chat | Rate-limited | Wallet-gated, emoji reactions |
| Social Sharing | Auto-graphics | Result cards, clip generation |
| Fighter Profiles | Poker HUD style | W/L, streak, aggression, favorite asset |
| Fight Cards | Scheduled events | Fixed times, countdowns, notifications |
| Tournaments | Single elimination | 8-16 players, 30-60 min, winner takes 85% |

---

## Technical Needs Identified

**WebSocket events:**
- `battle:odds_update` — New odds for both fighters
- `battle:bet_placed` — Activity feed (anonymizable)
- `battle:position_update` — Fighter PnL changes
- `battle:settled` — Final result + payouts

**State to track:**
- Current odds per fighter
- User's active bets on battle
- Pool breakdown (Fighter A vs B %)
- Liquidation distance per fighter
- ELO ratings and tiers

---

## Sources

See detailed sources in:
- `.planning/research/SPECTATOR-BETTING-UX.md`
- `.planning/research/TRADING-BATTLE-PATTERNS.md`

---
*Research complete — ready for requirements*
