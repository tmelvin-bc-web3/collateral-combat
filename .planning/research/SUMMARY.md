# Project Research Summary

**Project:** Sol-Battles (DegenDome) Security Audit
**Domain:** Hybrid on-chain/off-chain PvP betting platform code and security audit
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

Sol-Battles is a hybrid PvP betting platform where security depends on the correct interaction between an on-chain Solana smart contract (Anchor/Rust) and an off-chain Node.js backend. The backend acts as the **authority** for the smart contract, meaning backend compromise equals protocol compromise. This creates a unique trust model that requires auditing both layers AND their integration points. Most vulnerabilities in this architecture will NOT be found by auditing either layer in isolation - they emerge from incorrect assumptions about what the other layer guarantees.

The recommended approach is a dependency-ordered audit: start with the on-chain smart contract (defines guarantees), then authority key security (the bridge), followed by the off-chain backend (relies on guarantees), integration testing (validates the seams), and finally adversarial testing. The research identifies 12+ commonly missed issues in betting platform audits, including business logic flaws, access control gaps in authority functions, state synchronization between on-chain and off-chain, and economic invariant violations.

Key risks include: (1) Race conditions in balance checking/locking that could enable double-spending, (2) Authority key single point of failure (currently single-key, multi-sig planned but not implemented), (3) State desynchronization between backend SQLite and on-chain PDAs, and (4) Early bird bonus calculations that could exceed locked funds. Mitigation strategies are documented for each risk, with specific code locations identified for investigation.

---

## Key Findings

### Audit Tools

**Summary from STACK.md**

A comprehensive toolkit exists for auditing this codebase across both TypeScript/Node.js and Solana/Anchor layers. The recommended approach uses automated tools first for quick wins, followed by manual review for business logic and integration points.

**Core technologies:**
- **Knip**: Dead code detection for TypeScript - identifies unused files, exports, and dependencies with framework awareness
- **sec3 X-Ray**: Primary Solana smart contract scanner - detects 50+ vulnerability types including all Sealevel attacks and Neodyme pitfalls
- **Semgrep**: Comprehensive security scanning for OWASP Top 10, injection flaws, and taint analysis across backend
- **Gitleaks + TruffleHog**: Secret detection - use BOTH as they find different secrets; critical for detecting leaked authority keys
- **cargo-audit + npm audit**: Dependency vulnerability scanning for Rust and Node.js respectively
- **type-coverage**: Track TypeScript type safety and identify dangerous `any` usage

**Recommended workflow:**
1. Quick wins: `npm/pnpm audit`, `cargo audit`, secret scanning (zero config)
2. Code quality: Knip, type-coverage, ESLint complexity rules
3. Security scanning: eslint-plugin-security, Semgrep OWASP rules, sec3 X-Ray
4. Deep analysis: Trident fuzzing for critical smart contract functions

### Audit Coverage

**Summary from FEATURES.md**

The audit must cover five dimensions: code quality, functional security, financial security, smart contract security, and operational security. Betting/financial applications have additional critical requirements beyond standard web applications.

**Must audit (table stakes):**
- Dead code detection, type safety, error handling
- Authentication, authorization, input validation (OWASP Top 10)
- Session key verification, rate limiting, HTTPS/TLS
- All Sealevel attacks: missing signer check, missing owner check, PDA manipulation, integer overflow
- Dependency vulnerabilities across all package managers

**Must audit (betting-specific):**
- Balance calculations (checked arithmetic, no floating point)
- Race conditions in balance check vs balance use (TOCTOU)
- Round state machine transitions (Open -> Locked -> Settled)
- Winner determination and payout calculation correctness
- Double claim prevention, global vault solvency
- Price oracle security (Pyth staleness, feed ID verification)
- Session key scope creep (verify CANNOT withdraw)

**Often missed items:**
- Backend/on-chain state synchronization
- WebSocket race conditions (concurrent messages)
- Error message information leakage
- Timing side channels
- Partial transaction failures and retry logic
- Time zone and clock drift between server and blockchain
- Event ordering guarantees in WebSocket

### Audit Order

**Summary from ARCHITECTURE.md**

The audit must proceed in dependency order - understanding what the on-chain layer guarantees FIRST, then verifying the off-chain layer correctly relies on those guarantees.

