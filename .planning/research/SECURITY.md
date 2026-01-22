# Security Research: Sol-Battles / DegenDome

**Domain:** PvP Betting Platform on Solana
**Researched:** 2026-01-21
**Overall Confidence:** HIGH (verified via official docs, multiple authoritative sources)

---

## Executive Summary

Solana betting platforms face a unique combination of standard smart contract vulnerabilities and gambling-specific risks. Based on security audit statistics from Sec3 (163 audits, 1,733 findings), the average Solana audit reveals **10 issues with 1.4 High/Critical vulnerabilities**. The top 3 vulnerability categories (Business Logic, Permissions, Validation Errors) account for **85.5% of all severe findings**.

Your known issues from codebase mapping align with the most critical vulnerability patterns:
- **Silent error handling** = Unhandled errors (HIGH severity)
- **Signature replay race condition** = Missing replay protection
- **PDA balance verification gap** = Missing atomic state management
- **Console.log statements** = Information disclosure risk
- **Missing audit trail** = Operational security gap

This document provides actionable checklists for self-audit, professional audit preparation, and gambling-specific hardening.

---

## Part 1: Critical Solana/Anchor Vulnerabilities

### 1.1 Account Validation Vulnerabilities

These represent the majority of critical findings in Solana audits.

| Vulnerability | Severity | Your Risk | Mitigation |
|---------------|----------|-----------|------------|
| Missing Signer Check | CRITICAL | HIGH (auth middleware issues) | Verify `account.is_signer` before privileged ops |
| Missing Owner Check | CRITICAL | MEDIUM | Validate `account.owner == expected_program` |
| Missing Initialization Check | HIGH | UNKNOWN | Check `is_initialized` flag to prevent re-init |
| PDA Substitution | HIGH | HIGH (balance verification gap) | Base PDAs on unique accounts, validate seeds |
| Type Cosplay | HIGH | UNKNOWN | Use Anchor discriminators, verify account types |

**Code Pattern - Missing Signer Check:**
```rust
// VULNERABLE - No signature verification
if admin.pubkey() != config.admin {
    return Err(ProgramError::InvalidAdmin);
}
// Proceeds without checking is_signer!

// SECURE - Explicit signature check
if !admin.is_signer {
    return Err(ProgramError::NotSigner);
}
// Or use Anchor's Signer<'info> type
```

**Code Pattern - Owner Verification:**
```rust
// VULNERABLE - Assumes config is legitimate
let config = ConfigAccount::unpack(&config_info.data.borrow())?;

// SECURE - Verify ownership first
if config.owner != program_id {
    return Err(ProgramError::InvalidOwner);
}
// Anchor's Account<'info, T> wrapper handles this automatically
```

### 1.2 Integer Overflow/Underflow

Rust prevents overflows in debug mode but **silently wraps in release mode**. This is critical for betting platforms handling SOL/token amounts.

**Mitigation Checklist:**
- [ ] Enable `overflow-checks = true` in `Cargo.toml` `[profile.release]`
- [ ] Use `checked_add`, `checked_sub`, `checked_mul`, `checked_div`
- [ ] Use `try_from()` instead of `as` for type casting
- [ ] Avoid `saturating_*` functions (they hide overflow conditions)

**Code Pattern:**
```rust
// VULNERABLE - Silent wrap in release mode
balance = balance - tokens_to_subtract;

// SECURE - Checked arithmetic
match balance.checked_sub(tokens_to_subtract) {
    Some(new_balance) => { balance = new_balance; }
    None => return Err(ProgramError::InsufficientFunds),
}

// Alternative using macro
let result = checked_math::cm!((stake_amount * odds) / 100).ok_or(ProgramError::Overflow)?;
```

### 1.3 PDA Security

PDAs are critical for escrow and session key functionality.

| Issue | Risk | Prevention |
|-------|------|------------|
| Bump Seed Manipulation | Attacker generates alternate PDAs | Use `find_program_address()`, store canonical bump |
| PDA Sharing | Cross-user access | Include user pubkey in seeds |
| Seed Collisions | Account overwrites | Use unique prefixes, validate before creation |

**Secure PDA Pattern for Escrow:**
```rust
// Derive escrow PDA with user isolation
let (escrow_pda, bump) = Pubkey::find_program_address(
    &[
        b"escrow",
        battle_id.as_bytes(),
        user.key().as_ref(),
    ],
    program_id,
);

// Store canonical bump, validate on subsequent calls
#[account(
    seeds = [b"escrow", battle_id.as_bytes(), user.key().as_ref()],
    bump = escrow.bump,  // Use stored bump, not user-provided
)]
pub escrow: Account<'info, Escrow>,
```

