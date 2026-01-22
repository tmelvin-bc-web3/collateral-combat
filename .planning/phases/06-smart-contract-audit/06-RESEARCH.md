# Phase 6: Smart Contract Audit - Research

**Researched:** 2026-01-22
**Domain:** Solana/Anchor smart contract security, Pyth oracle integration, session key isolation
**Confidence:** HIGH

## Summary

This research investigated security audit practices for Solana Anchor programs, focusing on the session_betting program deployed at `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`. The contract implements a PDA-based balance system with session keys for frictionless betting, Oracle prediction rounds with Pyth price feeds, and authority-controlled fund settlement.

**Key findings:**
- Contract already implements critical Sealevel security controls (checked arithmetic, proper authority checks, two-step transfers)
- Pyth oracle integration follows best practices (staleness checks via `get_price_no_older_than`, feed ID validation)
- Session key isolation correctly prevents withdrawal via the `verify_session_or_authority` helper
- Backend integration uses atomic balance locking via `verifyAndLockBalance` pattern
- Main audit focus should be: round state machine verification, session key privilege escalation checks, and backend-contract synchronization

**Primary recommendation:** Conduct manual code review of state transitions (round lifecycle, claim logic) and verify session keys CANNOT execute privileged operations (withdraw, authority transfer). Automated tools can catch common Sealevel attacks, but business logic requires domain expertise.

## Standard Stack

### Core Security Tools
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Anchor | 0.31.1 | Smart contract framework | Industry standard for Solana, built-in discriminators and PDA helpers |
| Pyth SDK | Latest | Oracle price feeds | De facto standard for on-chain price data on Solana |
| Solana CLI | Latest | Deploy, verify, test | Official tooling |

### Audit Tools
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| X-ray (Sec3) | Latest | Automated vulnerability scanner | First pass - catches missing checks, overflows |
| Soteria | Latest | Static analysis for Anchor | Sealevel-specific vulnerabilities |
| Anchor test suite | Built-in | Integration testing | Verify state transitions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | Latest (backend) | Pending transaction tracking | Balance race condition prevention |
| @solana/web3.js | Latest (backend) | RPC interaction | Authority operations |

**Installation:**
```bash
# Audit tools
cargo install soteria
npm install -g @sec3/x-ray  # If available

# Testing
cd programs/session_betting
anchor test
```

## Architecture Patterns

### Recommended Audit Approach
```
1. Automated Scanning
   ├── Run X-ray/Soteria for common vulnerabilities
   ├── Check compilation warnings
   └── Verify overflow-checks enabled

2. Contract Review (lib.rs)
   ├── Authority checks on privileged instructions
   ├── State machine transitions (RoundStatus)
   ├── Math operations (all checked_*)
   └── PDA derivations and validations

3. Backend Integration Review
   ├── Balance locking atomicity (verifyAndLockBalance)
   ├── Solvency checks (canPayoutFromGameMode)
   ├── Round lifecycle synchronization
   └── Pyth price verification

4. Integration Testing
   ├── Round lifecycle (start → lock → settle → close)
   ├── Session key isolation (cannot withdraw)
   ├── Double claim prevention
   └── Edge cases (draw, cancellation)
```

### Pattern 1: Authority Check Pattern
**What:** Every privileged instruction verifies `ctx.accounts.authority.key() == game_state.authority`
**When to use:** Any instruction that modifies global state or moves funds
**Example:**
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:87-90
require!(
    ctx.accounts.authority.key() == game_state.authority,
    SessionBettingError::Unauthorized
);
```

### Pattern 2: Session Key Isolation
**What:** Session keys can bet but CANNOT withdraw - enforced by account validation
**When to use:** Temporary signing authority for UX without fund risk
**Example:**
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:929-968
fn verify_session_or_authority(
    session_token: &Option<Account<SessionToken>>,
    signer: &Signer,
    expected_authority: &Pubkey,
) -> Result<()> {
    // Wallet direct: allowed
    if signer.key() == *expected_authority {
        return Ok(());
    }
    // Session: must be valid and not expired
    // withdraw() instruction does NOT accept session_token parameter
}
```