**Recommended sequence:**
1. **On-Chain Smart Contract (Foundation)** - Documents all contract invariants the backend relies on
2. **Authority Key Security (Bridge)** - Assesses the single point of failure and multi-sig needs
3. **Off-Chain Backend (Consumer)** - Verifies correct use of on-chain guarantees
4. **Integration Testing (Validation)** - Tests state consistency, timing attacks, failure modes
5. **Adversarial Testing** - Red team the full system with knowledge from previous phases

**Critical integration points identified:**
1. Fund locking (wager placement) - `verifyAndLockBalance()` -> `transferToGlobalVault`
2. Settlement and payout - `settleRound()` -> `creditWinnings`
3. Price oracle usage - Jupiter (off-chain start price) vs Pyth (on-chain lock/settle price)
4. Session key authorization - verify session cannot withdraw, only bet
5. Ready check and refunds - partial failure handling in Battle matchmaking

### Critical Pitfalls

**Top warnings from PITFALLS.md**

1. **Business Logic Flaws** - Auditors focus on code syntax over game logic correctness. Test every combination: UP wins, DOWN wins, DRAW, empty pools, single bettor. Verify `total_payouts + fees <= total_pool` invariant.

2. **"Anchor Handles It" Trap** - Missing Signer Check and Missing Owner Check remain exploitable even with Anchor in certain configurations. Audit every `/// CHECK:` comment - verify validation is actually performed.

3. **"Checked Math Prevents Overflow" Trap** - Checked math prevents overflow but NOT precision loss in division, incorrect order of operations, or off-by-one errors. Division followed by multiplication loses precision. Test with MIN_BET and MAX_BET against extreme pool sizes.

4. **Off-Chain/On-Chain State Desync** - Database transaction fails after on-chain success, or vice versa. Test: What happens if backend crashes mid-settlement? Verify `cleanupOldTransactions()` doesn't delete active games.

5. **Self-Audit Biases** - Familiarity blindness (reading code as intended, not as written), confirmation bias (looking for correctness, not bugs), complexity avoidance (skipping tedious complex functions). PCI DSS requires review by someone other than original author.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Automated Analysis
**Rationale:** Zero-config tools surface immediate issues with no setup time. Establishes baseline.
**Delivers:** Dependency vulnerability report, secret scan results, basic code quality metrics
**Addresses:** Dependency hygiene, leaked secrets, basic code quality
**Avoids:** Missing obvious vulnerabilities that tools catch automatically
**Duration:** 1-2 days

### Phase 2: On-Chain Smart Contract Audit
**Rationale:** The contract defines what guarantees exist. Backend DEPENDS on these - can't audit backend without knowing contract invariants.
**Delivers:** Contract invariants document, on-chain vulnerability report, test coverage recommendations
**Uses:** sec3 X-Ray, cargo-audit, cargo-clippy, manual review with Sealevel checklist
**Implements:** Foundation layer validation
**Avoids:** Auditing backend with incorrect assumptions about contract guarantees
**Duration:** 1-2 weeks

### Phase 3: Authority Key Security
**Rationale:** The backend's authority keypair is the bridge between layers. If compromised, attacker has full protocol control.
**Delivers:** Key security assessment, multi-sig implementation plan, emergency procedures
**Addresses:** Key exposure points, key permissions scope, compromise impact analysis
**Avoids:** Single point of failure, key leakage via logs/errors
**Duration:** 3-5 days

### Phase 4: Off-Chain Backend Audit
**Rationale:** Now that contract guarantees are documented, verify backend correctly uses them.
**Delivers:** Backend vulnerability report, race condition fixes, error handling improvements
**Uses:** Semgrep, eslint-plugin-security, manual review of balance service and game services
**Implements:** Consumer layer validation
**Avoids:** Race conditions in `hasSufficientBalance`, early bird bonus overflow
**Duration:** 1-2 weeks

### Phase 5: Integration Testing
**Rationale:** Test the seams between layers where most hybrid-system vulnerabilities hide.
**Delivers:** Integration test suite, failure mode documentation, recovery procedures
**Addresses:** State consistency, timing attacks, failure modes, adversarial scenarios
**Avoids:** State desync between backend and blockchain, partial transaction failures
**Duration:** 1 week

