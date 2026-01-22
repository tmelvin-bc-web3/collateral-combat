# Contract Audit: session_betting

**Program ID:** `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`
**Audit Date:** 2026-01-22
**Auditor:** Claude Code (Phase 6 - Smart Contract Audit)
**Contract:** `programs/session_betting/programs/session_betting/src/lib.rs` (1839 lines)

---

## Sealevel Attack Analysis

### 1. Signer Checks

All privileged instructions require proper signer validation. The contract uses two patterns:
1. `Signer<'info>` type in account struct for authority accounts
2. `require!(ctx.accounts.authority.key() == game_state.authority, Unauthorized)` for runtime validation

| Instruction | Signer Type | Runtime Authority Check | Status | Lines |
|-------------|-------------|------------------------|--------|-------|
| `initialize_game` | `authority: Signer<'info>` | N/A (deployer becomes authority) | PASS | 1040-1041 |
| `start_round` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1073, 87-90 |
| `lock_round` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1098, 134-138 |
| `lock_round_fallback` | `caller: Signer<'info>` | None (permissionless by design after timeout) | PASS | 1122 |
| `settle_round` | `caller: Signer<'info>` | None (permissionless by design) | PASS | 1147 |
| `close_round` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1176-1177, 280-284 |
| `set_paused` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1189, 313-317 |
| `set_price_feed` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1201, 336-340 |
| `propose_authority_transfer` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1214, 355-359 |
| `accept_authority_transfer` | `new_authority: Signer<'info>` | `ctx.accounts.new_authority.key() == pending` | PASS | 1228, 385-389 |
| `cancel_authority_transfer` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1240, 407-411 |
| `withdraw_fees` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1254-1255, 432-436 |
| `transfer_to_global_vault` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1470-1471, 491-495 |
| `credit_winnings` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1511-1512, 550-554 |
| `fund_global_vault` | `authority: Signer<'info>` | `ctx.accounts.authority.key() == game_state.authority` | PASS | 1552-1553, 607-611 |
| `create_session` | `authority: Signer<'info>` | N/A (creates session for signer) | PASS | 1279-1280 |
| `revoke_session` | `authority: Signer<'info>` | `constraint = session_token.authority == authority.key()` | PASS | 1295, 1299-1300 |
| `deposit` | `user: Signer<'info>` | N/A (deposits to own account) | PASS | 1328-1329 |
| `withdraw` | `user: Signer<'info>` | `constraint = user_balance.owner == user.key()` | PASS | 1340, 1352-1353 |
| `place_bet` | `signer: Signer<'info>` | `verify_session_or_authority()` helper | PASS | 1404-1405, 770-776 |
| `claim_winnings` | `signer: Signer<'info>` | `verify_session_or_authority()` helper | PASS | 1453-1454, 855-861 |

**Summary:** All 21 instructions have proper signer checks. No missing signer vulnerabilities found.

### 2. Owner Validation

For instructions that modify user data, ownership is validated either via PDA seeds or explicit constraints.

| Instruction | Validation Method | Status | Lines |
|-------------|-------------------|--------|-------|
| `withdraw` | `constraint = user_balance.owner == user.key()` + PDA seeds `[b"balance", user.key()]` | PASS | 1338-1340 |
| `place_bet` | `verify_session_or_authority()` validates session.authority == user_balance.owner | PASS | 770-776, 929-968 |
| `claim_winnings` | `constraint = position.player == user_balance.owner` + `verify_session_or_authority()` | PASS | 1442, 855-861, 871-875 |
| `transfer_to_global_vault` | PDA seeds `[b"balance", owner.key()]` (backend uses owner pubkey) | PASS | 1476-1479 |
| `credit_winnings` | PDA seeds `[b"balance", owner.key()]` (backend uses owner pubkey) | PASS | 1517-1520 |

**Note on transfer_to_global_vault and credit_winnings:** These authority-only instructions take an `owner: AccountInfo` parameter. The PDA derivation ensures the correct user_balance account is accessed. No owner signature is required because only the backend authority can call these instructions.

**Summary:** All user data modifications have proper ownership validation.

### 3. Reinitialization Protection

| Account Type | Initialization | Discriminator Protection | Status | Lines |
|--------------|----------------|-------------------------|--------|-------|
| `GameState` | `init` constraint | Anchor auto-discriminator | PASS | 1023-1030 |
| `BettingRound` | `init` constraint | Anchor auto-discriminator | PASS | 1055-1062 |
| `BettingPool` | `init` constraint | Anchor auto-discriminator | PASS | 1064-1071 |
| `SessionToken` | `init` constraint | Anchor auto-discriminator | PASS | 1269-1277 |
| `PlayerPosition` | `init` constraint | Anchor auto-discriminator | PASS | 1387-1394 |
| `UserBalance` | `init_if_needed` | Anchor auto-discriminator | REVIEWED | 1311-1318 |

**`init_if_needed` Analysis (Line 1312):**

The `UserBalance` account uses `init_if_needed`. This is a potential reinitialization vector. However, the pattern is safe here because:

1. **PDA derivation includes user's public key:** `seeds = [b"balance", user.key().as_ref()]`
2. **User must sign as payer:** The `user` account that signs is the same one used in the PDA seed
3. **Anchor discriminator is set on first init:** Subsequent calls see the account already has data
4. **Owner field assignment is idempotent:** Line 681 sets `user_balance.owner = ctx.accounts.user.key()` which is always the same value for the same signer