### Pattern 3: Atomic Balance Locking (Backend)
**What:** Backend verifies balance and locks funds in a single on-chain call
**When to use:** Prevent TOCTOU race between balance check and wager placement
**Example:**
```typescript
// Source: backend/src/services/balanceService.ts:208-249
async verifyAndLockBalance(
  walletAddress: string,
  amount: number,
  gameMode: GameMode,
  gameId: string
): Promise<{ txId: string; newBalance: number }> {
  // 1. Create pending transaction (optimistic lock)
  const pendingTx = createPendingTransaction(...);

  try {
    // 2. Execute on-chain transfer_to_global_vault (atomic)
    const txId = await this.transferToGlobalVault(...);

    // 3. Confirm transaction
    confirmTransaction(pendingTx.id);
    return { txId, newBalance };
  } catch (error) {
    // 4. Cancel on failure
    cancelTransaction(pendingTx.id);
    throw error;
  }
}
```

### Pattern 4: Pyth Oracle Integration
**What:** Lock and settle rounds using Pyth price feed with staleness check
**When to use:** Any on-chain price-dependent logic
**Example:**
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:152-164
let price_feed = load_price_feed_from_account_info(price_account)
    .map_err(|_| SessionBettingError::InvalidPriceFeed)?;

// Verify feed ID matches
require!(
    price_feed.id.to_bytes() == game_state.price_feed_id,
    SessionBettingError::PriceFeedMismatch
);

// Get price with staleness check (60 seconds max)
let price = price_feed.get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)
    .ok_or(SessionBettingError::PriceTooStale)?;
```

### Anti-Patterns to Avoid
- **Using `hasSufficientBalance()` for wagers:** Deprecated - creates race condition. Use `verifyAndLockBalance()` instead.
- **Unchecked arithmetic:** All math uses `checked_add/sub/mul/div` with `MathOverflow` error
- **Arbitrary user-provided bump seeds:** PDAs use `ctx.bumps` from Anchor constraints
- **Missing feed ID validation:** Always verify `price_feed.id.to_bytes() == game_state.price_feed_id`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDA derivation | Custom seed hashing | Anchor `#[account(seeds = [...], bump)]` | Anchor handles canonical bump, prevents type confusion |
| Integer overflow | Manual overflow checks | Rust `checked_*` methods + Anchor's overflow-checks | Negligible cost on Solana, prevents silent wrapping |
| Account discriminators | Custom account type checks | Anchor's automatic discriminators | Prevents type confusion attacks |
| Oracle price fetching | HTTP fetch in instruction | Pyth SDK `load_price_feed_from_account_info` | Tamper-proof, on-chain verification |
| Session token validation | Custom expiry logic | Pattern in `verify_session_or_authority` | Handles expiry, authority mismatch, missing token |
| Authority transfer | Single-step ownership change | Two-step (propose → accept) | Prevents accidental lockout (see lines 352-400) |

**Key insight:** Anchor's constraints and Rust's checked arithmetic provide compile-time and runtime guarantees that custom solutions cannot match. The cost overhead is negligible compared to security benefits.

## Common Pitfalls

### Pitfall 1: Missing Signer Check (Sealevel Attack)
**What goes wrong:** Instructions accept arbitrary accounts without verifying the signer, allowing unauthorized operations
**Why it happens:** Rust's type system doesn't verify authority checks automatically
**How to avoid:**
- Use `Signer<'info>` type for accounts that must sign
- Add `require!(ctx.accounts.authority.key() == expected, Unauthorized)` checks
- Never use `UncheckedAccount` for authority validation
**Warning signs:** Account types are `AccountInfo` or `UncheckedAccount` in privileged instructions
**Status in session_betting:** ✅ All privileged instructions check authority (lines 87-90, 134-138, 280-284, 432-435, etc.)

### Pitfall 2: Reinitialization Attack
**What goes wrong:** An initialized account can be reinitialized, overwriting critical data (e.g., authority)
**Why it happens:** Missing `is_initialized` check or improper use of `init_if_needed`
**How to avoid:**
- Use Anchor's `init` constraint (sets discriminator, checks account is uninitialized)
- Avoid `init_if_needed` without additional safety checks
- Verify account discriminator matches expected type
**Warning signs:** Custom initialization logic, `init_if_needed` usage
**Status in session_betting:** ✅ All accounts use `init` constraint (GameState line 1023, BettingRound line 1055, etc.)

