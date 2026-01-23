# Live Trading Battle Patterns

**Research Date:** 2026-01-23
**Context:** DegenDome - PvP crypto trading battles on Solana
**Constraints:** 5-minute battles, up to 20x leverage, Solana blockchain

---

## Key Findings

1. **Trading as Esports is emerging** - The Grand Cup 2025 proved live trading competitions work as spectator entertainment. The format (traders on stage, crowd cheering, real-time PnL display) creates genuine excitement. A crypto trading league with team-based weekly tournaments is launching Q2 2026.

2. **PvP.Trade on Hyperliquid shows the social layer matters** - 40% of Hyperliquid users trade through third-party frontends that add clan competitions, group leaderboards, and real-time trade sharing. The social/competitive wrapper around trading drives engagement more than the trading itself.

3. **Esports broadcast overlays solve the "exciting to watch" problem** - Tools like LHM.gg provide templates: Gold Difference Over Time graphs, Game Timelines showing key events, dynamic stat updates. Apply these patterns to PnL battles.

---

## Real-time PnL Display

### What Makes Trading Exciting to Watch

**The Grand Cup 2025 model:**
- Traders compete live on stage with audience
- 1-hour rounds, 1,000 USDT starting capital
- Real-time PnL percentage displayed prominently
- Pressure from cheering crowd adds entertainment value

**PvP.Trade social features:**
- Trade positions shared automatically in Telegram groups
- `/chart` command shows member trading records overlaid on price charts
- Real-time disclosure of entries/exits triggers FOMO and competitive spirit
- Position size, direction, and entry price visible to group

### Spectator-Focused Display Recommendations

| Element | Purpose | Priority |
|---------|---------|----------|
| **PnL Delta Bar** | Visual tug-of-war between fighters | CRITICAL |
| **Position Indicators** | Show who's long/short and at what leverage | HIGH |
| **Liquidation Distance** | How close each fighter is to liquidation | HIGH |
| **Trade Feed** | Recent position changes with timestamps | MEDIUM |
| **Price Action** | Chart showing the underlying asset | MEDIUM |

### Esports Overlay Principles (from [LHM.gg](https://lhm.gg/))

- **Don't distract during pivotal moments** - Hide stats during dramatic price moves, show them during consolidation
- **Group information by relevance timing** - Beginning of round vs end of round info in different areas
- **Match information density to game pace** - 5-minute battles are fast; don't overload the display
- **Use Gestalt principles** - Visual grouping guides where spectators look

### Specific UI Patterns

**"Gold Difference Over Time" for Trading:**
- X-axis: Time elapsed in battle
- Y-axis: PnL delta between fighters
- Shows momentum shifts, lead changes, dramatic swings
- This is THE spectator graph - shows the narrative at a glance

**Position Timeline:**
- Visual bar showing when positions were opened/closed
- Entry arrows, exit arrows, liquidation markers
- Lets spectators understand "what happened" quickly

**Danger Zone Indicators:**
- At 20x leverage, liquidation is ~5% away from entry
- Visual warning when fighters approach liquidation
- Creates tension - spectators see the risk in real-time

---

## Matchmaking Patterns

### ELO-Based Matching

