# Oracle Game - Source of Truth

> Canonical values for the Oracle prediction game.
> All implementations (frontend, backend, smart contract) MUST align to these values.

---

## Timing

| Constant | Value | Description |
|----------|-------|-------------|
| `ROUND_DURATION` | 30 seconds | Total round length |
| `BETTING_WINDOW` | 25 seconds | Time users can place bets |
| `LOCK_PERIOD` | 5 seconds | Locked period before settlement |

**Timeline:**
```
0s ──────── 25s ──────── 30s ──────── 31s
   BETTING    │   LOCKED   │   SETTLE   │  NEXT ROUND
             lock        end          start
```

---

## Economics

| Constant | Value | Description |
|----------|-------|-------------|
| `PLATFORM_FEE` | 5% | Rake taken from losing pool |
| `MIN_BET_USD` | $5 | Minimum bet (off-chain) |
| `MIN_BET_SOL` | 0.01 SOL | Minimum bet (on-chain) |
| `EARLY_BIRD_MAX_BONUS` | 0.5 (50%) | Max bonus for earliest bet |

**Fixed Bet Amounts (Off-Chain):**
- $5, $15, $25, $50, $100

---

## Early Bird Multiplier

> Earlier bets receive higher weight when calculating winnings.
> This rewards taking risk when there's more uncertainty.

**Formula:**
```
time_multiplier = 1 + (time_remaining / BETTING_WINDOW) × EARLY_BIRD_MAX_BONUS
```

**Example (25s betting window, 0.5 max bonus):**
| Bet Time | Time Remaining | Multiplier | Effect |
|----------|----------------|------------|--------|
| 0s | 25s | 1.50x | 50% more weight |
| 5s | 20s | 1.40x | 40% more weight |
| 10s | 15s | 1.30x | 30% more weight |
| 15s | 10s | 1.20x | 20% more weight |
| 20s | 5s | 1.10x | 10% more weight |
| 25s | 0s | 1.00x | Base weight |

**Weighted Payout Formula:**
```
weighted_stake = stake × time_multiplier
weighted_pool = sum of all weighted_stakes on winning side

Winner Payout = stake + (losing_pool × 0.95 × weighted_stake / weighted_pool)
Loser Payout = 0
Push (tie) = stake returned
```

**Example Scenario:**
- Player A bets $100 LONG at 0s (multiplier: 1.5x, weighted: $150)
- Player B bets $100 LONG at 20s (multiplier: 1.1x, weighted: $110)
- Total weighted LONG pool: $260
- SHORT pool (losers): $200
- Distributable: $200 × 0.95 = $190

Payouts:
- Player A: $100 + ($190 × 150/260) = $100 + $109.62 = **$209.62**
- Player B: $100 + ($190 × 110/260) = $100 + $80.38 = **$180.38**

Both bet $100, but Player A earns $29.24 more for betting earlier.

---

## Live Odds Display

> Show real-time odds so players can make informed decisions.
> Odds update as bets come in - creates dynamic tension.

**Odds Formula:**
```
long_odds = 1 + (short_pool × 0.95 / long_pool)
short_odds = 1 + (long_pool × 0.95 / short_pool)
```

**Examples:**
| LONG Pool | SHORT Pool | LONG Odds | SHORT Odds |
|-----------|------------|-----------|------------|
| $500 | $500 | 1.95x | 1.95x |
| $100 | $900 | 9.55x | 1.11x |
| $900 | $100 | 1.11x | 9.55x |
| $50 | $950 | 19.0x | 1.05x |

**UI Display:**
- Show odds on each button: "LONG 2.4x" / "SHORT 1.6x"
- Update in real-time as bets are placed
- Color intensity can reflect odds (brighter = better odds)

**Edge Cases:**
- If one pool is $0: Show "∞x" or "No bets yet"
- Very lopsided (>20x): Consider showing warning "High risk"

**Combined with Early Bird:**
The displayed odds show what you'd get at 1.0x multiplier. Your actual return is:
```
actual_odds = base_odds × time_multiplier
```

So "LONG 2.4x" with a 1.3x early bird multiplier = potential 3.12x return.

---

## Price Feed

| Setting | Value |
|---------|-------|
| Source (off-chain) | CoinGecko API |
| Source (on-chain) | Pyth Network |
| Update interval | 30 seconds (API) + 1s simulated ticks |
| Staleness limit | 60 seconds |

**Supported Assets:**
- SOL (primary)
- BTC, ETH, WIF, BONK, JUP, RAY, JTO (off-chain only)

---

## Winner Determination

```
if (endPrice > startPrice) → LONG wins
if (endPrice < startPrice) → SHORT wins
if (endPrice == startPrice) → PUSH (all bets refunded)
```

**Draw Threshold (on-chain):** 0.1% (10 basis points)
- If price moves less than 0.1%, it's a draw

---

## XP Awards

| Outcome | XP Formula |
|---------|------------|
| Winner | 50 + (stake × 0.1) |
| Loser | 10 + (stake × 0.02) |
| Push | 5 (participation) |

---

## Socket Events

### Server → Client
| Event | Payload | When |
|-------|---------|------|
| `prediction_round` | `PredictionRound` | Round start, update, lock |
| `prediction_settled` | `PredictionRound` | Round settlement |
| `prediction_bet_placed` | `{ roundId, bet }` | Any bet placed |
| `prediction_history` | `PredictionRound[]` | On subscribe |

### Client → Server
| Event | Payload | When |
|-------|---------|------|
| `subscribe_prediction` | `asset` | Join asset room |
| `unsubscribe_prediction` | `asset` | Leave asset room |
| `place_prediction` | `{ asset, side, amount, wallet }` | Place bet |

---

## Round States

| State | Description | Accepts Bets |
|-------|-------------|--------------|
| `betting` | Active betting window | Yes |
| `locked` | Awaiting settlement | No |
| `settled` | Round complete | No |

---

## Smart Contract Constants

> Note: Smart contract currently uses different values. Should be updated to match.

| Constant | Current | Should Be |
|----------|---------|-----------|
| `BETTING_LOCK_BEFORE_END` | 10s | 5s |
| `PLATFORM_FEE_BPS` | 1000 (10%) | 500 (5%) |
| `DRAW_THRESHOLD_BPS` | 10 (0.1%) | Keep |
| `MIN_BET_LAMPORTS` | 10_000_000 | Keep |

---

## UI Requirements

1. **Single countdown** - Inside chart, top-left corner
2. **Two buttons** - LONG (green) and SHORT (red)
3. **Bet selector** - Below buttons, de-emphasized
4. **Left sidebar** - Current round bets
5. **Right sidebar** - Recent round history
6. **No scrolling** - Everything fits in viewport

---

## Data Types

```typescript
interface PredictionRound {
  id: string;
  asset: string;
  status: 'betting' | 'locked' | 'settled';
  startPrice: number;
  endPrice?: number;
  startTime: number;
  lockTime: number;
  endTime: number;
  duration: number;
  longPool: number;
  shortPool: number;
  longBets: PredictionBet[];
  shortBets: PredictionBet[];
  winner?: 'long' | 'short' | 'push';
  totalPool: number;
}

interface PredictionBet {
  id: string;
  roundId: string;
  bettor: string;
  side: 'long' | 'short';
  amount: number;
  placedAt: number;
  status: 'pending' | 'won' | 'lost' | 'push';
  payout?: number;
}
```