### Pitfall 3: PDA Validation Bypass
**What goes wrong:** User provides incorrect PDA, program doesn't validate seeds/bump, allowing access to wrong account
**Why it happens:** Using `find_program_address` without validating canonical bump, or accepting user-provided bump
**How to avoid:**
- Use Anchor's `seeds` and `bump` constraints in account validation
- Never accept bump as instruction parameter
- Derive PDAs in instruction and compare, don't trust client-provided PDAs
**Warning signs:** PDA accounts use `AccountInfo`, bump is an instruction argument
**Status in session_betting:** ✅ All PDAs use `seeds = [...]` and `bump` constraints

### Pitfall 4: Integer Overflow/Underflow
**What goes wrong:** Arithmetic wraps silently in release mode, causing incorrect balances or pool calculations
**Why it happens:** Rust optimizes away overflow checks in `--release` mode by default
**How to avoid:**
- Use `checked_add/sub/mul/div` for all financial calculations
- Set `overflow-checks = true` in Cargo.toml `[profile.release]`
- Return `MathOverflow` error instead of panicking
**Warning signs:** Using `+`, `-`, `*`, `/` operators on `u64` values
**Status in session_betting:** ✅ All arithmetic uses `checked_*` (lines 122-123, 255-257, 454-456, 804-806, etc.)

### Pitfall 5: Stale Oracle Prices
**What goes wrong:** Using outdated price data for settlement, enabling price manipulation
**Why it happens:** Not checking price timestamp, or allowing arbitrarily old prices
**How to avoid:**
- Use Pyth's `get_price_no_older_than(current_time, MAX_AGE)` method
- Set appropriate staleness threshold (60s for this contract)
- Validate price feed ID matches expected feed
**Warning signs:** Using `get_current_price()` without staleness check, no `MAX_PRICE_AGE` constant
**Status in session_betting:** ✅ Uses `get_price_no_older_than` with 60s max age (lines 163-164, 210-211)

### Pitfall 6: Session Key Privilege Escalation
**What goes wrong:** Session key can execute withdrawal or authority transfer, draining funds
**Why it happens:** Session validation in privileged instructions, or missing wallet-only constraints
**How to avoid:**
- Withdraw and authority transfer MUST require wallet signature (no `session_token` parameter)
- Use `constraint = user_balance.owner == user.key()` to enforce wallet ownership
- Document which instructions accept session keys
**Warning signs:** Privileged instructions accept `session_token: Option<Account<SessionToken>>`
**Status in session_betting:** ✅ `withdraw` (line 705) and authority transfer (lines 352-421) require direct wallet signature, session key NOT accepted

### Pitfall 7: Double Claim Attack
**What goes wrong:** User claims winnings multiple times for the same position
**Why it happens:** Missing `claimed` flag check, or flag set after transfer
**How to avoid:**
- Mark position as claimed BEFORE transferring funds (reentrancy protection)
- Use `require!(!position.claimed, AlreadyClaimed)` check
- Verify position ownership
**Warning signs:** `claimed` flag set after credit/transfer, no duplicate claim check
**Status in session_betting:** ✅ `claimed` flag checked (line 869) and set BEFORE credit (line 887)

### Pitfall 8: Round State Machine Confusion
**What goes wrong:** Invalid transitions (e.g., settle without lock, lock twice), incorrect winner determination
**Why it happens:** Missing state checks, incorrect status updates
**How to avoid:**
- Check current status before transition: `require!(round.status == RoundStatus::Open, RoundNotOpen)`
- Update status immediately after determining outcome
- Document valid state transitions
**Warning signs:** Status checks missing, status updated before validation
**Status in session_betting:**
- ✅ State checks present (lines 141, 187, 232, 287)
- ⚠️ VERIFY: Ensure no path allows skipping lock_round (e.g., direct settle from Open)

### Pitfall 9: Backend-Contract Synchronization
**What goes wrong:** Backend thinks funds are locked but on-chain transaction failed, or backend pays out more than global vault balance
**Why it happens:** Not awaiting on-chain confirmation, no solvency checks
**How to avoid:**
- Backend must verify on-chain balance before crediting
- Use pending transaction tracking (optimistic locking)
- Implement per-game-mode accounting to prevent cross-contamination
**Warning signs:** Backend credits without on-chain call, no global vault balance check
**Status in session_betting backend:**
- ✅ `verifyAndLockBalance` awaits on-chain transaction (balanceService.ts:208-249)
- ✅ Solvency check via `canPayoutFromGameMode` before credit (balanceService.ts:442-457)
- ✅ Game mode accounting prevents one mode from draining another's funds

