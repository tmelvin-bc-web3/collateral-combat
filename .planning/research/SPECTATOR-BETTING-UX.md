# Spectator Betting UX Patterns

**Research Date:** 2026-01-23
**Focus:** Live betting UX for DegenDome spectator battles
**Confidence:** HIGH (multiple authoritative sources agree on patterns)

---

## Key Findings

1. **Bet slip stability is critical**: When odds update mid-selection, the bet slip must NOT reset or shift. Users abandon bets when they lose trust in slip behavior. Protect in-progress selections even as markets move.

2. **One-tap betting is table stakes**: Users expect 1-2 taps from seeing odds to confirmed bet. Quick bet slips anchored at screen bottom (visible while scrolling markets) dramatically reduce friction.

3. **Social proof drives engagement**: Activity feeds showing live bets, "high rollers" lists, and copy-bet features transform betting from solitary to social. Stake.com's real-time bet feed showing user/odds/amount is highly effective.

---

## Live Odds Patterns

### Visual Updates Without Disruption

**Flash indicators, not full refreshes:**
- Green/red arrows flash momentarily when odds move (Stake.com pattern)
- Color-coded probability shifts (Polymarket uses color for bullish/bearish)
- Avoid full-screen refreshes that reset user scroll position

**Anti-pattern to avoid:**
- "Reflow" where on-screen elements shift position during updates
- Forced auto-scrolling or full market refreshes
- Odds that disappear/reappear causing hesitation

**For DegenDome:**
```
Battle Position Display:
┌─────────────────────────────────────┐
│  Fighter A: +$450 (+12.3%)          │ ← Green pulse on positive change
│  Fighter B: -$120 (-3.2%)           │ ← Red pulse on negative change
│                                     │
│  Odds: A 65% → 68% ↑                │ ← Arrow + percentage shift
└─────────────────────────────────────┘
```

### Order Book Style (Polymarket Pattern)

Polymarket uses order book visualization:
- Buy/sell prices listed by price level
- Prices = probabilities (20 cents = 20% chance)
- Users can see market depth and momentum

**For DegenDome consideration:**
- Show betting volume on each fighter
- Display odds movement history (mini sparkline)
- "Smart money" indicators (large bets shifting odds)

---

## Viewing + Betting UX

### The Quick Bet Slip Pattern

**Positioning:**
- Anchored at bottom of screen (always visible)
- Does NOT cover the live action
- Collapses to minimal state, expands on tap