**Street Fighter 6 model** (from [Exputer](https://exputer.com/guides/sf6-ranking-system-points/)):
- Win = gain ranking points, Loss = lose points
- Points gained/lost depend on opponent's rank
- Beat higher-ranked opponent = more points
- Win streak bonuses at lower ranks (not at Master)
- Can't be demoted from certain thresholds (safety floors)

**Crypto Fund Trader model:**
- ELO earned from wins, passing evaluations, and withdrawals
- Rank promotion tied to ELO accumulation
- Scholarship system for top performers

### Matchmaking Recommendations for DegenDome

**Tier-Based Matching:**
| Tier | ELO Range | Entry Stakes | Wait Time Priority |
|------|-----------|--------------|-------------------|
| Bronze | 0-999 | 0.1-0.5 SOL | Prioritize speed |
| Silver | 1000-1499 | 0.1-1 SOL | Balance speed/skill |
| Gold | 1500-1999 | 0.5-2 SOL | Balance speed/skill |
| Platinum | 2000-2499 | 1-5 SOL | Prioritize skill match |
| Diamond | 2500+ | 2-5 SOL | Prioritize skill match |

**Queue Logic:**
1. Search within ELO range first (e.g., +/- 100)
2. Expand range over time if no match found
3. Cap expansion at tier boundary (Bronze shouldn't match Diamond)
4. Stake amount must match exactly (or offer "any stake" option)

**New Player Protection:**
- First 10 battles: placement matches (no ELO loss, reduced gains)
- Separate queue for players with <5 battles
- Can't challenge players 500+ ELO higher until 20 battles

---

## Liquidation Mechanics in Competitions

### How Leverage Affects Liquidation (from [leverage.trading](https://leverage.trading/liquidation/))

| Leverage | Cushion to Liquidation |
|----------|----------------------|
| 5x | ~20% |
| 10x | ~10% |
| 20x | ~5% |
| 40x | ~2.5% |

### Competition-Specific Liquidation Rules

**Option A: Liquidation = Round Loss**
- If liquidated, you lose the battle immediately
- Creates high-stakes drama
- Risk: Encourages conservative play

**Option B: Liquidation = Position Reset**
- Liquidation closes position at loss
- Fighter can open new position with remaining capital
- More forgiving, allows comebacks

**Option C: Partial Liquidation (Recommended for 5-min battles)**
- Position size reduced incrementally as margin deteriorates
- Fighter keeps playing but with reduced firepower
- Balance between drama and fairness

### Liquidation Display for Spectators

```
Fighter A: LONG 10x SOL
[||||||||||||----] 72% margin remaining
Liquidation in: -$280 (28% more loss)

Fighter B: SHORT 20x SOL
[||||||----------] 40% margin remaining
Liquidation in: -$120 (12% more loss) << DANGER
```

**Key insight:** Spectators should be able to see who's in danger. The closer to liquidation, the more dramatic the situation.

---

## Ranking & Profiles

### Fighter Profile Stats That Matter

**From Street Fighter 6** (via [FGC Top Players](https://fgctopplayers.com/ranking-system/)):
- Win rate by matchup
- Recent form (momentum score)
- Tournament difficulty rating (quality of opponents)
- Performance floor (consistency)

**From Poker HUDs** (via [Poker Copilot](https://pokercopilot.com/poker-huds)):
- VPIP equivalent: "Aggression" (how often they open positions)
- 3-BET equivalent: "Counter-trade rate" (how often they fade the move)
- Showdown stats: Win rate when battle goes to final settlement

### Recommended Fighter Profile

```
DEGEN_KING | Diamond | 2,847 ELO
---------------------------------
W/L: 147-89 (62.3% win rate)
Current Streak: 5W
Best Streak: 12W
ROI: +34.2%

Style: Aggressive (78% position rate)
Favorite Asset: SOL (67% of trades)
Avg Leverage: 12.4x
Liquidation Rate: 8%

Recent Form: W W W L W (4-1 last 5)
vs Bronze: 23-2 | vs Silver: 45-18 | vs Gold: 52-31 | vs Plat: 27-38
```

### Leaderboard Categories

| Leaderboard | Metric | Refresh |
|-------------|--------|---------|
| **All-Time** | Total wins | Daily |
| **Weekly** | Wins this week | Real-time |
| **ROI Kings** | Profit % | Daily |
| **Streak Lords** | Current win streak | Real-time |
| **Liquidators** | Opponents liquidated | Daily |
| **Survivors** | Battles without liquidation | Daily |

---

## Tournament Structures

### Format Comparison (from [Esports.net](https://www.esports.net/wiki/guides/esports-tournament-formats/))

| Format | Pros | Cons | Best For |
|--------|------|------|----------|
| **Single Elimination** | Fast, dramatic, clear stakes | One loss = out, upsets common | Quick events, max drama |
| **Double Elimination** | Second chance, more accurate result | Takes 2x time, complex bracket | Fair competition |
| **Swiss** | Everyone plays multiple rounds, skill-based pairing | No elimination drama | Large field qualification |

### League of Legends Worlds 2025 Model

1. **Play-In:** Single elimination Bo5 (qualifies teams)
2. **Swiss Stage:** 16 teams, 5 rounds, 3 wins to advance
3. **Knockout:** Single elimination Bo5

### Recommended Tournament Formats for DegenDome

**Daily Tournaments (8-16 players):**
- Single elimination
- 4-round bracket
- 30-60 minutes total
- Entry: 0.5-2 SOL
- Prize: Winner takes 85% of pool

**Weekend Majors (32-64 players):**
- Swiss qualification (3 rounds) + Single elimination playoffs
- Top 8 from Swiss advance
- Entry: 1-5 SOL
- Prize: Top 4 paid (50/25/15/10)

**Seasonal Championships:**
- Invite top 16 ELO players
- Double elimination
- Entry: Free (invited)
- Prize pool from season rake

### Bracket Progression Display

```
QUARTERFINALS          SEMIFINALS           FINALS
---------------------------------------------------------
[DEGEN_KING]  --|
               |--[DEGEN_KING]--|
[newbie123]   --|               |
                                |--[DEGEN_KING]--[CHAMPION]
[SOL_MAXI]    --|               |
               |--[whale_99]----|
[whale_99]    --|
```

**Key feature:** Show upcoming matches so spectators know what's next. Tension builds when viewers see who the winner will face.

---

## Recommendations for DegenDome

### Immediate (Next Sprint)

1. **Add PnL Delta visualization**
   - Simple bar showing who's ahead
   - Update every price tick
   - This alone makes battles 10x more watchable

2. **Add liquidation distance indicator**
   - Show percentage to liquidation for each fighter
   - Color code: Green (safe) -> Yellow (warning) -> Red (danger)

3. **Implement basic win streak tracking**
   - Display on matchmaking screen
   - Psychological advantage / entertainment value

### Near-Term (1-2 Months)

4. **ELO ranking system**
   - Start everyone at 1200
   - Use standard ELO formula (K=32 for new players, K=16 for established)
   - Display tier badges in UI

5. **Fighter profiles**
   - Win/loss record
   - Win rate by tier
   - Favorite asset
   - Recent form indicator

6. **Daily tournaments**
   - Single elimination, 8-16 players
   - Fixed start times (e.g., 6PM UTC daily)
   - Entry via ELO tier gates

### Long-Term (3-6 Months)

7. **Spectator overlay system**
   - Professional broadcast mode
   - Commentary integration
   - Multi-battle view for tournaments

8. **Clan/Team competitions**
   - Team vs Team weekly challenges
   - Clan leaderboards
   - Shared clan profiles

9. **Seasonal competitive structure**
   - Monthly ranked seasons
   - Season rewards (cosmetics, titles)
   - Championship invitational

---

## Sources

### Trading Competitions
- [The Grand Cup 2025 Recap - BitPinas](https://bitpinas.com/feature/the-grand-cup-2025-recap)
- [World Trading Tournament 2026](https://www.worldtradingtournament.com/)
- [WSOT 2025](https://www.wsot.com/)

### Social Trading
- [PVP.Trade Quickstart - pvp.trade Docs](https://docs.pvp.trade/en-quickstart)
- [Hyperliquid Frontend Wars - Blockworks](https://blockworks.co/news/hyperliquid-the-frontend-wars)
- [Hyperliquid Social Trading - Delphi Digital](https://members.delphidigital.io/feed/hyperliquids-social-trading-arena)

### Liquidation Mechanics
- [Liquidation in Trading - leverage.trading](https://leverage.trading/liquidation/)
- [Drift Protocol Liquidations - Drift Docs](https://docs.drift.trade/liquidations/liquidations)
- [Forced Liquidation - MEXC Learn](https://www.mexc.com/learn/article/17827791510182)

### Ranking Systems
- [Street Fighter 6 Ranking System - Exputer](https://exputer.com/guides/sf6-ranking-system-points/)
- [FGC Top Players Ranking System](https://fgctopplayers.com/ranking-system/)
- [Elo-MMR Paper - Stanford](https://cs.stanford.edu/people/paulliu/files/www-2021-elor.pdf)
- [ELO Rating System - Wikipedia](https://en.wikipedia.org/wiki/Elo_rating_system)

### Tournament Formats
- [Esports Tournament Formats - Esports.net](https://www.esports.net/wiki/guides/esports-tournament-formats/)
- [LoL Worlds 2025 - Liquipedia](https://liquipedia.net/leagueoflegends/World_Championship/2025)
- [Swiss Format - Challengermode](https://support.challengermode.com/en/organizing-tournaments1/swiss-format)

### Broadcast Overlays
- [Esport Broadcast Overlays - Charlie Smith Games Research](https://cdsmith.games/2021/03/23/the-intricacies-of-esport-broadcast-overlays/)
- [LHM.gg - HUD Management](https://lhm.gg/)
- [Poker HUDs - Poker Copilot](https://pokercopilot.com/poker-huds)

---

*Research completed 2026-01-23*