### 1.4 Cross-Program Invocation (CPI) Risks

| Vulnerability | Risk | Mitigation |
|---------------|------|------------|
| Arbitrary CPI | Execute attacker-controlled program | Verify program ID before invoke |
| Stale Account Data | Logic on outdated state | Call `reload()` after CPI |
| Missing CPI Signer | Unauthorized state changes | Pass signer seeds correctly |

**Critical Pattern - Account Reloading:**
```rust
// VULNERABLE - Uses stale data after CPI
token::transfer(cpi_ctx, amount)?;
msg!("Balance: {}", ctx.accounts.user_token.amount); // STALE!

// SECURE - Reload after CPI
token::transfer(cpi_ctx, amount)?;
ctx.accounts.user_token.reload()?;
msg!("Balance: {}", ctx.accounts.user_token.amount); // Current
```

### 1.5 Reentrancy (Limited but Real)

Solana's runtime limits CPI depth to 4 and prohibits direct reentrancy. However, state manipulation through intermediate calls remains possible.

**Protection Pattern:**
```rust
pub struct BattleState {
    pub is_processing: bool,  // Reentrancy guard
    // ... other fields
}

pub fn settle_battle(ctx: Context<SettleBattle>) -> Result<()> {
    require!(!ctx.accounts.battle.is_processing, CustomError::ReentrantCall);

    ctx.accounts.battle.is_processing = true;

    // ... settlement logic with CPI ...

    ctx.accounts.battle.is_processing = false;
    Ok(())
}
```

---

## Part 2: Your Known Issues - Detailed Analysis

### 2.1 Silent Error Handling (25+ instances returning null)

**Risk Level:** CRITICAL for betting platform

**Why It Matters:**
- Failed transactions may appear successful to users
- Edge cases in bet placement/settlement silently fail
- Attackers can probe for exploitable error conditions

**Immediate Actions:**
1. Audit all functions returning `Option<T>` or swallowing errors
2. Replace `unwrap()` with `?` operator or explicit error handling
3. Implement comprehensive error types

```rust
// BEFORE - Silent failure
pub fn place_bet(amount: u64) -> Option<()> {
    let balance = get_balance()?;  // Returns None on error - silent!
    Some(())
}

// AFTER - Explicit error propagation
#[error_code]
pub enum BattleError {
    #[msg("Insufficient balance for bet")]
    InsufficientBalance,
    #[msg("Battle already settled")]
    AlreadySettled,
    // ... comprehensive error types
}

pub fn place_bet(ctx: Context<PlaceBet>, amount: u64) -> Result<()> {
    let balance = get_balance(&ctx.accounts.user)?;
    require!(balance >= amount, BattleError::InsufficientBalance);
    // ...
}
```

### 2.2 Signature Replay Race Condition

**Risk Level:** CRITICAL

**The Problem:**
Solana uses Recent Blockhash (valid for ~150 blocks / 1-2 minutes) for replay protection. If your auth middleware doesn't properly track used signatures, attackers can replay valid signatures within that window.

**Solana's Built-in Protection:**
- Recent blockhash expires after ~150 blocks
- Validators check for duplicate signatures within 150-block window

**Additional Protection Needed:**
```rust
// Track used nonces/signatures in program state
pub struct AuthState {
    pub used_nonces: Vec<[u8; 32]>,  // Or use a more efficient structure
    pub last_cleanup_slot: u64,
}

pub fn authenticate(ctx: Context<Auth>, nonce: [u8; 32], signature: [u8; 64]) -> Result<()> {
    // Check nonce hasn't been used
    require!(
        !ctx.accounts.auth_state.used_nonces.contains(&nonce),
        AuthError::NonceAlreadyUsed
    );

    // Verify signature
    verify_signature(&ctx.accounts.user.key(), &nonce, &signature)?;

    // Record nonce
    ctx.accounts.auth_state.used_nonces.push(nonce);

    // Periodic cleanup of old nonces
    cleanup_old_nonces(&mut ctx.accounts.auth_state)?;

    Ok(())
}
```

**For Session Keys:**
```rust
pub struct SessionKey {
    pub key: Pubkey,
    pub expires_at: i64,      // Unix timestamp
    pub nonce: u64,           // Incrementing nonce per session
    pub max_amount: u64,      // Spending limit
    pub used_amount: u64,     // Track usage
}
```

