# Contract Audit: session_betting

**Program ID:** `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`
**Audit Date:** 2026-01-22
**Auditor:** Claude Code (Phase 6 Plan 02)
**Contract:** `programs/session_betting/programs/session_betting/src/lib.rs` (1839 lines)

---

## Round State Machine Analysis

### State Transition Diagram

```
   +---------+
   |  Open   |
   +---------+
        |
        +----> lock_round (authority, after lock_time)
        |           |
        +----> lock_round_fallback (permissionless, after lock_time_fallback)
                    |
                    v
              +---------+
              | Locked  |
              +---------+
                    |
                    +----> settle_round (permissionless, after end_time)
                                |
                                v
                          +-----------+
                          |  Settled  |
                          +-----------+
                                |
                                +----> close_round (authority, after grace_period)
                                            |
                                            v
                                      [Account Closed]
```

### Transition Validation

| From | To | Instruction | Guard | Line |
|------|-----|-------------|-------|------|
| Open | Locked | lock_round | `round.status == RoundStatus::Open` | 141 |
| Open | Locked | lock_round_fallback | `round.status == RoundStatus::Open` | 187 |
| Locked | Settled | settle_round | `round.status == RoundStatus::Locked` | 232 |
| Settled | Closed | close_round | `round.status == RoundStatus::Settled` | 288 |

### Status Assignment Analysis

All locations where `round.status` is modified:

| Line | Instruction | Assignment |
|------|-------------|------------|
| 110 | start_round | `round.status = RoundStatus::Open` |
| 173 | lock_round | `round.status = RoundStatus::Locked` |
| 220 | lock_round_fallback | `round.status = RoundStatus::Locked` |
| 252 | settle_round | `round.status = RoundStatus::Settled` |

### Open Question Resolution

**Question 1: Can any path skip the lock step?**

**Answer: NO**

Evidence:
- `settle_round` is the ONLY instruction that sets `RoundStatus::Settled` (line 252)
- `settle_round` has a guard `require!(round.status == RoundStatus::Locked, ...)` (line 232)
- There is no other instruction that can transition to Settled
- Calling `settle_round` on an Open round returns `RoundNotLocked` error

**Verification complete: No path exists to settle a round without locking first.**

---

**Question 2: Permissionless fallback griefing potential?**

**Answer: LOW RISK**

Evidence:
- Timing constraint: `lock_time_fallback = lock_time + 60 seconds` (line 107)
- Cannot call fallback until 60s after normal lock time (line 192-195)
- Price source: Pyth oracle required (lines 198-211), not user input
- Staleness check enforced: `get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)` (line 210-211)
- Feed ID validated: `price_feed.id.to_bytes() == game_state.price_feed_id` (lines 202-205)
- Price must be positive: `require!(price.price > 0, ...)` (line 214)

**Attack vectors considered:**

| Attack | Mitigated By | Status |
|--------|-------------|--------|
| Lock early with bad price | Timing constraint (60s delay) | PREVENTED |
| Submit arbitrary price | Pyth oracle required | PREVENTED |
| Use stale price | 60s staleness check | PREVENTED |
| Use wrong price feed | Feed ID validation | PREVENTED |

**Conclusion:** Fallback mechanism is secure. Authority has 60-second priority window. Fallback uses same security controls as authority path.

### Lock Timing Analysis

| Constant | Value | Purpose |
|----------|-------|---------|
| ROUND_DURATION_SECONDS | 30 | Total round length |
| LOCK_BUFFER_SECONDS | 5 | Time before end when lock happens |
| FALLBACK_LOCK_DELAY_SECONDS | 60 | Delay for permissionless fallback |

Timeline for a round starting at T=0:
- T+0s: Round starts (Open)
- T+25s: lock_time reached (authority can lock)
- T+30s: end_time reached (settle possible)
- T+85s: lock_time_fallback reached (anyone can lock if still Open)

The 60-second fallback delay ensures:
1. Authority has reasonable time to lock normally
2. Rounds don't get stuck if authority goes offline
3. Permissionless locking still uses oracle price (no manipulation)

---

## Betting Logic Audit

### Place Bet Security (place_bet, lines 762-843)