**One-tap flow:**
1. Tap fighter to select
2. Pre-set stake amount auto-fills (user configures default)
3. Single tap to confirm OR swipe to adjust amount
4. Instant confirmation overlay (doesn't navigate away)

**Best practice from FanDuel/DraftKings:**
```
┌─────────────────────────────────────┐
│                                     │
│        [LIVE BATTLE VIEW]           │
│                                     │
│    Fighter A: +$230                 │
│    Fighter B: -$180                 │
│                                     │
├─────────────────────────────────────┤
│ Quick Bet: [Fighter A] [$50] [BET]  │ ← Persistent, minimal height
└─────────────────────────────────────┘
```

### Auto-Accept Odds Changes

Critical for fast-paced events:
- Toggle: "Auto-accept odds changes within X%"
- Prevents market suspensions killing bet placement
- MyBookie cited as having "barely any market suspensions" due to this

**For 5-minute battles:**
- Auto-accept should be ON by default (with clear disclosure)
- Only reject if odds swing >10% between tap and confirmation
- Show brief "Odds changed: [old] → [new]" notification

### Dedicated Live Section

Symphony Solutions recommends: "Put all live betting features in a separate section—the live-betting area where in-play markets and relevant data are easily accessible."

**For DegenDome:**
- `/battles/live` - All active battles with spectator betting
- Battle detail view = streaming + betting integrated
- Don't force users to navigate between watching and betting

---

## Settlement Patterns

### Smart Contract Instant Settlement

From crypto betting research:
- "Match ends, data confirms result, blockchain releases payouts instantly"
- "No operator input, no disputes"
- Smart contracts eliminate processing delays

**Solana advantages:**
- ~400ms finality
- Sub-cent transaction fees
- Can settle immediately on battle end

**Settlement flow for DegenDome:**
```
1. Battle ends (5-minute timer or one fighter liquidated)
2. Final P&L calculated from Pyth price feed
3. Winner determined programmatically
4. Smart contract distributes pool to winning bettors
5. Funds appear in wallet within seconds
```

### Payout UX

**Instant feedback matters:**
- Show "SETTLED" badge immediately on battle end
- Display winnings with celebration animation
- Auto-update wallet balance (no refresh needed)

**From Stake.com:**
- Crypto withdrawals processed 1-3 hours average
- For on-chain settlement, this should be SECONDS
- DegenDome advantage: true instant settlement vs. traditional sites

---

## Social Proof Patterns

### Live Activity Feed

**Stake.com pattern (highly effective):**
```
Live Bets:
├── @degen_whale bet $500 on Fighter A (2s ago)
├── @sol_maxi bet $50 on Fighter B (5s ago)
├── @anon bet $200 on Fighter A (8s ago)
└── [View all activity]
```

**Features to include:**
- Real-time bet stream (WebSocket powered)
- "High rollers" filter option
- Optional anonymity (hide username toggle)

### Betting Volume Display

Show aggregate betting sentiment:
```
Total Pool: $12,450
├── Fighter A: $8,200 (65.9%)
├── Fighter B: $4,250 (34.1%)
```

This creates:
- FOMO when volume is high
- Confidence when betting with majority
- Contrarian opportunity when betting against

### Copy Betting (Future Feature)

From ReBet/BettorEdge:
- Follow successful bettors
- One-tap copy their picks at your stake
- Leaderboards showing top performers

**For DegenDome v2:**
- Track spectator betting W/L record
- "Follow" top bettors
- Notifications when followed users bet

---

## Recommendations for DegenDome

### Priority 1: Core Betting UX

1. **Quick bet strip** at bottom of battle view
   - Fighter selection + preset amounts + one-tap confirm
   - Never covers the live P&L display

2. **Stable odds display**
   - Flash color on change, don't reposition elements
   - Show direction arrows (↑↓) with percentage

3. **Auto-accept small changes**
   - Default ON for <5% odds movement
   - Clear toast when odds were auto-adjusted

### Priority 2: Settlement

1. **Instant on-chain settlement**
   - Smart contract pays winners within seconds of battle end
   - No manual claiming required—direct to wallet

2. **Settlement confirmation**
   - "You won X SOL!" celebration modal
   - Link to view transaction on explorer

### Priority 3: Social Proof

1. **Live bet ticker**
   - Show recent bets scrolling in header or sidebar
   - Username (or "anon") + fighter + amount

2. **Pool visualization**
   - Bar showing A vs B betting split
   - Total pool size prominently displayed

3. **Battle chat** (if not already planned)
   - Real-time comments during battle
   - Emoji reactions for key moments

### Mobile-Specific

1. **Bottom sheet bet slip** (iOS/Android pattern)
   - Swipe up to expand, swipe down to minimize
   - Thumb-reachable confirm button

2. **Haptic feedback**
   - Vibrate on successful bet placement
   - Vibrate on battle end / settlement

3. **Landscape support**
   - For serious viewers who want more chart space
   - Bet slip as side panel in landscape

### Technical Implementation Notes

**WebSocket events needed:**
- `battle:odds_update` - New odds for both fighters
- `battle:bet_placed` - For activity feed (can anonymize)
- `battle:position_update` - Fighter P&L changes
- `battle:settled` - Final result + payouts

**State to track:**
- Current odds per fighter
- User's active bets on this battle
- Total pool breakdown
- Recent activity feed (last 20 bets)

---

## Sources

### Live Betting UX
- [Altenar: Sportsbook UX Design for Live Play](https://altenar.com/blog/how-to-design-a-sportsbook-user-experience-ux-that-wins-in-live-play/)
- [Symphony Solutions: Sportsbook UX](https://symphony-solutions.com/insights/sportsbook-ux)
- [Prometeur: Sports Betting App UX & UI 2026](https://prometteursolutions.com/blog/user-experience-and-interface-in-sports-betting-apps/)

### Esports & Real-Time Betting
- [Esports Insider: Live Esports Betting Guide 2025](https://esportsinsider.com/us/gambling/live-esports-betting)
- [Esports.net: Top Live Esports Betting Sites](https://www.esports.net/betting/live/)

### Prediction Markets
- [Polymarket](https://polymarket.com) - Order book style, real-time odds
- [Polymarket Live Sports](https://polymarket.com/sports/live)

### Social Betting
- [BettorEdge: Social Betting Platforms](https://www.bettoredge.com/post/best-social-betting-platforms-for-2025-a-player-first-experience)
- [ReBet: Social Sweepstakes](https://rebet.app/)

### Crypto Settlement
- [iGamingToday: Crypto Betting vs Traditional 2025](https://www.igamingtoday.com/crypto-betting-vs-traditional-2025/)
- [Value The Markets: Blockchain Gambling](https://www.valuethemarkets.com/igaming/how-blockchain-is-transforming-online-gambling-faster-payouts-provable-fairness-global-access)

### Reference Platforms
- [Stake.com](https://stake.com) - Leading crypto sportsbook, excellent live betting UX
- [Sportsboom: Stake Review](https://www.sportsboom.com/betting/reviews/stake/)