### 2.3 PDA Balance Verification Gap (Not Atomically Locked)

**Risk Level:** CRITICAL

**The Problem:**
Checking balance without locking creates a TOCTOU (Time-of-Check-Time-of-Use) race condition.

```
T0: Check user has 100 SOL
T1: Another transaction withdraws 90 SOL  <- Race condition!
T2: Place bet for 50 SOL <- Should fail but doesn't
```

**Solution - Atomic State Transitions:**
```rust
pub struct Escrow {
    pub balance: u64,
    pub locked_amount: u64,  // Amount locked for pending bets
    pub owner: Pubkey,
}

pub fn place_bet(ctx: Context<PlaceBet>, amount: u64) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;

    // Atomic check-and-lock
    let available = escrow.balance.checked_sub(escrow.locked_amount)
        .ok_or(BattleError::Overflow)?;
    require!(available >= amount, BattleError::InsufficientBalance);

    // Lock the amount atomically
    escrow.locked_amount = escrow.locked_amount.checked_add(amount)
        .ok_or(BattleError::Overflow)?;

    // Record bet with locked funds
    ctx.accounts.bet.amount = amount;
    ctx.accounts.bet.status = BetStatus::Locked;

    Ok(())
}

pub fn settle_bet(ctx: Context<SettleBet>, winner: Pubkey) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let bet = &ctx.accounts.bet;

    // Release lock and update balance atomically
    escrow.locked_amount = escrow.locked_amount.checked_sub(bet.amount)
        .ok_or(BattleError::Underflow)?;

    if ctx.accounts.bet.user == winner {
        // Winner keeps their stake + opponent's
        escrow.balance = escrow.balance.checked_add(bet.amount)
            .ok_or(BattleError::Overflow)?;
    } else {
        // Loser's stake goes to winner
        escrow.balance = escrow.balance.checked_sub(bet.amount)
            .ok_or(BattleError::Underflow)?;
    }

    Ok(())
}
```

### 2.4 Console.log Statements (576+ uncontrolled)

**Risk Level:** MEDIUM (information disclosure, performance)

**Concerns:**
1. Leaking internal state/addresses to users
2. Performance impact in production
3. Stack traces revealing implementation details
4. Potential for log injection attacks

**Action Plan:**
1. Audit all `msg!()` and `console.log` statements
2. Implement log levels (DEBUG, INFO, WARN, ERROR)
3. Disable debug logging in production builds
4. Never log sensitive data (private keys, full balances, internal addresses)

```rust
// Use feature flags for debug logging
#[cfg(feature = "debug")]
msg!("Debug: Processing bet for user {}", user.key());

// Always log security-relevant events
msg!("AUDIT: Bet placed - user={}, amount={}, battle={}",
    user.key(), amount, battle_id);
```

### 2.5 Missing Audit Trail

**Risk Level:** HIGH for regulated gambling

**Required Events for Compliance:**
```rust
// Emit events for all state changes
#[event]
pub struct BetPlaced {
    pub user: Pubkey,
    pub battle_id: String,
    pub amount: u64,
    pub timestamp: i64,
    pub tx_signature: String,
}

#[event]
pub struct BattleSettled {
    pub battle_id: String,
    pub winner: Pubkey,
    pub loser: Pubkey,
    pub payout_amount: u64,
    pub settlement_method: String,  // "normal", "timeout", "dispute"
    pub timestamp: i64,
}

#[event]
pub struct FundsWithdrawn {
    pub user: Pubkey,
    pub amount: u64,
    pub destination: Pubkey,
    pub timestamp: i64,
}
```

---

## Part 3: Betting/Gambling-Specific Security

### 3.1 Provably Fair Implementation

For PvP betting, you need verifiable randomness for:
- Matchmaking (if any random element)
- Tiebreakers
- Any game-outcome-affecting randomness

**Options on Solana:**

| Provider | Cost | Speed | Security |
|----------|------|-------|----------|
| Switchboard VRF | Higher (~$0.01/request) | Slower (276 instructions) | HIGH - Cryptographic proof |
| ORAO VRF | Moderate | Fast | HIGH |
| MagicBlock VRF | Varies | Fast | HIGH |
| Blockhash | Free | Instant | LOW - Manipulable by validators |

**NEVER use blockhash for randomness in betting:**
```rust
// VULNERABLE - Slot leaders can manipulate
let random = Clock::get()?.slot % 100;

// SECURE - Use VRF
let vrf_result = ctx.accounts.vrf_account.result;
require!(vrf_result.is_verified(), VRFError::NotVerified);
let random = vrf_result.value[0..8].try_into().unwrap();
```