## Code Examples

Verified patterns from the session_betting program:

### Authority Validation (High-Privilege Operations)
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:81-96
pub fn start_round(ctx: Context<StartRound>, start_price: u64) -> Result<()> {
    let game_state = &mut ctx.accounts.game_state;

    // SECURITY: Validate authority
    require!(
        ctx.accounts.authority.key() == game_state.authority,
        SessionBettingError::Unauthorized
    );

    // SECURITY: Game not paused
    require!(!game_state.is_paused, SessionBettingError::GamePaused);

    // SECURITY: Valid price
    require!(start_price > 0, SessionBettingError::InvalidPrice);

    // ... rest of logic
}
```

### Reentrancy Protection Pattern
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:803-806, 886-918
// Update state BEFORE external call (transfer)

// 1. Debit balance immediately
user_balance.balance = user_balance.balance
    .checked_sub(amount)
    .ok_or(SessionBettingError::MathOverflow)?;

// 2. Record position (state change complete)
position.amount = amount;
position.claimed = false;

// ... later when claiming ...

// 3. Mark as claimed BEFORE crediting
position.claimed = true;

// 4. Now safe to credit
if winnings > 0 {
    user_balance.balance = user_balance.balance
        .checked_add(payout)
        .ok_or(SessionBettingError::MathOverflow)?;
}
```

### PDA Validation with Anchor Constraints
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:1380-1395
#[account(
    mut,
    seeds = [b"balance", user_balance.owner.as_ref()],
    bump = user_balance.bump
)]
pub user_balance: Account<'info, UserBalance>,

#[account(
    init,
    payer = signer,
    space = 8 + PlayerPosition::INIT_SPACE,
    seeds = [b"position", round.round_id.to_le_bytes().as_ref(), user_balance.owner.as_ref()],
    bump
)]
pub position: Account<'info, PlayerPosition>,
```

### Two-Step Authority Transfer
```rust
// Source: programs/session_betting/programs/session_betting/src/lib.rs:352-399
// Step 1: Current authority proposes new authority
pub fn propose_authority_transfer(ctx: Context<ProposeAuthorityTransfer>, new_authority: Pubkey) -> Result<()> {
    let game_state = &mut ctx.accounts.game_state;

    require!(
        ctx.accounts.authority.key() == game_state.authority,
        SessionBettingError::Unauthorized
    );

    game_state.pending_authority = Some(new_authority);
    Ok(())
}