### Phase 6: Economic Model & Adversarial Testing
**Rationale:** Red team the entire system with knowledge from all previous phases.
**Delivers:** Attack scenario report, economic attack mitigations, DoS mitigations
**Addresses:** Pool imbalance attacks, frontrunning/MEV, house insolvency
**Avoids:** Novel attack vectors discovered in integration
**Duration:** 1 week

### Phase Ordering Rationale

- **Dependency order:** On-chain first because backend depends on contract guarantees. Authority key second because it bridges layers. Backend third because it relies on both.
- **Integration grouping:** Integration testing after both layers are individually audited - tests the seams, not the components.
- **Pitfall avoidance:** Automated analysis first surfaces quick wins. Economic model last requires understanding full system.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Authority Key Security):** Multi-sig implementation options for Solana need investigation - Squads, Realm, custom
- **Phase 6 (Adversarial Testing):** May discover novel attack vectors requiring additional research

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Automated Analysis):** Well-documented tools with clear usage
- **Phase 2 (Smart Contract):** Well-understood Anchor patterns, Sealevel attacks documented
- **Phase 4 (Backend):** Standard Node.js security patterns, OWASP guidelines

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack (Tools) | HIGH | All tools verified with official documentation, active maintenance, Solana-specific options confirmed |
| Coverage (Features) | HIGH | Based on OWASP Top 10 2025, Sealevel Attacks, SlowMist best practices, Helius security guide |
| Architecture (Order) | HIGH | Dependency-based ordering well-established for hybrid audits, trust boundaries clearly identified |
| Pitfalls | HIGH | 163 Solana audits analyzed (1,669 vulnerabilities), codebase-specific locations identified |

**Overall confidence:** HIGH

### Gaps to Address

- **Multi-sig implementation:** Which Solana multi-sig solution is best for this use case? Research needed during Phase 3.
- **Price discrepancy tolerance:** Jupiter (off-chain) vs Pyth (on-chain) price discrepancy - what's acceptable for game fairness?
- **Signature replay persistence:** `usedTradeSignatures` is in-memory, lost on restart. Evaluate if persistence is required.
- **External review:** PCI DSS recommends review by non-author. Consider professional audit for on-chain components before mainnet.

---

## Specific Vulnerabilities to Investigate

**High Priority (from PITFALLS.md):**
1. `hasSufficientBalance` marked deprecated but may still be called - search all callers
2. Early bird bonus overflow - mathematical proof that payouts <= locked funds
3. Ready check partial failure - test all refund paths in battleManager.ts
4. Free bet spoofing - trace `isFreeBet` origin, verify atomic deduction

**Medium Priority:**
5. Signature replay persistence across restarts
6. Price feed discrepancy measurement
7. Session key expiry clock manipulation

---

## Sources

### Primary (HIGH confidence)
- [Sealevel Attacks Repository](https://github.com/coral-xyz/sealevel-attacks) - Solana vulnerability patterns
- [SlowMist Solana Security Best Practices](https://github.com/slowmist/solana-smart-contract-security-best-practices) - Smart contract security
- [Helius Hitchhiker's Guide to Solana Program Security](https://www.helius.dev/blog/a-hitchhikers-guide-to-solana-program-security) - Comprehensive security guide
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/) - Web application security
- [Knip Official](https://knip.dev) - Dead code detection
- [sec3 X-Ray GitHub](https://github.com/sec3-product/x-ray) - Solana vulnerability scanner
- [Semgrep Documentation](https://semgrep.dev/docs/) - Static analysis

### Secondary (MEDIUM confidence)
- [Sec3 Blog - How to Audit Solana Smart Contracts](https://www.sec3.dev/blog/how-to-audit-solana-smart-contracts-part-1-a-systematic-approach)
- [PortSwigger Race Conditions Guide](https://portswigger.net/web-security/race-conditions)
- [UK Gambling Commission Security Audit Advice](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/security-audit-advice)

### Tertiary (LOW confidence - needs validation)
- Korea Institute research on Anchor vulnerabilities - confirms two vuln types remain exploitable
- Solana Security Ecosystem Review 2025 - overall ecosystem assessment

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