### 3.2 Commit-Reveal Pattern

For PvP where both players make choices:

```rust
pub struct PlayerCommit {
    pub commitment: [u8; 32],  // hash(choice + salt)
    pub revealed_choice: Option<u8>,
    pub revealed_salt: Option<[u8; 32]>,
    pub commit_timestamp: i64,
    pub reveal_deadline: i64,
}

pub fn commit_choice(ctx: Context<Commit>, commitment: [u8; 32]) -> Result<()> {
    require!(ctx.accounts.player_commit.commitment == [0; 32], GameError::AlreadyCommitted);
    ctx.accounts.player_commit.commitment = commitment;
    ctx.accounts.player_commit.commit_timestamp = Clock::get()?.unix_timestamp;
    ctx.accounts.player_commit.reveal_deadline =
        Clock::get()?.unix_timestamp + REVEAL_WINDOW_SECONDS;
    Ok(())
}

pub fn reveal_choice(ctx: Context<Reveal>, choice: u8, salt: [u8; 32]) -> Result<()> {
    let commit = &mut ctx.accounts.player_commit;

    // Verify within deadline
    require!(
        Clock::get()?.unix_timestamp <= commit.reveal_deadline,
        GameError::RevealExpired
    );

    // Verify commitment matches
    let computed = hash(&[&[choice], salt.as_ref()].concat());
    require!(computed.to_bytes() == commit.commitment, GameError::InvalidReveal);

    commit.revealed_choice = Some(choice);
    commit.revealed_salt = Some(salt);
    Ok(())
}
```

### 3.3 Escrow Security Checklist

- [ ] Funds locked in PDA, not user-controlled account
- [ ] Both parties must deposit before battle starts
- [ ] Timeout mechanism if opponent abandons
- [ ] Admin cannot access escrowed funds (trustless)
- [ ] Settlement requires cryptographic proof of outcome
- [ ] Partial withdrawal prevented during active battle

### 3.4 Oracle Manipulation Prevention

If using external data for settlements:

```rust
// Validate Pyth oracle status
let price_feed = &ctx.accounts.price_feed;
let price_data = price_feed.get_price_unchecked();

require!(
    price_data.status == PriceStatus::Trading,
    OracleError::PriceNotAvailable
);

// Check price is recent
require!(
    Clock::get()?.unix_timestamp - price_data.publish_time < MAX_ORACLE_AGE,
    OracleError::StalePrice
);

// Use confidence interval
let price_with_confidence = price_data.price;
let confidence = price_data.conf;
```

### 3.5 Frontrunning Prevention

Critical for any betting with visible pending transactions:

```rust
pub fn place_bet(
    ctx: Context<PlaceBet>,
    amount: u64,
    expected_odds: u64,      // User's expected odds
    max_slippage_bps: u16,   // Maximum acceptable slippage
) -> Result<()> {
    let current_odds = calculate_current_odds(&ctx.accounts.battle)?;

    // Prevent frontrunning by checking odds haven't changed significantly
    let slippage = ((current_odds as i64 - expected_odds as i64).abs() * 10000)
        / expected_odds as i64;
    require!(
        slippage <= max_slippage_bps as i64,
        BattleError::OddsSlippageExceeded
    );

    // ... proceed with bet
}
```

---

## Part 4: Self-Audit Checklist

### 4.1 Pre-Audit Preparation

**Code Quality:**
- [ ] All functions have comprehensive doc comments
- [ ] Error types cover all failure modes
- [ ] No `unwrap()` or `expect()` in production code
- [ ] `overflow-checks = true` in release profile
- [ ] All dependencies at latest stable versions

**Account Validation (for each instruction):**
- [ ] Signer checks on all privileged operations
- [ ] Owner checks on all external accounts
- [ ] PDA derivation validated with canonical bumps
- [ ] Account type discriminators verified
- [ ] Duplicate account checks where applicable

**Arithmetic:**
- [ ] All math uses checked_* functions
- [ ] Division by zero handled
- [ ] Precision loss addressed (multiply before divide)
- [ ] Type casting uses try_from()

**State Management:**
- [ ] Accounts reloaded after CPI
- [ ] Reentrancy guards where needed
- [ ] State transitions are atomic
- [ ] Closed accounts zeroed and marked

### 4.2 Security Testing