**Status:** SAFE - `init_if_needed` is used correctly for first-time user onboarding.

### 4. Arithmetic Safety

**Cargo.toml Release Profile (Line 8):**
```toml
[profile.release]
overflow-checks = true
```

This enables runtime overflow checks even in release builds.

**Checked Arithmetic Usage:**

All critical financial calculations use checked operations:

| Operation | Method | Error | Lines |
|-----------|--------|-------|-------|
| Round counter increment | `checked_add(1)` | `MathOverflow` | 122-123 |
| Total volume update | `checked_add(pool.total_pool)` | `MathOverflow` | 255-257 |
| Grace period calculation | `checked_add(CLAIM_GRACE_PERIOD_SECONDS)` | `MathOverflow` | 295-297 |
| Fee deduction | `checked_sub(amount)` | `MathOverflow` | 454-456 |
| Balance deduction (transfer) | `checked_sub(amount)` | `MathOverflow` | 505-507 |
| Balance credit | `checked_add(amount)` | `MathOverflow` | 568-573 |
| Session duration calc | `checked_sub(clock.unix_timestamp)` | `InvalidSessionDuration` | 635-636 |
| Deposit balance update | `checked_add(amount)` | `MathOverflow` | 682-687 |
| Withdraw balance update | `checked_sub`, `checked_add` | `MathOverflow` | 721-726 |
| Bet deduction | `checked_sub(amount)` | `MathOverflow` | 804-806 |
| Pool updates | `checked_add(amount)` | `MathOverflow` | 819-831 |
| Fee calculation | `checked_mul`, `checked_div` | `MathOverflow` | 891-895 |
| Payout credit | `checked_add(payout)` | `MathOverflow` | 902-907 |
| Fee tracking | `checked_add(fee)` | `MathOverflow` | 910-912 |
| Draw refund | `checked_add(position.amount)` | `MathOverflow` | 915-917 |
| Winnings calculation | `checked_mul`, `checked_div`, `checked_add` (u128) | `MathOverflow` | 999-1007 |

**Unchecked Arithmetic Found:**

| Location | Expression | Risk Assessment | Status |
|----------|------------|-----------------|--------|
| Line 104 | `clock.unix_timestamp + ROUND_DURATION_SECONDS - LOCK_BUFFER_SECONDS` | LOW - i64 timestamp + 30s - 5s | LOW RISK |
| Line 105 | `clock.unix_timestamp + ROUND_DURATION_SECONDS` | LOW - i64 timestamp + 30s | LOW RISK |
| Line 107 | `round.lock_time + FALLBACK_LOCK_DELAY_SECONDS` | LOW - i64 result from line 104 + 60s | LOW RISK |
| Line 170 | `price.price as u64` | Guarded by positive check | SAFE |
| Line 217 | `price.price as u64` | Guarded by positive check | SAFE |

**Analysis of Unchecked Operations:**

1. **Time calculations (Lines 104-107):** These are i64 operations with constants (max +90 seconds). Unix timestamps won't overflow for billions of years. With `overflow-checks = true` in release profile, these would panic if overflow occurred. Risk is negligible.

2. **Pyth price cast (Lines 170, 217):** The `price.price as u64` could panic if price is negative. However:
   - Line 167: `require!(price.price > 0, InvalidPrice)` before cast on line 170
   - Line 214: `require!(price.price > 0, InvalidPrice)` before cast on line 217

   The positive check ensures safe cast. **SAFE.**

**Recommendation (LOW):** Lines 104-107 could use `checked_add` for defense-in-depth, but risk is minimal due to `overflow-checks = true` and small constant values.

### 5. PDA Validation

All PDA accounts use Anchor's `seeds` and `bump` constraints. No instruction accepts bump as a parameter.

| PDA | Seeds | Bump Source | Status | Lines |
|-----|-------|-------------|--------|-------|
| `game_state` | `[b"game"]` | `ctx.bumps.game_state` | PASS | 1027-1028 |
| `global_vault` | `[b"global_vault"]` | `ctx.bumps.global_vault` | PASS | 1035-1036 |
| `round` | `[b"round", round_id]` | `ctx.bumps.round` | PASS | 1059-1060 |
| `pool` | `[b"pool", round_id]` | `ctx.bumps.pool` | PASS | 1068-1069 |
| `session_token` | `[b"session", authority, session_signer]` | `ctx.bumps.session_token` | PASS | 1274-1275 |
| `user_balance` | `[b"balance", user]` | `ctx.bumps.user_balance` | PASS | 1315-1316 |
| `vault` | `[b"vault", user]` | `ctx.bumps.vault` | PASS | 1323-1324 |
| `position` | `[b"position", round_id, user]` | `ctx.bumps.position` | PASS | 1391-1392 |

**Summary:** All PDAs use canonical bump derivation via Anchor constraints. No PDA validation bypass vulnerabilities.

---

## Sealevel Attack Summary

| Category | Findings | Severity |
|----------|----------|----------|
| Missing Signer Checks | None | - |
| Missing Owner Checks | None | - |
| Reinitialization | `init_if_needed` used safely | - |
| Integer Overflow | 3 low-risk unchecked time operations | LOW |
| PDA Validation | All valid | - |

**Overall Sealevel Assessment:** PASS with LOW severity recommendations.

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