// Step 2: New authority accepts (prevents accidental lockout)
pub fn accept_authority_transfer(ctx: Context<AcceptAuthorityTransfer>) -> Result<()> {
    let game_state = &mut ctx.accounts.game_state;

    let pending = game_state.pending_authority
        .ok_or(SessionBettingError::NoPendingAuthority)?;

    require!(
        ctx.accounts.new_authority.key() == pending,
        SessionBettingError::Unauthorized
    );

    game_state.authority = pending;
    game_state.pending_authority = None;
    Ok(())
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual PDA derivation with custom seeds | Anchor `#[account(seeds = [...], bump)]` | Anchor 0.20+ | Prevents bump seed attacks, canonical bump guaranteed |
| HTTP oracle fetch + oracle account | Pyth on-chain price feeds | Pyth Network launch | Tamper-proof prices, MEV resistance |
| Single-step authority transfer | Two-step propose/accept pattern | Industry standard post-Wormhole exploit | Prevents accidental lockout |
| Balance check → separate lock | Atomic `verifyAndLockBalance` | v1.0 design | Eliminates TOCTOU race |
| Per-instruction overflow checks | Cargo.toml `overflow-checks = true` + checked_* | Anchor best practices | Compile-time + runtime protection |
| `init_if_needed` for accounts | Explicit `init` with discriminators | Post-reinitialization attacks | Prevents account overwrites |

**Deprecated/outdated:**
- **Manual signer checks with `AccountInfo`**: Use `Signer<'info>` type (Anchor 0.20+)
- **`find_program_address` without canonical bump**: Use Anchor's `bump` constraint
- **Session keys for withdrawal**: NEVER allow - session isolation is security-critical
- **Arithmetic without checked operations**: All `+`, `-`, `*`, `/` must be `checked_*`

## Open Questions

Things that couldn't be fully resolved:

1. **Round State Transition Completeness**
   - What we know: lock_round and lock_round_fallback both transition Open → Locked, settle_round transitions Locked → Settled
   - What's unclear: Is there any code path that allows settling an Open round (bypassing lock)?
   - Recommendation: Manual verification needed - search for `RoundStatus::Settled` assignments and trace back to ensure prior state was `Locked`

2. **Permissionless Fallback Lock Security**
   - What we know: Anyone can call `lock_round_fallback` after 60 seconds (prevents rounds getting stuck)
   - What's unclear: Can this be griefed? (e.g., locking early with stale price)
   - Recommendation: Verify staleness check is enforced in fallback (line 210-211 shows it is), but test edge cases

3. **Global Vault Solvency at Scale**
   - What we know: Backend tracks per-game-mode accounting (totalLocked, totalPaidOut)
   - What's unclear: Is there on-chain enforcement that global vault balance >= sum of all game mode liabilities?
   - Recommendation: Add monitoring/alerts for vault balance vs. expected liabilities, consider on-chain solvency check in creditWinnings

4. **Session Key Revocation Race**
   - What we know: User can revoke session via `revoke_session`, session checks expiry timestamp
   - What's unclear: If user revokes session, can in-flight transactions still execute?
   - Recommendation: Document expected behavior - likely session tx in mempool could still execute before revocation is processed

5. **Pyth Price Feed Update Latency**
   - What we know: MAX_PRICE_AGE_SECONDS = 60 in contract, Pyth updates vary by network
   - What's unclear: What's the actual update frequency on devnet/mainnet for SOL/BTC/ETH feeds?
   - Recommendation: Verify Pyth feed update frequency matches 60s staleness threshold, consider tightening to 30s for production

## Sources

### Primary (HIGH confidence)
- **Contract Source Code**: `programs/session_betting/programs/session_betting/src/lib.rs` (read directly, 1839 lines)
- **Backend Balance Service**: `backend/src/services/balanceService.ts` (read directly, integration patterns)
- **Anchor Framework Documentation**: Anchor 0.31.1 used by project (from Anchor.toml)

### Secondary (MEDIUM confidence)
- [Solana Signer Authorization | Solana Developers](https://solana.com/developers/courses/program-security/signer-auth) - Missing signer checks
- [Reinitialization Attacks | Solana Developers](https://solana.com/developers/courses/program-security/reinitialization-attacks) - Account reinitialization
- [Best Practices | Pyth Developer Hub](https://docs.pyth.network/price-feeds/core/best-practices) - Oracle staleness checks
- [Solana Security Risks Guide | Cantina](https://cantina.xyz/blog/securing-solana-a-developers-guide) - Comprehensive vulnerability overview
- [Sealevel Attacks | Coral XYZ](https://github.com/coral-xyz/sealevel-attacks) - Common exploits repository
- [Understanding Arithmetic Overflow | Sec3 Blog](https://www.sec3.dev/blog/understanding-arithmetic-overflow-underflows-in-rust-and-solana-smart-contracts) - Checked arithmetic
- [Session Keys Crate](https://crates.io/crates/session-keys) - Session key patterns for Anchor

### Tertiary (LOW confidence)
- [Solana Smart Contract Security Best Practices | SlowMist](https://github.com/slowmist/solana-smart-contract-security-best-practices) - General checklist
- [How to Audit Solana Smart Contracts | Sec3](https://www.sec3.dev/blog/how-to-audit-solana-smart-contracts-part-1-a-systematic-approach) - Audit methodology

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Anchor 0.31.1 and Pyth are industry standard, verified in project
- Architecture: HIGH - Patterns extracted from actual contract code
- Pitfalls: HIGH - All findings verified against contract implementation (lines cited)
- Backend integration: HIGH - Directly read balanceService.ts and predictionServiceOnChain.ts
- State machine: MEDIUM - Logic verified but exhaustive path analysis not performed
- Pyth oracle config: MEDIUM - Feed IDs and accounts documented in code, but update frequency not verified

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable domain, Anchor 0.31.1 mature)

**Next steps for planning:**
1. Create CONTRACT-AUDIT.md checklist with line-by-line verification tasks
2. Write test cases for state machine edge cases (double lock, settle without lock)
3. Document session key isolation test (attempt withdraw with session signer)
4. Plan backend-contract integration tests (solvency checks, balance synchronization)
5. Prepare AUDIT-SUMMARY.md template with 4-tier severity classification