| Check | Status | Line | Evidence |
|-------|--------|------|----------|
| Session/wallet verification | PASS | 770-775 | `verify_session_or_authority()` called |
| Game not paused | PASS | 777-781 | `require!(!ctx.accounts.game_state.is_paused, ...)` |
| Round must be open | PASS | 784 | `require!(round.status == RoundStatus::Open, ...)` |
| Timing constraint | PASS | 787-791 | `require!(clock.unix_timestamp < round.lock_time, ...)` |
| Bet amount validation | PASS | 794-795 | MIN_BET (0.01 SOL) and MAX_BET (100 SOL) checks |
| Sufficient balance | PASS | 798-801 | `require!(user_balance.balance >= amount, ...)` |
| Balance debit before position | PASS | 803-806 | Balance decremented BEFORE position.amount set |
| Checked arithmetic | PASS | 804-806 | `checked_sub().ok_or(MathOverflow)` |
| Pool update atomicity | PASS | 816-831 | Pool updated in same instruction as position |

**Reentrancy Protection Pattern:**
```rust
// Line 803-806: Update state BEFORE external call pattern
user_balance.balance = user_balance.balance
    .checked_sub(amount)
    .ok_or(SessionBettingError::MathOverflow)?;

// Line 808-814: Position record created AFTER balance debit
position.amount = amount;
position.claimed = false;
```

### Double Claim Prevention (claim_winnings, lines 848-921)

| Check | Status | Line | Evidence |
|-------|--------|------|----------|
| Session/wallet verification | PASS | 855-860 | `verify_session_or_authority()` called |
| Round must be settled | PASS | 862-866 | `require!(round.status == RoundStatus::Settled, ...)` |
| **claimed flag check** | **PASS** | **869** | `require!(!position.claimed, SessionBettingError::AlreadyClaimed)` |
| Position ownership | PASS | 871-875 | `require!(position.player == user_balance.owner, ...)` |
| **claimed flag set before credit** | **PASS** | **887** | `position.claimed = true;` BEFORE any credit |

**Critical Double Claim Protection:**
```rust
// Line 869: Check claimed flag
require!(!position.claimed, SessionBettingError::AlreadyClaimed);

// Line 877-884: Calculate winnings

// Line 887: Mark as claimed BEFORE credit (reentrancy protection)
position.claimed = true;

// Line 889-918: Credit balance only after claimed flag is set
if winnings > 0 {
    // ... credit logic ...
}
```

**Order of operations prevents double claim:**
1. Check `!position.claimed` (line 869)
2. Calculate winnings (lines 877-884)
3. Set `position.claimed = true` (line 887) - BEFORE any credit
4. Credit balance if winnings > 0 (lines 889-918)

### Payout Calculation (calculate_winnings, lines 971-1015)

| Check | Status | Line | Evidence |
|-------|--------|------|----------|
| Winner determination | PASS | 979 | `matches!((bet_side, winner), ...)` pattern |
| Division by zero prevention | PASS | 993-995 | `if winning_pool == 0 { return Ok(bet_amount); }` |
| Overflow protection (u128) | PASS | 999-1007 | Intermediate calculations use u128 |
| Result fits u64 | PASS | 1010-1012 | `if winnings > u64::MAX as u128 { return Err(...) }` |
| Checked arithmetic | PASS | 999-1007 | All operations use `checked_*` |

**Formula correctness:**
```
Winnings = bet_amount + (bet_amount * losing_pool / winning_pool)
```

This correctly implements proportional payout:
- Winner gets back their original bet
- Plus their proportional share of the losing pool

**Fee calculation (lines 891-899):**
```rust
let fee = winnings
    .checked_mul(PLATFORM_FEE_BPS)      // 500 bps = 5%
    .checked_div(BPS_DENOMINATOR)        // / 10000
let payout = winnings.checked_sub(fee)
```

Fee is 5% (500/10000) of gross winnings, applied correctly.

### Edge Case Analysis

| Scenario | Expected Behavior | Code Location | Verified |
|----------|------------------|---------------|----------|
| Single winner in pool | Gets entire losing pool minus fee | Lines 986-1003 | PASS |
| No losers (one-sided pool) | Winners get back original bet | Lines 993-995 (winning_pool = 0 edge case) | PASS |
| Draw | Everyone gets refund (no fee) | Lines 913-918 | PASS |
| User bet on losing side | Returns 0, no credit | Lines 981-983 | PASS |

**Edge case: winning_pool = 0**

If somehow winning_pool is 0 but user won (shouldn't happen mathematically):
- Line 993-995: Returns `bet_amount` (original stake returned)
- Prevents division by zero

**Edge case: Draw (WinnerSide::Draw)**

- Line 913-918: `if round.winner == WinnerSide::Draw`
- User gets `position.amount` back (original bet)
- No fee charged on draw
- Position is still marked claimed (prevents double claim)

---
