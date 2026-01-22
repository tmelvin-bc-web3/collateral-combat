# Audit Pitfalls Research

**Project:** Sol-Battles (DegenDome) - PvP Betting Platform on Solana
**Audit Type:** Self-audit before mainnet deployment
**Researched:** 2026-01-22
**Confidence:** HIGH (verified against codebase + industry research)

---

## Executive Summary

Self-auditing a betting platform with real money at stake carries unique risks. This document catalogues pitfalls specific to:
1. What auditors commonly miss in smart contract reviews
2. False confidence traps (things that look secure but aren't)
3. Solana/Anchor specific gotchas
4. Betting/financial platform risks
5. Self-audit biases (when you audit your own code)

Each pitfall includes warning signs, prevention strategies, and which audit phase should address it.

---

## 1. Commonly Missed Issues

These are areas auditors frequently skip or underestimate, based on analysis of 163 Solana security audits revealing 1,669 vulnerabilities.

### 1.1 Business Logic Flaws

**What auditors miss:** Focus on code syntax over game logic correctness.

**In Sol-Battles context:**
- Winner determination logic in `calculate_winnings()` (lib.rs:971-1015)
- Early bird multiplier calculations (off-chain)
- Rake calculation accuracy (5% platform fee)
- Draw/push refund logic

**Warning signs:**
- Edge cases not covered by tests
- Complex conditional logic without truth tables
- Multiple code paths to same outcome

**Prevention:**
- Create truth tables for all game outcomes
- Test every combination: UP wins, DOWN wins, DRAW, empty pools, single bettor
- Verify rake is never applied twice or skipped
- Check payout invariant: `total_payouts + fees <= total_pool`

**Phase:** On-chain audit - verify all settlement paths

---

### 1.2 Access Control Gaps in Authority-Controlled Functions

**What auditors miss:** Authority functions that lack proper validation or have overly broad permissions.

**In Sol-Battles context:**
Your smart contract has 10+ authority-only functions:
- `transfer_to_global_vault` - Can drain any user's balance
- `credit_winnings` - Can credit arbitrary amounts
- `set_price_feed` - Can change oracle source
- `close_round` - Can forfeit unclaimed winnings
- `withdraw_fees` - Can extract platform fees

**Warning signs:**
- Single authority key controls everything
- No multi-sig requirement
- No rate limiting on authority actions
- No event logging for admin actions

**Prevention:**
- Audit every authority-only function for abuse potential
- Consider: "What if the authority key is compromised?"
- Verify event emission for all admin actions (you have: `FeesWithdrawn`, `GamePaused`, `AuthorityTransferred`)
- Plan for multi-sig before mainnet (noted in roadmap)

**Phase:** Access control audit

---

### 1.3 State Transition Violations

**What auditors miss:** Invalid state transitions that should be impossible but aren't enforced.

**In Sol-Battles context:**
Round states: `Open -> Locked -> Settled`

**Critical questions:**
- Can a round be settled without being locked?
- Can bets be placed after lock_time?
- Can winnings be claimed twice?
- Can a closed round be reopened?

**Your code has checks, verify they're complete:**
```rust
// lib.rs:232 - Settle requires Locked status
require!(round.status == RoundStatus::Locked, ...)

// lib.rs:141 - Lock requires Open status
require!(round.status == RoundStatus::Open, ...)
```

**Warning signs:**
- Status enum without exhaustive matching
- Missing state checks before operations
- Implicit state assumptions

**Prevention:**
- Draw state machine diagram
- Test every invalid transition (should fail)
- Verify no function can skip states

**Phase:** Smart contract audit

---

### 1.4 Off-Chain/On-Chain State Desync

**What auditors miss:** Inconsistencies between backend state and blockchain state.

**In Sol-Battles context:**
- Backend tracks pending transactions in SQLite (`balanceDatabase.ts`)
- On-chain balance in PDA (`UserBalance.balance`)
- Backend game mode accounting (`recordGameModeLock`, `recordGameModePayout`)

**Warning signs:**
- Database transaction fails after on-chain success
- On-chain transaction fails after database update
- Race conditions between services

**Prevention:**
- Audit the `verifyAndLockBalance()` flow carefully (balanceService.ts:208-249)
- Verify pending transaction cleanup on failure
- Test: What happens if backend crashes mid-settlement?
- Verify `cleanupOldTransactions()` doesn't delete active games

**Phase:** Integration audit - backend/blockchain sync

---

### 1.5 Economic Invariant Violations

**What auditors miss:** Mathematical properties that should always hold.

**In Sol-Battles context:**
Key invariants:
1. `global_vault.lamports >= sum(all_locked_funds)` - Vault solvency
2. `user.balance >= 0` always (checked_sub prevents this)
3. `up_pool + down_pool == total_pool`
4. `platform_fees_collected <= total_volume * 0.05`

**Warning signs:**
- No explicit invariant checks
- Relying on arithmetic alone for invariants
- Missing solvency checks before payouts

**Your code has solvency check:**
```typescript
// balanceService.ts:442-457
if (!canPayoutFromGameMode(gameType, amountLamports)) {
  // Prevents one game mode from draining another's funds
}
```

**Prevention:**
- Document all invariants explicitly
- Add runtime assertions where possible
- Test invariants hold after every operation

**Phase:** Economic model audit

---

## 2. False Confidence Traps

Things that look secure but contain hidden vulnerabilities.

### 2.1 "Anchor Handles It" Trap

**False belief:** Anchor's constraints automatically prevent all account validation issues.

**Reality:** Research shows two vulnerabilities remain exploitable even with Anchor: Missing Signer Check and Missing Owner Check in certain configurations. Anchor doesn't update deserialized accounts after CPI.

**In Sol-Battles context:**
```rust
// lib.rs:1094 - CHECK comment required for unchecked accounts
/// CHECK: Pyth price feed account - validated in instruction
pub price_feed: AccountInfo<'info>,
```

**Warning signs:**
- `/// CHECK:` comments without actual validation code
- Assuming `Account<'info, T>` validates everything
- Not re-fetching account data after CPI calls

**Prevention:**
- Audit every `/// CHECK:` comment - is validation actually performed?
- Verify price_feed validation happens in instruction body
- Check if any CPIs affect accounts used later in same instruction

**Phase:** Smart contract audit - account validation

---

### 2.2 "Checked Math Prevents Overflow" Trap

**False belief:** Using `checked_*` operations everywhere makes math safe.

**Reality:** Checked math prevents overflow, but doesn't prevent:
- Loss of precision in division
- Incorrect order of operations
- Off-by-one errors
- Division by zero (panics, doesn't silently fail)

**In Sol-Battles context:**
```rust
// lib.rs:999-1003 - Division before multiplication loses precision
let share = (bet_amount as u128)
    .checked_mul(losing_pool as u128)?
    .checked_div(winning_pool as u128)?;
```

**Warning signs:**
- Division followed by multiplication (precision loss)
- Assuming u128 prevents all overflow issues
- Not testing with extreme values (max u64, near-zero)

**Prevention:**
- Test with MIN_BET (0.01 SOL) in massive pool
- Test with MAX_BET (100 SOL) against tiny pool
- Verify order: multiply first, divide last
- Check division by zero handling (line 993: `if winning_pool == 0`)

**Phase:** Smart contract audit - arithmetic

---

### 2.3 "Signature Verification Proves Identity" Trap

**False belief:** Verifying a wallet signature means the request is legitimate.

**Reality:** Signature verification proves the wallet signed the message, but:
- Replay attacks if timestamp not checked
- Message substitution if content not bound
- Phishing could trick user into signing malicious message

**In Sol-Battles context:**
```typescript
// signatureVerification.ts:61-89
export function verifyShareSignature(
  walletAddress: string,
  roundId: string,
  timestamp: number,
  signature: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes
)
```

**Good:** Timestamp check prevents replay. Specific message format.

**Warning signs:**
- Generic message that could apply to multiple actions
- Long validity windows (>5 minutes)
- No nonce for one-time actions

**Prevention:**
- Verify every signed action includes specific context (you do: roundId)
- Check timestamp validation is consistent across all endpoints
- Consider if session keys need additional binding

**Phase:** Backend audit - authentication

---

### 2.4 "Session Keys Can Only Bet" Trap

**False belief:** Session keys are safe because they can only bet, not withdraw.

**Reality:** If session key is compromised:
- Can drain balance through excessive bets
- Can grief user by placing unwanted bets
- Can affect game outcomes in multi-player scenarios

**In Sol-Battles context:**
```rust
// lib.rs:703-756 - Withdraw requires wallet signature, good
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // CRITICAL SECURITY: REQUIRES wallet signature - NEVER session key
```

**Warning signs:**
- Session key with no bet limits
- No notification when session key acts
- Session duration too long (7 days max in your code)

**Prevention:**
- Consider per-session spending limits
- Log all session key actions for user visibility
- Ensure session revocation is immediate (you have `revoke_session`)
- Audit session token validation in `verify_session_or_authority()`

**Phase:** Session key audit

---

### 2.5 "Pyth Oracle Is Tamper-Proof" Trap

**False belief:** Using Pyth means price manipulation is impossible.

**Reality:** Pyth oracle is tamper-proof for the price it reports, but:
- Pyth reports market price, which can be manipulated (Mango Markets: $117M loss)
- Thin liquidity assets are vulnerable to spot manipulation
- Oracle can be stale (you check: `MAX_PRICE_AGE_SECONDS: u64 = 60`)

**In Sol-Battles context:**
Your Oracle game uses SOL/USD - high liquidity, lower manipulation risk than altcoins.

**Warning signs:**
- Adding low-liquidity assets to price predictions
- Not checking price staleness
- Single oracle source (you use Pyth only)

**Prevention:**
- Verify staleness check: `get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)`
- Verify price_feed_id matches expected feed (you do: line 156-159)
- Consider if 60-second staleness is appropriate for 30-second rounds
- Monitor for unusual price movements during settlement

**Phase:** Oracle integration audit

---

## 3. Solana/Anchor Gotchas

Platform-specific issues that don't exist on other chains.

### 3.1 Account Rent and Closure

**Issue:** Closing accounts returns rent, but improper closure leaves dangling references.

**In Sol-Battles context:**
```rust
// lib.rs:1163-1174 - close_round closes round and pool accounts
#[account(
    mut,
    close = authority
)]
pub round: Account<'info, BettingRound>,
```

**Warning signs:**
- Closed accounts referenced elsewhere
- Race between reading account and closure
- Unclaimed positions referencing closed rounds

**Prevention:**
- Verify grace period (1 hour) is sufficient for claims
- Check what happens if claim attempted on closed round
- Ensure `PlayerPosition` accounts handle round closure gracefully

**Phase:** Smart contract audit - account lifecycle

---

### 3.2 PDA Seed Collisions

**Issue:** Different inputs can derive same PDA if seeds aren't unique.

**In Sol-Battles context:**
```rust
// Position PDA: [b"position", round_id, player]
seeds = [b"position", round.round_id.to_le_bytes().as_ref(), user_balance.owner.as_ref()],
```

**Safe:** round_id + player combination is unique per bet.

**Warning signs:**
- Seeds that could overlap between features
- User-controlled seed components without validation
- Missing bump validation

**Prevention:**
- Document all PDA seeds and verify no collisions
- Verify bump seed is stored and validated
- Check `ctx.bumps.position` matches stored bump

**Phase:** PDA derivation audit

---

### 3.3 Cross-Program Invocation (CPI) Issues

**Issue:** After CPI, deserialized accounts don't auto-refresh in Anchor.

**In Sol-Battles context:**
Your contract uses system_program::transfer for fund movements, then reads balances.

**Warning signs:**
- Reading account balance after CPI transfer
- Assuming account state reflects CPI changes
- Multiple CPIs with dependent state

**Prevention:**
- Check if any instruction reads account state after CPI
- In `claim_winnings`, fee calculation happens before any transfer - verify order
- Reload accounts if needed after CPI (not automatic in Anchor)

**Phase:** CPI flow audit

---

### 3.4 Transaction Size Limits

**Issue:** Solana transactions have 1232-byte limit; complex operations may fail.

**In Sol-Battles context:**
Your transactions are relatively simple (single instruction each), but:
- Large game_id (32 bytes) in `credit_winnings`
- Multiple account references

**Warning signs:**
- Transactions failing intermittently with no clear error
- Complex multi-instruction transactions
- Dynamic-length data in instructions

**Prevention:**
- Test all instruction variants for size limits
- Monitor for transaction size errors in production
- Consider compression if approaching limits

**Phase:** Integration testing

---

### 3.5 Clock Drift and Timing

**Issue:** `Clock::get()` returns slot time, which can have clock drift.

**In Sol-Battles context:**
```rust
// lib.rs:98 - Uses clock for round timing
let clock = Clock::get()?;
round.start_time = clock.unix_timestamp;
round.lock_time = clock.unix_timestamp + ROUND_DURATION_SECONDS - LOCK_BUFFER_SECONDS;
```

**Warning signs:**
- Assuming clock is always accurate
- Race conditions around lock_time boundary
- User actions accepted milliseconds after deadline

**Prevention:**
- Backend should enforce lock_time with buffer before on-chain check
- Accept that bets near boundary may succeed/fail unpredictably
- Document timing tolerance for users

**Phase:** Timing behavior audit

---

## 4. Betting Platform Risks

Financial application-specific vulnerabilities.

### 4.1 Frontrunning and MEV

**Issue:** Validators can see pending bets and act on them.

**In Sol-Battles context:**
- Users bet on price going UP/DOWN
- If bet is visible before inclusion, validator could:
  - Front-run large bets to move odds
  - Back-run to bet on same side

**Mitigating factors in your design:**
- Bets don't reveal price information (user predicts direction)
- Pool sizes visible, but bet direction requires seeing transaction
- 25-second betting window limits reaction time

**Warning signs:**
- Large single-bettor advantage
- Pattern of last-second bets winning disproportionately
- Unusual transaction ordering patterns

**Prevention:**
- Monitor for suspicious betting patterns
- Consider commit-reveal scheme for high-stakes games
- Analyze if bet sizes should be hidden until lock

**Phase:** MEV/frontrunning analysis

---

### 4.2 Pool Imbalance Attacks

**Issue:** Strategic betting to guarantee profits regardless of outcome.

**In Sol-Battles context:**
If UP pool = 100 SOL, DOWN pool = 10 SOL:
- DOWN bettor gets 10x return if they win
- Attacker could bet both sides strategically

**Example attack:**
1. Bet 10 SOL on UP (now UP=110, DOWN=10)
2. Bet 1 SOL on DOWN (now UP=110, DOWN=11)
3. If DOWN wins: Get ~11 SOL back from 1 SOL bet
4. If UP wins: Get ~10 SOL from 10 SOL bet (small loss)

**Warning signs:**
- Same wallet betting both sides in one round
- Systematic bets that reduce variance
- Bots making calculated hedged bets

**Prevention:**
- Check if same wallet can bet both sides (your position PDA is per-player per-round, so NO - good)
- Monitor for related wallets (Sybil) betting both sides
- Consider minimum pool ratios

**Phase:** Game theory analysis

---

### 4.3 House Insolvency

**Issue:** Payouts exceed available funds.

**In Sol-Battles context:**
Your solvency check:
```typescript
// balanceService.ts:440-457
if (!canPayoutFromGameMode(gameType, amountLamports)) {
  console.error(`SOLVENCY CHECK FAILED...`);
}
```

**Warning signs:**
- Global vault balance doesn't match expected total
- Game mode accounting drift from actual
- Uncredited winnings accumulating

**Prevention:**
- Regular reconciliation: `global_vault.lamports` vs sum of all locks
- Alert if any game mode's `totalLocked - totalPaidOut - totalRefunded < 0`
- Test: What happens when payout fails? (User retry? Auto-queue?)

**Phase:** Financial reconciliation audit

---

### 4.4 Unclaimed Winnings Edge Cases

**Issue:** What happens to funds if users don't claim?

**In Sol-Battles context:**
```rust
// lib.rs:39-41
/// Grace period for claiming winnings before round can be closed: 1 hour
/// Unclaimed winnings are forfeited to the protocol
pub const CLAIM_GRACE_PERIOD_SECONDS: i64 = 60 * 60;
```

**Warning signs:**
- Users losing funds due to unawareness
- No notification system for unclaimed winnings
- Dispute potential if grace period is too short

**Prevention:**
- Verify 1 hour is sufficient for all users
- Add prominent UI notifications for pending claims
- Consider longer grace period or auto-claim mechanism
- Document this clearly for users

**Phase:** User experience + legal review

---

### 4.5 Free Bet Exploits

**Issue:** Platform-funded promotions can be exploited.

**In Sol-Battles context:**
Free bets are mentioned in progression system:
- Earned at level milestones
- Platform-funded
- Wins paid from escrow

**Warning signs:**
- Creating multiple accounts for free bets (Sybil)
- Converting free bets to real value at high rate
- Free bet arbitrage with hedging

**Prevention:**
- Verify free bet payout limits
- Check free bet can't be withdrawn directly
- Monitor for Sybil patterns (same device, IP, behavior)
- Verify free bet escrow is separate from user funds

**Phase:** Promotion/incentive audit

---

## 5. Self-Audit Biases

Critical biases when auditing your own code.

### 5.1 Familiarity Blindness

**Bias:** You know what the code is supposed to do, so you read it as doing that.

**Reality:** According to PCI DSS Requirement 6.3.2, code must be reviewed by someone other than the original author.

**Warning signs:**
- Skimming over complex functions ("I know this works")
- Not reading error handling paths
- Assuming edge cases are handled because you remember adding them

**Prevention:**
- Read code as if you've never seen it
- Use automated tools first (cargo-audit, clippy)
- Have someone else review at least critical paths
- Wait days between writing and auditing

**Which code:** All of it, but especially:
- `calculate_winnings()` (lib.rs:971-1015)
- `verify_session_or_authority()` (lib.rs:928-968)
- `verifyAndLockBalance()` (balanceService.ts:208-249)

---

### 5.2 Confirmation Bias

**Bias:** Looking for evidence that code is correct, not evidence that it's wrong.

**Reality:** Effective audits assume the code is wrong and try to prove it.

**Warning signs:**
- Tests that only cover happy paths
- Dismissing edge cases as "won't happen in practice"
- Rationalizing suspicious patterns

**Prevention:**
- For each function, ask: "How could an attacker break this?"
- Write exploit tests, not just correctness tests
- Challenge every assumption ("Why can't this overflow?")

**Exercise:** For `credit_winnings`:
- What if amount is 0? (checked: line 557)
- What if amount exceeds vault balance? (checked: line 559-563)
- What if authority key is compromised?
- What if same game_id is credited twice?

---

### 5.3 Temporal Bias

**Bias:** Code written recently feels more trustworthy than old code.

**Reality:** Recent code may have overlooked interactions with older code.

**Warning signs:**
- Newer features not fully integrated with existing security checks
- Old code that "works" but has subtle issues
- Copy-pasted patterns from early development

**Prevention:**
- Audit integration points between old and new code
- Verify new features respect existing invariants
- Check if newer patterns should be backported to older code

**In Sol-Battles:** Session betting is newer. Verify it integrates with:
- Original balance management
- Existing rate limiting
- All game modes (Oracle, Battle, Draft, Spectator, LDS, Token Wars)

---

### 5.4 Complexity Avoidance

**Bias:** Skipping audit of complex code because it's tedious.

**Reality:** Complex code is where bugs hide.

**Warning signs:**
- "This function is complex but well-tested"
- "I'll come back to this" (you won't)
- Understanding at 80% level and moving on

**Prevention:**
- Start with the most complex code first
- Draw diagrams for complex flows
- If you can't explain it simply, you don't understand it (and neither does the code)

**Complex areas in Sol-Battles:**
- Off-chain/on-chain balance synchronization
- Multi-game-mode solvency accounting
- Session key + wallet signature dual-path authentication
- Round lifecycle state machine

---

### 5.5 Optimism About External Dependencies

**Bias:** Trusting that libraries and external services work correctly.

**Reality:** External Rust crates may contain vulnerabilities. Pyth oracle "worked as designed" in Mango Markets exploit but still allowed manipulation.

**Warning signs:**
- Not pinning dependency versions
- Using libraries without auditing their security track record
- Trusting oracle data without sanity checks

**Prevention:**
- Run `cargo audit` for known vulnerabilities
- Pin versions in Cargo.toml
- Verify Anchor version 0.32.1 has no known vulnerabilities
- Add sanity checks on oracle prices (is price within 50% of last price?)

**Phase:** Dependency audit

---

## Audit Phase Recommendations

Based on pitfalls, recommended audit phases:

### Phase 1: Automated Analysis
- `cargo audit` for dependencies
- `cargo clippy` for Rust issues
- Anchor verify for deployment matching
- npm audit for backend dependencies

### Phase 2: Smart Contract Deep Dive
- Account validation completeness
- State machine correctness
- Arithmetic safety with extreme values
- Authority function abuse potential

### Phase 3: Backend Security
- Authentication flow completeness
- Race condition analysis
- Database transaction integrity
- Error handling paths

### Phase 4: Integration Points
- On-chain/off-chain state sync
- Oracle integration robustness
- WebSocket event reliability
- Transaction retry/failure handling

### Phase 5: Economic Model
- Invariant verification
- Game theory analysis (hedging, manipulation)
- Solvency guarantees
- Fee calculation accuracy

### Phase 6: External Review
- Have at least one other person review critical paths
- Consider professional audit for on-chain components before mainnet

---

## Sources

### Solana Security Research
- [Solana Smart Contract Audit 2025](https://getfailsafe.com/solana-smart-contract-audit-in-2025/)
- [A Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Common Solana Vulnerabilities](https://github.com/mohammadreza-ashouri/Common-Solana-Vulnerabilities)
- [Solana Security Ecosystem Review 2025](https://solanasec25.sec3.dev/)
- [Rust Memory Safety on Solana](https://threesigma.xyz/blog/rust-and-solana/rust-memory-safety-on-solana)

### Oracle Security
- [Oracle Wars: The Rise of Price Manipulation Attacks - CertiK](https://www.certik.com/resources/blog/oracle-wars-the-rise-of-price-manipulation-attacks)
- [The Full Guide to Price Oracle Manipulation Attacks](https://www.cyfrin.io/blog/price-oracle-manipulation-attacks-with-examples)
- [How Pyth V2 Benefits Solana DeFi](https://medium.com/@innocentnweke/how-will-pyth-v2-pull-oracle-benefit-solana-defi-9e965206e07b)

### Smart Contract Vulnerabilities
- [Smart Contract Security Risks - Cobalt](https://www.cobalt.io/blog/smart-contract-security-risks)
- [Smart Contract Vulnerabilities - QuillAudits](https://www.quillaudits.com/blog/smart-contract/smart-contract-vulnerabilities)
- [Exploring Vulnerabilities in Solana Smart Contracts](https://arxiv.org/html/2504.07419v1)

### Self-Audit and Code Review
- [Code Security Audit - SentinelOne](https://www.sentinelone.com/cybersecurity-101/cybersecurity/code-security-audit/)
- [Code Reviews: A Method to Reveal Costly Mistakes](https://www.securitymetrics.com/blog/code-reviews-method-reveal-costly-mistakes)
- [How to Find Mistakes Earlier - HackerOne](https://www.hackerone.com/vulnerability-management/find-mistakes-save-money-code-security-audit)

---

*Pitfalls analysis: 2026-01-22*