**Automated Tools:**
```bash
# Static analysis
cargo clippy -- -D warnings

# Anchor-specific checks
anchor build  # Catches many validation issues

# Formal verification (if available)
# sec3/soteria (commercial)
```

**Fuzzing Setup:**
```rust
// Using cargo-fuzz or similar
fuzz_target!(|data: &[u8]| {
    // Parse fuzzer input as instruction data
    if let Ok(instruction) = BattleInstruction::try_from_slice(data) {
        // Execute with mock accounts
        let result = process_instruction(&instruction, &mut mock_accounts());
        // Check invariants even on error
        assert_invariants(&mock_accounts);
    }
});
```

**Manual Test Cases:**
- [ ] Overflow at u64::MAX
- [ ] Underflow at 0
- [ ] Unauthorized signer attempts
- [ ] Wrong account owner
- [ ] Duplicate mutable accounts
- [ ] PDA with wrong seeds
- [ ] Stale price oracle data
- [ ] Replay of old transactions
- [ ] Race condition between two users

### 4.3 Gambling-Specific Tests

- [ ] Double-spend attempt on same escrow
- [ ] Withdraw during active battle
- [ ] Settlement with wrong winner
- [ ] Timeout manipulation
- [ ] Frontrunning bet placement
- [ ] Oracle price manipulation
- [ ] Session key exceeding limits
- [ ] Expired session key usage

---

## Part 5: Professional Audit Guide

### 5.1 Cost Estimates (2025/2026)

| Complexity | Lines of Code | Estimated Cost | Timeline |
|------------|---------------|----------------|----------|
| Simple token/basic | <1,000 | $5,000 - $15,000 | 1-2 weeks |
| Moderate DeFi | 1,000 - 5,000 | $20,000 - $100,000 | 2-4 weeks |
| Complex protocol | 5,000+ | $100,000 - $300,000+ | 4-8 weeks |

**Solana/Rust Premium:** Solana audits are **more expensive** than Solidity due to fewer qualified auditors.

**For Sol-Battles (estimate):**
- Escrow + session keys + settlement logic: Likely moderate complexity
- Estimated range: **$30,000 - $80,000**
- Timeline: **3-5 weeks**

### 5.2 Top Solana Audit Firms

| Firm | Specialty | Notes |
|------|-----------|-------|
| **OtterSec** | GameFi, NFT, high-performance | Solana-native, fast engagement |
| **Sec3** | DeFi, comprehensive analysis | Deep protocol alignment |
| **Halborn** | Full-stack security | 2-4 week turnaround, premium |
| **Accretion** | Solana runtime, top protocols | $1.5B+ TVL protected |
| **Hacken** | Accessible pricing, training | <1% incident rate post-audit |
| **Neodyme** | Solana core contributors | Deep runtime knowledge |

### 5.3 Audit Preparation Checklist

**Documentation to Prepare:**
- [ ] Architecture overview diagram
- [ ] Account structure documentation
- [ ] Instruction flow diagrams
- [ ] Known security considerations
- [ ] Previous audit reports (if any)
- [ ] Test coverage report

**Code Preparation:**
- [ ] Clean, documented codebase
- [ ] All tests passing
- [ ] Deployment scripts ready
- [ ] Access to devnet deployment

**Engagement Questions:**
1. Do you have Solana/Anchor-specific experience?
2. What's your methodology (manual + automated)?
3. Do you provide re-audit for fixes?
4. What's the deliverable format?
5. Do you offer ongoing security support?

### 5.4 Competitive Audits (Alternative)

Platforms like **Code4rena** offer competitive audits:
- Example: Solana Foundation audit - $203,500 prize pool
- Timeline: 4-5 weeks
- Benefit: Multiple auditors, diverse perspectives
- Risk: Variable quality, public disclosure

---

## Part 6: Security Hardening Checklist

### 6.1 Before Mainnet Launch

**Critical (Must Fix):**
- [ ] All 25+ silent error handling instances resolved
- [ ] Signature replay protection implemented
- [ ] PDA balance verification made atomic
- [ ] Professional audit completed
- [ ] All HIGH/CRITICAL findings fixed

**Important (Should Fix):**
- [ ] Console.log statements removed/controlled
- [ ] Audit trail events implemented
- [ ] Rate limiting on sensitive operations
- [ ] Admin key rotation mechanism
- [ ] Emergency pause functionality

**Recommended:**
- [ ] Bug bounty program launched
- [ ] Monitoring/alerting set up
- [ ] Incident response plan documented
- [ ] Upgrade authority secured (multisig)

