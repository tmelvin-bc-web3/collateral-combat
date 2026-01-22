# Audit Coverage Research

**Domain:** PvP Betting Platform Code & Security Audit
**Researched:** 2026-01-22
**Overall Confidence:** HIGH (based on OWASP, Solana security best practices, and Sealevel attacks documentation)

---

## Code Quality Checklist

### Table Stakes

Every code audit must cover these fundamentals regardless of application type.

| Item | What to Check | Severity |
|------|---------------|----------|
| **Dead Code Detection** | Unused functions, unreachable code paths, commented-out code, unused imports/variables | Medium |
| **Code Redundancy** | Duplicate logic, copy-paste code, opportunities for abstraction | Medium |
| **Naming Conventions** | Consistent naming (camelCase vs snake_case), descriptive names, no single-letter variables except iterators | Low |
| **Type Safety** | No `any` types, explicit return types, proper null/undefined handling, strict TypeScript settings enabled | High |
| **Error Handling** | All errors caught and handled appropriately, no swallowed exceptions, meaningful error messages | High |
| **Console/Debug Statements** | No `console.log` in production code, debug flags disabled | Medium |
| **Linting Compliance** | ESLint/Prettier pass without warnings, consistent formatting | Low |
| **Dependency Hygiene** | No duplicate libraries (e.g., moment + date-fns), outdated packages flagged | Medium |
| **Test Coverage** | Critical paths have tests, mocks use real types not `any` | Medium |
| **Documentation** | Public APIs documented, complex logic explained, no stale comments | Low |

### Deep Dive (Betting Platform Specific)

Given this is a financial/betting application handling real money, additional code quality items.

| Item | What to Check | Why It Matters | Severity |
|------|---------------|----------------|----------|
| **Balance Calculations** | All arithmetic uses checked operations, no floating point for money | Rounding errors = lost funds | Critical |
| **State Consistency** | Balance updates atomic, state machine transitions valid | Inconsistent state = exploitable | Critical |
| **Price Handling** | Price data properly typed (lamports vs SOL), decimal handling correct | Price confusion = wrong payouts | High |
| **Timeout/Duration Logic** | Round timing calculations correct, no off-by-one errors | Timing bugs = unfair outcomes | High |
| **Fee Calculations** | Platform fee (5%) calculated correctly, basis points handled properly | Fee errors = revenue loss or user distrust | High |
| **Payout Logic** | Winner determination correct, proportional payout math verified | Wrong payouts = critical bug | Critical |
| **Pool Accounting** | up_pool + down_pool = total_pool always true | Accounting mismatch = lost funds | Critical |
| **Event Emission** | All state changes emit audit events, events have correct data | Missing audit trail = compliance issue | Medium |
| **Idempotency** | Repeated actions don't cause double-effects (double payouts, double bets) | Replay attacks possible | Critical |
| **Graceful Degradation** | What happens when price feed fails? When backend offline? | Service failures shouldn't lose funds | High |

---

## Security Audit Checklist

### Table Stakes

