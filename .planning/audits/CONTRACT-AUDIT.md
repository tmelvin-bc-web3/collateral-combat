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

## Oracle Security Audit

### Pyth Integration Overview

The contract uses Pyth Network for tamper-proof on-chain price data. Both lock paths use identical security patterns.

### Pyth Integration Comparison Table

| Security Check | lock_round | lock_round_fallback | Status |
|----------------|------------|---------------------|--------|
| `load_price_feed_from_account_info` | Line 152 | Line 198 | PASS |
| Feed ID validation | Lines 156-159 | Lines 202-205 | PASS |
| Staleness check (60s) | Lines 162-164 | Lines 209-211 | PASS |
| Clock-based time | Line 162 (`clock.unix_timestamp`) | Line 209 (`clock.unix_timestamp`) | PASS |
| Positive price check | Line 167 | Line 214 | PASS |

### Detailed Security Analysis

**1. Price Feed Loading (Pyth SDK)**

Both paths use `load_price_feed_from_account_info`:
```rust
// lock_round (line 152)
let price_feed = load_price_feed_from_account_info(price_account)
    .map_err(|_| SessionBettingError::InvalidPriceFeed)?;

// lock_round_fallback (line 198)
let price_feed = load_price_feed_from_account_info(price_account)
    .map_err(|_| SessionBettingError::InvalidPriceFeed)?;
```

This validates:
- Account is owned by Pyth program
- Account data is properly formatted price feed
- Price feed is active and valid

**2. Feed ID Validation (CRITICAL)**

Both paths verify the price feed ID matches the configured feed:
```rust
// lock_round (lines 156-159)
require!(
    price_feed.id.to_bytes() == game_state.price_feed_id,
    SessionBettingError::PriceFeedMismatch
);

// lock_round_fallback (lines 202-205)
require!(
    price_feed.id.to_bytes() == game_state.price_feed_id,
    SessionBettingError::PriceFeedMismatch
);
```

**Why this matters:** Without feed ID validation, an attacker could substitute a different price feed (e.g., a low-cap token with manipulable price) to influence settlement.

**3. Staleness Check (CRITICAL)**

Both paths use `get_price_no_older_than`:
```rust
// lock_round (lines 162-164)
let current_time = clock.unix_timestamp;
let price = price_feed.get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)
    .ok_or(SessionBettingError::PriceTooStale)?;

// lock_round_fallback (lines 209-211)
let current_time = clock.unix_timestamp;
let price = price_feed.get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)
    .ok_or(SessionBettingError::PriceTooStale)?;
```

**Why this matters:** Without staleness checks, an attacker could wait for a favorable historical price to settle a round.

**4. Time Source Validation**

Both paths derive `current_time` from `Clock::get()`:
- lock_round: `Clock::get()` at line 143
- lock_round_fallback: `Clock::get()` at line 189

This is Solana's on-chain clock, not client-provided. Prevents clock manipulation attacks.

### Price Manipulation Resistance

| Manipulation Vector | Mitigated? | Evidence |
|---------------------|------------|----------|
| Arbitrary price input | YES | No instruction accepts user-provided price for lock/settle |
| Substitute different feed | YES | Feed ID validation in both paths |
| Use stale price | YES | 60-second staleness check |
| Manipulate clock | YES | Uses on-chain Clock::get() |
| MEV front-running | PARTIAL | Oracle price is on-chain, not user-submitted |

**Important Note on start_round:**

`start_round` DOES accept `start_price` as a parameter (line 81):
```rust
pub fn start_round(ctx: Context<StartRound>, start_price: u64) -> Result<()>
```

However, this is:
1. Authority-only (line 87-90)
2. Used for record-keeping (what price the round started at)
3. Winner is determined by `end_price` (from Pyth) vs `start_price`

**Risk assessment:** LOW - Authority sets start_price, but if authority is malicious, they control the game anyway. The critical security is that `end_price` (used for settlement) comes from Pyth oracle.

### Staleness Configuration Analysis

**Research Question #5: Pyth Update Frequency**

| Parameter | Value | Assessment |
|-----------|-------|------------|
| MAX_PRICE_AGE_SECONDS | 60 | Contract constant (line 36) |
| Pyth mainnet update frequency | ~400ms | Very frequent |
| Threshold margin | 150x safety margin | Conservative |

**Analysis:** 60 seconds is very conservative for Pyth which typically updates every ~400ms on mainnet. This provides ample margin for:
- Network congestion
- Temporary oracle downtime
- Validator propagation delays

**Recommendation:** 60 seconds is safe. Could potentially tighten to 30 seconds for production, but current setting is acceptable.

### Mainnet Configuration

**Default Feed ID (lines 45-50):**
```rust
pub const DEFAULT_PRICE_FEED_ID: [u8; 32] = [
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
];
```

This is the **BTC/USD** Pyth mainnet feed ID.

**Feed change authority (lines 333-344):**
```rust
pub fn set_price_feed(ctx: Context<SetPriceFeed>, price_feed_id: [u8; 32]) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == game_state.authority,
        SessionBettingError::Unauthorized
    );
    game_state.price_feed_id = price_feed_id;
    Ok(())
}
```

**Status:** Authority-only (PASS)

**Pre-mainnet Recommendation:**
1. Verify correct SOL/USD feed ID is set before mainnet deploy
2. Document feed ID in deployment checklist
3. Test feed ID validation with wrong feed ID (should fail with PriceFeedMismatch)

### Summary

| Category | Status | Notes |
|----------|--------|-------|
| Pyth SDK usage | SECURE | Both paths use official SDK |
| Feed ID validation | SECURE | Verified in both lock paths |
| Staleness check | SECURE | 60s threshold, very conservative |
| Clock source | SECURE | Uses on-chain Clock::get() |
| Arbitrary price input | SECURE | No user-provided price accepted |
| Feed change authority | SECURE | Authority-only |

**Oracle Security Assessment: PASS**

All critical Pyth security controls are in place. Both lock paths (authority and permissionless fallback) use identical security patterns. No path exists to manipulate settlement prices.

---