### 6.2 Operational Security

```rust
// Emergency pause mechanism
pub struct GlobalConfig {
    pub is_paused: bool,
    pub pause_authority: Pubkey,
    pub admin: Pubkey,
}

pub fn pause(ctx: Context<Pause>) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == ctx.accounts.config.pause_authority,
        AdminError::Unauthorized
    );
    ctx.accounts.config.is_paused = true;
    emit!(SystemPaused {
        timestamp: Clock::get()?.unix_timestamp,
        authority: ctx.accounts.authority.key(),
    });
    Ok(())
}

// Add to all user-facing instructions
require!(!ctx.accounts.config.is_paused, SystemError::Paused);
```

### 6.3 Upgrade Security

```rust
// Use multisig for upgrade authority
// Example with Squads multisig

// Store upgrade authority as PDA or multisig
pub struct ProgramData {
    pub upgrade_authority: Pubkey,  // Should be multisig
    pub last_upgrade_slot: u64,
    pub upgrade_delay_slots: u64,   // Timelock
}
```

---

## Part 7: Vulnerability Patterns Quick Reference

### Critical Patterns to Search For

```rust
// Pattern 1: Missing signer check
// Search: Functions that check pubkey equality without is_signer
if account.key() == expected_key  // Missing && account.is_signer

// Pattern 2: Unchecked arithmetic
// Search: Direct operators on u64/u128
amount + other_amount  // Should be checked_add
amount - other_amount  // Should be checked_sub
amount * multiplier    // Should be checked_mul

// Pattern 3: Missing account reload
// Search: State access after CPI without reload
invoke(...)?;
account.field  // Stale without reload()

// Pattern 4: User-provided bump seeds
// Search: bump parameter in instruction args
pub fn instruction(ctx: ..., bump: u8)  // Should use find_program_address

// Pattern 5: Unbounded iteration
// Search: Loops over user-controlled data
for item in user_provided_vec  // DoS vector

// Pattern 6: Missing owner check
// Search: Account deserialization without owner validation
Account::try_from_slice(&data)  // Need owner == program_id check
```

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| Vulnerability Patterns | HIGH | Multiple authoritative sources (SlowMist, Helius, Cantina) |
| Audit Costs | MEDIUM | Ranges vary significantly by firm and scope |
| Gambling-Specific | MEDIUM | Limited Solana-specific gambling security docs |
| Self-Audit Tools | MEDIUM | Solana tooling less mature than EVM |
| VRF/Randomness | HIGH | Official Solana docs + provider docs |

---

## Sources

### Official/Authoritative
- [Solana Security Scanner (Official)](https://solana.com/docs/toolkit/test-suite/security-scanner)
- [Solana VRF Documentation](https://solana.com/developers/courses/connecting-to-offchain-data/verifiable-randomness-functions)
- [Solana Durable Nonces](https://solana.com/developers/courses/offline-transactions/durable-nonces)

### Security Research
- [SlowMist Solana Security Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [Helius: Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Cantina: Securing Solana Developer Guide](https://cantina.xyz/blog/securing-solana-a-developers-guide)
- [Sec3 Solana Security Ecosystem Review 2025](https://solanasec25.sec3.dev/)
- [SolSec Resource Collection](https://github.com/sannykim/solsec)

### Audit Firms
- [Hacken Solana Audits](https://hacken.io/services/blockchain-security/solana-smart-contract-security-audit/)
- [Accretion Security](https://accretion.xyz/)
- [Halborn Audit Reports](https://www.halborn.com/audits/)

### VRF/Randomness
- [Switchboard VRF](https://switchboardxyz.medium.com/verifiable-randomness-on-solana-46f72a46d9cf)
- [ORAO Solana VRF](https://orao.network/solana-vrf)

### Academic
- [Exploring Vulnerabilities in Solana Smart Contracts (arXiv)](https://arxiv.org/html/2504.07419v1)
- [VRust Automated Vulnerability Detection](https://dl.acm.org/doi/abs/10.1145/3548606.3560552)

---

## Next Steps

1. **Immediate:** Address silent error handling (25+ instances) - CRITICAL
2. **Week 1:** Implement atomic balance locking for escrow
3. **Week 2:** Add signature replay protection to auth middleware
4. **Week 3:** Remove/control console.log statements
5. **Week 4:** Implement audit trail events
6. **Week 5-6:** Internal security review using this checklist
7. **Week 7+:** Engage professional auditor
8. **Pre-launch:** Bug bounty program setup