Standard web application security items based on [OWASP Top 10 2025](https://owasp.org/Top10/2025/).

| Category | Items to Check | Severity |
|----------|----------------|----------|
| **A01: Broken Access Control** | Authorization on all endpoints, can users access other users' data, privilege escalation paths | Critical |
| **A02: Security Misconfiguration** | Default credentials, verbose error messages, unnecessary features enabled, CORS properly configured | High |
| **A03: Injection** | SQL injection (parameterized queries), command injection, NoSQL injection | Critical |
| **A07: Authentication Failures** | Session management, token validation, password handling (if applicable), wallet signature verification | Critical |
| **Input Validation** | All user inputs validated server-side, allowlist validation, type coercion handled | High |
| **Rate Limiting** | API rate limits in place, WebSocket rate limits, brute force protection | Medium |
| **Sensitive Data Exposure** | Secrets not in code, environment variables protected, no sensitive data in logs | High |
| **HTTPS/TLS** | All traffic encrypted, secure cookies, no mixed content | High |
| **Logging & Monitoring** | Security events logged, tamper-resistant logs, alerting configured | Medium |
| **Dependency Vulnerabilities** | `npm audit` / `cargo audit` clean, known CVEs addressed | High |

### Deep Dive (Financial/Betting Application)

Security items specific to applications handling real money and gambling mechanics.

| Category | Items to Check | Why It Matters | Severity |
|----------|----------------|----------------|----------|
| **Wallet Authentication** | Signature verification correct, nonce/replay protection, signature reuse prevented | Stolen funds if broken | Critical |
| **Session Key Security** | Session keys CANNOT withdraw (verify!), expiration enforced, revocation works | Session theft = catastrophic | Critical |
| **Balance Manipulation** | Can users manipulate their balance? Double-spend prevention? | Direct financial loss | Critical |
| **Race Conditions (TOCTOU)** | Balance check vs balance use atomic? Bet placement has proper locking? | [Exploitable double-spend](https://portswigger.net/web-security/race-conditions) | Critical |
| **Oracle Manipulation** | Price feed tamper-proof, staleness checked, fallback handling | Manipulated prices = unfair outcomes | Critical |
| **Withdrawal Limits** | Any withdrawal limits? Velocity checks? Large withdrawal alerts? | Drain attacks | High |
| **Round Timing Attacks** | Can users predict/manipulate round outcomes? Front-running possible? | Unfair advantage | High |
| **Authority Key Security** | Private key storage, key rotation plan, multi-sig for critical operations | Single point of failure | Critical |
| **Pending Transaction Handling** | What happens to pending transactions during failures? Replay possible? | State inconsistency | High |
| **WebSocket Security** | Authentication required, message validation, connection hijacking prevented | Impersonation attacks | High |
| **Admin Panel Security** | Admin routes protected, admin actions logged, principle of least privilege | Unauthorized admin access | Critical |
| **Payout Solvency** | Global vault balance >= pending payouts? Insolvency detection? | Can't pay winners | Critical |

---

## Smart Contract Audit Checklist

### Solana/Anchor Specific

Based on [Sealevel Attacks](https://github.com/coral-xyz/sealevel-attacks), [SlowMist Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices), and [Helius Security Guide](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security).

| Vulnerability | What to Check | Anchor Mitigation | Severity |
|---------------|---------------|-------------------|----------|
| **Missing Signer Check** | All privileged instructions verify signer, `Signer<'info>` used appropriately | Use `Signer` type, verify `is_signer` | Critical |
| **Missing Owner Check** | Account ownership validated before use | Use `Account<'info, T>`, `#[account(owner = ...)]` | Critical |
| **Account Reinitialization** | `init` used instead of manual initialization, no `init_if_needed` without checks | Anchor's `init` constraint sets discriminator | Critical |
| **PDA Seed Manipulation** | PDA seeds cannot be manipulated by attacker, proper seed derivation | Verify seed sources, use program-controlled seeds | High |
| **Integer Overflow/Underflow** | All arithmetic uses `checked_*` operations, `overflow-checks = true` in Cargo.toml | Enable overflow checks, use checked math | Critical |
| **Type Confusion** | Account discriminators verified, no manual deserialization bypassing Anchor | Use Anchor's `Account<'info, T>` which checks 8-byte discriminator | High |
| **Unauthorized CPI** | CPI targets verified (program ID checked), account privileges properly propagated | Verify target program ID, use `CpiContext` | High |
| **Account Close Vulnerabilities** | Closed accounts zeroed, can't be reopened/reused | Use Anchor's `close` constraint, ensure rent reclaimed | High |
| **Stale Account Data After CPI** | Account data reloaded after CPI if used again | Call `.reload()` after CPI | Medium |
| **Rent Exemption** | Accounts are rent-exempt, rent reclamation handled properly | Anchor handles automatically with `init` | Medium |
| **Bump Seed Canonicalization** | Using canonical bump, stored in account for future use | Store bump in account struct | Medium |

### Betting Logic Specific (On-Chain)

Security items specific to the betting/prediction smart contract.

| Item | What to Check | Severity |
|------|---------------|----------|
| **Round State Machine** | Transitions only valid: Open -> Locked -> Settled, no invalid transitions | Critical |
| **Bet Placement Window** | Bets rejected after lock_time, timing enforced on-chain not just backend | Critical |
| **Winner Determination** | start_price vs end_price comparison correct, draw handling correct | Critical |
| **Payout Calculation** | Proportional share calculation overflow-safe, division by zero handled | Critical |
| **Fee Collection** | Platform fee calculated correctly, fees tracked accurately | High |
| **Double Claim Prevention** | Position marked claimed BEFORE payout, `claimed` flag verified | Critical |
| **Global Vault Solvency** | Cannot payout more than vault balance, checked before transfer | Critical |
| **Price Oracle Security** | Pyth feed ID verified, price staleness checked, fallback mechanism safe | Critical |
| **Authority Escalation** | Two-step authority transfer, no accidental lockout | High |
| **Emergency Pause** | Pause flag checked on all user-facing instructions | High |
| **Grace Period Enforcement** | Round closure only after grace period, users have time to claim | Medium |
| **Event Emission** | All bets, settlements, payouts emit events for audit trail | Medium |

### Anchor Framework Specific

Items that even Anchor doesn't fully protect against (from [Korea Institute research](https://koreascience.or.kr/article/JAKO202530754035588.page)).

| Item | Risk | Manual Check Required |
|------|------|----------------------|
| **Missing Signer Check** | Anchor's `Signer` helps but not automatic | Verify signer on authority-only instructions |
| **Missing Owner Check** | Anchor's `Account` helps but not for `AccountInfo` | Check `/// CHECK:` accounts manually |
| **CPI Account Privileges** | Anchor doesn't validate CPI targets automatically | Verify CPI target program IDs |
| **Business Logic Flaws** | Anchor can't detect logic errors | Manual review of all betting logic |

---

## Often Missed

Items that auditors commonly skip but are critical for betting platforms.

### 1. Backend/On-Chain State Synchronization

**What's missed:** Assuming backend state matches on-chain state.

**Why it matters:** Backend might show different balance than on-chain reality.

**Check:**
- Backend reads on-chain balance before allowing actions
- Pending transactions tracked to prevent double-spending during settlement
- Reconciliation mechanism exists

### 2. WebSocket Race Conditions

**What's missed:** Concurrent WebSocket messages causing race conditions.

**Why it matters:** Two "place bet" messages could both succeed when balance only allows one.

**Check:**
- Socket message processing is serialized per user
- Balance checks are atomic with deduction
- No TOCTOU between validation and action

### 3. Error Message Information Leakage

**What's missed:** Error messages revealing internal state.

**Why it matters:** Attackers can probe system state through detailed errors.

**Check:**
- Generic errors to clients, detailed logs server-side
- No stack traces in production
- No internal IDs or implementation details leaked

### 4. Timing Side Channels

**What's missed:** Response timing revealing information.

**Why it matters:** Timing attacks can reveal if user exists, if balance is low, etc.

**Check:**
- Constant-time comparisons for security checks
- Similar response times for success/failure
- Rate limiting prevents timing attacks

### 5. Session Key Scope Creep

**What's missed:** Session keys gaining more permissions over time.

**Why it matters:** Session keys should ONLY bet, never withdraw.

**Check:**
- Withdrawal instruction explicitly requires wallet signature (no session)
- Session-enabled instructions enumerated and limited
- No "admin" session keys possible

### 6. Partial Transaction Failures

**What's missed:** What happens when a transaction partially fails?

**Why it matters:** User pays but bet not recorded, or bet recorded but not paid.

**Check:**
- Atomic transactions where possible
- Rollback mechanisms for failures
- Retry logic doesn't cause duplicates

### 7. Time Zone and Clock Drift

**What's missed:** Server vs blockchain time differences.

**Why it matters:** Round timing could be exploited if clocks differ significantly.

**Check:**
- Using on-chain `Clock::get()` for all timing decisions
- No reliance on backend system clock for betting windows
- Tolerance for reasonable clock drift

### 8. Third-Party Dependency Risks

**What's missed:** Transitive dependencies with vulnerabilities.

**Why it matters:** Your code is safe but a dependency isn't.

**Check:**
- `npm audit` / `cargo audit` run and clean
- Pyth SDK version is current
- Anchor version is current (0.31.1 specified)
- No deprecated dependencies

### 9. Event Ordering Guarantees

**What's missed:** WebSocket event order not guaranteed.

**Why it matters:** Round "settled" event arrives before "locked" event.

**Check:**
- Client handles out-of-order events gracefully
- Sequence numbers or timestamps on events
- Stale events ignored

### 10. Emergency Procedures

**What's missed:** No runbook for incidents.

**Why it matters:** When things go wrong, panic causes worse decisions.

**Check:**
- Pause mechanism tested and works
- Authority key backup and recovery plan
- User communication plan for incidents
- Fund recovery procedures documented

### 11. Log Injection

**What's missed:** User-controlled data in logs.

**Why it matters:** Attackers can inject misleading log entries or exploit log viewers.

**Check:**
- User input sanitized before logging
- No newline injection in logs
- Structured logging (JSON) prevents injection

### 12. Deserialization Attacks

**What's missed:** Deserializing user-provided data unsafely.

**Why it matters:** Malicious payloads can exploit deserializers.

**Check:**
- JSON parsing has size limits
- No `eval()` or dynamic code execution
- Borsh deserialization uses Anchor's safe methods

---

## What Makes an Audit "Comprehensive"

A comprehensive audit for this betting platform must cover:

### Coverage Dimensions

1. **Code Quality** - Clean, maintainable, type-safe code
2. **Functional Security** - Authentication, authorization, input validation
3. **Financial Security** - Balance integrity, payout correctness, race conditions
4. **Smart Contract Security** - Solana-specific vulnerabilities, Anchor best practices
5. **Operational Security** - Monitoring, alerting, incident response

### Depth Requirements

| Layer | Shallow Audit | Comprehensive Audit |
|-------|---------------|---------------------|
| Frontend | ESLint passes | + Type safety, XSS prevention, secure storage |
| Backend | No SQL injection | + Race conditions, auth bypass, WebSocket security |
| Smart Contract | Compiles, basic tests | + All Sealevel attacks, business logic review, oracle security |
| Infrastructure | Secrets not in code | + Key management, backup verification, monitoring coverage |

### Deliverables

A comprehensive audit produces:
1. **Issues Log** - Every issue found with severity, location, and fix
2. **Fixed Code** - All issues actually fixed, not just documented
3. **Verification** - Tests proving fixes work
4. **Residual Risk** - Known limitations, accepted risks, future concerns

---

## Sources

### Solana/Anchor Security
- [Sealevel Attacks Repository (Coral/Anchor)](https://github.com/coral-xyz/sealevel-attacks)
- [SlowMist Solana Security Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices)
- [Helius Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security)
- [Sec3 Blog - How to Audit Solana Smart Contracts](https://www.sec3.dev/blog/how-to-audit-solana-smart-contracts-part-1-a-systematic-approach)
- [Solana Reinitialization Attacks Documentation](https://solana.com/developers/courses/program-security/reinitialization-attacks)
- [CoinFabrik - How to Audit Solana Smart Contracts](https://www.coinfabrik.com/blog/how-to-audit-solana-smart-contracts/)

### Web Application Security
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Proactive Controls](https://www.securityjourney.com/post/owasp-top-10-proactive-controls)
- [PortSwigger Race Conditions Guide](https://portswigger.net/web-security/race-conditions)
- [TOCTOU Guide by Facundo Fernandez](https://fdzdev.medium.com/guide-to-identifying-and-exploiting-toctou-race-conditions-in-web-applications-c5f233e32b7f)

### Code Quality
- [Microsoft Engineering Playbook - JS/TS Code Reviews](https://microsoft.github.io/code-with-engineering-playbook/code-reviews/recipes/javascript-and-typescript/)
- [BestPractices.tech TypeScript Quality Checklist](https://www.bestpractices.tech/post/master-typescript-quality-with-this-essential-checklist)
- [Bito TypeScript Code Review Guide](https://bito.ai/blog/typescript-code-review/)

### Betting/Gaming Security
- [UK Gambling Commission Security Audit Advice](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/security-audit-advice)
- [GLI Gaming Security & Vulnerability Compliance](https://gaminglabs.com/services/igaming/security-auditing-vulnerability-analysis/)
