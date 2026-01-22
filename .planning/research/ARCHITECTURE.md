# Audit Methodology Research

**Project:** Sol-Battles (DegenDome)
**Researched:** 2026-01-22
**Domain:** Hybrid on-chain/off-chain PvP betting platform
**Confidence:** HIGH (based on codebase analysis + industry standards)

## Executive Summary

Sol-Battles is a hybrid system where security depends on the correct interaction between an on-chain Solana smart contract (Anchor/Rust) and an off-chain Node.js backend. The backend acts as the **authority** for the smart contract, meaning backend compromise = protocol compromise. This creates a unique trust model that requires auditing both layers AND their integration points.

**Critical insight:** Most vulnerabilities in this architecture will NOT be found by auditing either layer in isolation. They emerge from incorrect assumptions about what the other layer guarantees.

---

## Audit Order

### Recommended Sequence

The audit should proceed in dependency order - understanding what the on-chain layer guarantees FIRST, then verifying the off-chain layer correctly relies on those guarantees.

```
Phase 1: On-Chain Smart Contract (Foundation)
    |
    v
Phase 2: Authority Key Security (Bridge)
    |
    v
Phase 3: Off-Chain Backend (Consumer)
    |
    v
Phase 4: Integration Testing (Validation)
    |
    v
Phase 5: Full-System Adversarial Testing
```

### Phase 1: On-Chain Smart Contract Audit

**Why first:** The smart contract defines what guarantees exist. The backend DEPENDS on these guarantees - auditing backend first would require assuming the contract works correctly.

**Scope:**
- `programs/session_betting/programs/session_betting/src/lib.rs` (1839 lines)

**Key areas to audit:**

1. **PDA Balance System**
   - Deposit/withdraw integrity (`deposit`, `withdraw` instructions)
   - Balance accounting (`user_balance.balance` field)
   - Reentrancy protection (state updated before transfers)
   - Ownership validation (`NotBalanceOwner` checks)

2. **Session Key System**
   - Session creation restrictions (`create_session`)
   - Session revocation (`revoke_session`)
   - Session-vs-wallet permission boundaries
   - **CRITICAL:** Verify session keys CANNOT withdraw (security invariant)

3. **Round Management (Oracle Game)**
   - Round state machine (`Open` -> `Locked` -> `Settled`)
   - Price oracle integration (Pyth)
   - Timing constraints (`lock_time`, `end_time`)
   - Winner determination logic

4. **Authority Instructions**
   - `transfer_to_global_vault` - backend locks user funds
   - `credit_winnings` - backend credits winners
   - Authority validation on all admin instructions
   - Two-step authority transfer security

5. **Math and Overflow**
   - All arithmetic uses `checked_*` operations
   - u128 intermediate calculations in `calculate_winnings`
   - Fee calculation precision

**Tools:**
- Soteria (Anchor-specific scanner)
- Cargo-Audit (dependency vulnerabilities)
- Manual code review with Solana-specific checklist

**Deliverables:**
- List of contract invariants the backend relies on
- Any on-chain vulnerabilities found
- Recommendations for contract hardening

### Phase 2: Authority Key Security

**Why second:** The backend's authority keypair is the bridge between layers. If compromised, attacker has full protocol control.

**Scope:**
- Key storage and access (`SESSION_BETTING_AUTHORITY_PRIVATE_KEY` env var)
- Key rotation procedures
- Multi-sig status (currently single-key - noted in roadmap as "before mainnet")

**Key areas:**

1. **Key Exposure Points**
   - Environment variable handling in `backend/src/services/balanceService.ts`
   - Logging (ensure private key never logged)
   - Error messages (ensure no key leakage)

2. **Key Permissions**
   - What can the authority do? (Currently: lock funds, credit winnings, start/settle rounds)
   - What SHOULD they be able to do? (Principle of least privilege)

3. **Key Compromise Impact**
   - Can drain all user funds? (Yes - via `credit_winnings` to attacker address)
   - Can manipulate game outcomes? (Yes - via `start_round` with arbitrary prices)
   - Mitigation: Multi-sig (not implemented), rate limiting (not on-chain)

**Deliverables:**
- Authority key security assessment
- Recommendations for multi-sig implementation
- Key rotation procedure documentation

### Phase 3: Off-Chain Backend Audit

**Why third:** Now that we understand what the contract guarantees, we can verify the backend correctly uses those guarantees.

**Scope:**
- `backend/src/services/` (all game services)
- `backend/src/db/` (database operations)
- `backend/src/middleware/` (auth, rate limiting)

**Key areas:**

1. **Balance Service (`balanceService.ts`)**
   - `verifyAndLockBalance()` - atomic check-and-lock (GOOD)
   - `hasSufficientBalance()` - marked deprecated for race condition (GOOD)
   - Game mode solvency checks (`canPayoutFromGameMode`)
   - Pending transaction tracking

2. **Prediction Service (`predictionServiceOnChain.ts`)**
   - Round lifecycle management
   - Bet placement with immediate fund locking
   - Payout calculation (early bird bonus capping - line 624)
   - Price oracle usage (Pyth + Jupiter fallback)

3. **Battle Manager (`battleManager.ts`)**
   - Signature verification for trades (`verifyTradeSignature`)
   - Replay attack prevention (`usedTradeSignatures` map)
   - Ready check fund locking (lines 994-1055)
   - Refund handling on cancellation

4. **Authentication & Authorization**
   - Wallet signature verification
   - Rate limiting effectiveness
   - JWT handling for admin routes

5. **Database Integrity**
   - SQLite transaction boundaries
   - Data consistency between DB and on-chain state

**Deliverables:**
- Backend vulnerability report
- Race condition analysis
- Recommendations for hardening

### Phase 4: Integration Testing

**Why fourth:** Test the seams between layers where most hybrid-system vulnerabilities hide.

**Test categories:**

1. **State Consistency Tests**
   - Does backend balance tracking match on-chain PDA balance?
   - After settlement, are all balances correct on both layers?
   - What happens if on-chain call fails mid-operation?

2. **Timing Attack Tests**
   - Can user withdraw between balance check and lock?
   - Can user place bet after round locked in backend but before on-chain?
   - What if on-chain settlement and backend settlement disagree on timing?

3. **Failure Mode Tests**
   - Backend crashes mid-settlement: funds stuck?
   - RPC node fails: backend retries? user gets stuck?
   - Price feed stale: what happens to active rounds?

4. **Adversarial Tests**
   - Attacker submits same transaction twice (replay)
   - Attacker tries to withdraw locked funds
   - Attacker manipulates WebSocket messages
   - Attacker front-runs settlement transaction

**Deliverables:**
- Integration test suite
- Failure mode documentation
- Recovery procedure recommendations

### Phase 5: Full-System Adversarial Testing

**Why last:** Red team the entire system with knowledge from previous phases.

**Scope:**
- End-to-end attack scenarios
- Economic attack analysis
- Denial of service vectors

---

## Trust Boundaries

### Trust Boundary Diagram

```
+------------------+     TRUST BOUNDARY 1      +------------------+
|                  |                           |                  |
|  USER (Browser)  | <--- WebSocket/HTTP --->  |     BACKEND      |
|                  |                           |  (Node.js/Express)|
|  - Wallet sig    |                           |  - Authority key  |
|  - Session key   |                           |  - Game logic     |
+------------------+                           +------------------+
                                                       |
                                                       |
                                              TRUST BOUNDARY 2
                                                       |
                                                       v
                                               +------------------+
                                               |                  |
                                               |  SMART CONTRACT  |
                                               |  (Solana/Anchor) |
                                               |                  |
                                               |  - PDA balances  |
                                               |  - Fund custody  |
                                               |  - Round state   |
                                               +------------------+
                                                       |
                                              TRUST BOUNDARY 3
                                                       |
                                                       v
                                               +------------------+
                                               |  PYTH ORACLE     |
                                               |  (External)      |
                                               +------------------+
```

### Trust Boundary 1: User <-> Backend

**What crosses this boundary:**
- Wallet signatures (user proves ownership)
- Session key signatures (user authorizes bets)
- WebSocket events (game state, price updates)
- Trade messages (signed by user wallet)

**Trust assumptions:**
- Backend trusts: Valid wallet signatures from user
- User trusts: Backend will correctly execute games and pay winnings
- User trusts: Backend will lock/unlock funds correctly

**Vulnerabilities at this boundary:**
- Signature replay attacks (mitigated: `usedTradeSignatures` tracking)
- WebSocket message spoofing (mitigated: signature verification)
- Session key compromise (mitigated: session keys cannot withdraw)
- Rate limit bypass (mitigated: per-wallet rate limiting)

**Audit focus:**
- Verify ALL user-initiated actions require valid signature
- Verify session key permissions are correctly restricted
- Verify rate limits are effective

### Trust Boundary 2: Backend <-> Smart Contract

**What crosses this boundary:**
- Authority-signed transactions (backend to contract)
- Account data reads (contract to backend)
- Balance updates, round state changes

**Trust assumptions:**
- Contract trusts: Backend authority will act correctly
- Backend trusts: Contract will enforce balance/ownership rules
- Backend trusts: Contract state reflects reality

**Vulnerabilities at this boundary:**
- Backend bugs leading to incorrect authority calls
- Backend reading stale on-chain state
- Backend and contract disagreeing on state
- Transaction ordering / front-running

**Audit focus:**
- Verify backend reads on-chain state BEFORE critical decisions
- Verify backend handles transaction failures correctly
- Verify backend state and on-chain state stay synchronized

### Trust Boundary 3: Smart Contract <-> Pyth Oracle

**What crosses this boundary:**
- Price feed data (Pyth to contract)
- Staleness checks

**Trust assumptions:**
- Contract trusts: Pyth prices are accurate (within staleness window)
- Contract trusts: Pyth price feed account is genuine

**Vulnerabilities at this boundary:**
- Price feed ID mismatch (mitigated: `PriceFeedMismatch` check)
- Stale prices (mitigated: `MAX_PRICE_AGE_SECONDS` = 60)
- Oracle manipulation (mitigated by Pyth's decentralized design)

**Audit focus:**
- Verify correct price feed ID is used
- Verify staleness checks are appropriate
- Verify Pyth integration follows best practices

---

## Critical Integration Points

### Integration Point 1: Fund Locking (Wager Placement)

**Flow:**
```
1. User requests bet via WebSocket
2. Backend checks on-chain PDA balance
3. Backend creates pending transaction record
4. Backend calls transferToGlobalVault on-chain
5. If successful: confirm pending, record bet
6. If failed: cancel pending, reject bet
```

**Files involved:**
- `backend/src/services/balanceService.ts` (verifyAndLockBalance, transferToGlobalVault)
- `backend/src/services/predictionServiceOnChain.ts` (placeBet - line 717)
- `backend/src/services/battleManager.ts` (joinBattle - line 123)
- `programs/session_betting/.../lib.rs` (transfer_to_global_vault - line 488)

**What can go wrong:**
- Race condition: User withdraws between check and lock
  - **Current mitigation:** Atomic check-and-lock in `verifyAndLockBalance`
  - **Audit:** Verify all bet placement paths use atomic lock

- Partial failure: On-chain succeeds, backend recording fails
  - **Current mitigation:** Backend tracks lock TX signature
  - **Audit:** Verify recovery path if backend fails mid-operation

- Balance mismatch: Backend thinks balance is X, chain says Y
  - **Current mitigation:** Always read on-chain balance
  - **Audit:** Verify no cached balance is used for critical decisions

### Integration Point 2: Settlement and Payout

**Flow:**
```
1. Round ends (timer or price movement)
2. Backend determines winner(s)
3. Backend calculates payouts
4. Backend calls creditWinnings for each winner
5. Backend updates off-chain records
```

**Files involved:**
- `backend/src/services/predictionServiceOnChain.ts` (settleRound, calculatePayouts)
- `backend/src/services/battleManager.ts` (endBattle)
- `backend/src/services/balanceService.ts` (creditWinnings)
- `programs/session_betting/.../lib.rs` (credit_winnings - line 542)

**What can go wrong:**
- Double payout: Same winner credited twice
  - **Current mitigation:** Bet status tracking (pending/won/lost)
  - **Audit:** Verify idempotency of settlement

- Payout exceeds pool: Early bird bonus pushes total above available
  - **Current mitigation:** Scale factor normalization (line 624)
  - **Audit:** Verify math cannot exceed locked funds

- Settlement timing: Backend settles, then round state changes
  - **Current mitigation:** On-chain round status check
  - **Audit:** Verify settlement is atomic

- Game mode solvency: Oracle game drains Battle game's locked funds
  - **Current mitigation:** Per-game-mode balance tracking
  - **Audit:** Verify `canPayoutFromGameMode` is always checked

### Integration Point 3: Price Oracle Usage

**Flow:**
```
1. Backend fetches price from Jupiter (off-chain)
2. Backend starts round with this price
3. At lock time: Backend calls lock_round with Pyth price (on-chain)
4. At settle time: Backend settles with on-chain winner determination
```

**Files involved:**
- `backend/src/services/priceService.ts` (Jupiter API)
- `backend/src/services/pythVerificationService.ts` (Pyth verification)
- `backend/src/services/predictionServiceOnChain.ts` (lockRound)
- `programs/session_betting/.../lib.rs` (lock_round - line 129)

**What can go wrong:**
- Price discrepancy: Jupiter and Pyth prices differ significantly
  - **Current approach:** Start price from Jupiter, lock price from Pyth
  - **Audit:** Verify this discrepancy is acceptable for game fairness

- Stale lock price: Round locked with old price
  - **Current mitigation:** 60-second staleness check on-chain
  - **Audit:** Verify 60 seconds is appropriate for 30-second rounds

- Fallback lock: Anyone can lock after timeout
  - **Feature:** `lock_round_fallback` allows permissionless locking
  - **Audit:** Verify this cannot be exploited

### Integration Point 4: Session Key Authorization

**Flow:**
```
1. User creates session key via wallet signature
2. Session key stored on-chain (SessionToken PDA)
3. User can bet using session key (no wallet popup)
4. Session key CANNOT withdraw
```

**Files involved:**
- `web/src/hooks/useSessionBetting.ts` (session creation)
- `programs/session_betting/.../lib.rs` (verify_session_or_authority - line 929)

**What can go wrong:**
- Session key can withdraw: CRITICAL if this invariant breaks
  - **On-chain protection:** Withdraw requires wallet signer, not session
  - **Audit:** Verify withdraw cannot use session key

- Session expiry bypass: Expired session still works
  - **On-chain protection:** `SessionExpired` check
  - **Audit:** Verify clock manipulation cannot bypass

- Session for wrong user: Session authorizes wrong wallet
  - **On-chain protection:** `SessionAuthorityMismatch` check
  - **Audit:** Verify PDA seed derivation prevents this

### Integration Point 5: Ready Check and Refunds

**Flow:**
```
1. Matchmaking finds two players
2. Backend locks BOTH players' funds on-chain
3. Players have 30 seconds to accept
4. If both accept: Battle starts (funds stay locked)
5. If timeout/decline: Battle cancelled, funds refunded
```

**Files involved:**
- `backend/src/services/battleManager.ts` (createReadyCheck - line 994)
- `backend/src/services/balanceService.ts` (refundFromGlobalVault)

**What can go wrong:**
- One player locked, other fails: Need to refund first player
  - **Current mitigation:** Lines 1028-1055 handle partial failure
  - **Audit:** Verify refund always succeeds or is logged for manual intervention

- Timeout after both locked: Both players need refund
  - **Current mitigation:** `cancelReadyCheck` refunds both
  - **Audit:** Verify refund cannot be blocked or exploited

- Race between accept and timeout
  - **Audit:** Verify state machine prevents double-processing

---

## Suggested Phase Structure

Based on the audit order and integration points, here is the recommended phase breakdown:

### Phase 1: On-Chain Foundation (1-2 weeks)

**Goals:**
- Document all contract invariants
- Identify any on-chain vulnerabilities
- Produce list of guarantees backend relies on

**Deliverables:**
- Contract invariants document
- On-chain vulnerability report
- Test coverage recommendations

**Needs deeper research flag:** NO (well-understood Anchor patterns)

### Phase 2: Authority and Key Management (3-5 days)

**Goals:**
- Assess authority key security
- Document key compromise impact
- Plan multi-sig implementation

**Deliverables:**
- Key security assessment
- Multi-sig implementation plan
- Emergency procedures

**Needs deeper research flag:** YES (multi-sig implementation options for Solana)

### Phase 3: Off-Chain Backend (1-2 weeks)

**Goals:**
- Review all game services for correctness
- Identify race conditions
- Verify error handling

**Deliverables:**
- Backend vulnerability report
- Race condition fixes
- Error handling improvements

**Needs deeper research flag:** NO (standard Node.js patterns)

### Phase 4: Integration Testing (1 week)

**Goals:**
- Test state consistency across layers
- Test failure modes
- Test timing attacks

**Deliverables:**
- Integration test suite
- Failure mode documentation
- Recovery procedures

**Needs deeper research flag:** NO (testing is deterministic)

### Phase 5: Adversarial Testing (1 week)

**Goals:**
- Red team the entire system
- Economic attack analysis
- DoS analysis

**Deliverables:**
- Attack scenario report
- Economic attack mitigations
- DoS mitigations

**Needs deeper research flag:** YES (may find novel attack vectors)

---

## Specific Vulnerabilities to Investigate

Based on codebase analysis, prioritize investigating these specific areas:

### High Priority

1. **Balance race condition in `hasSufficientBalance`**
   - File: `backend/src/services/balanceService.ts` line 195
   - Issue: Marked deprecated but may still be called
   - Action: Search all callers, verify none use for critical decisions

2. **Early bird bonus overflow**
   - File: `backend/src/services/predictionServiceOnChain.ts` line 624
   - Issue: Scale factor added, verify it cannot be bypassed
   - Action: Mathematical proof that payouts <= locked funds

3. **Ready check partial failure**
   - File: `backend/src/services/battleManager.ts` line 1028
   - Issue: Complex refund logic on partial lock failure
   - Action: Test all failure paths

4. **Free bet spoofing**
   - File: `backend/src/services/battleManager.ts` line 187
   - Issue: `isFreeBet` flag comes from client - verify server validates
   - Action: Trace `isFreeBet` origin, verify atomic deduction

### Medium Priority

5. **Signature replay in battles**
   - File: `backend/src/services/battleManager.ts` line 95
   - Issue: `usedTradeSignatures` is in-memory, lost on restart
   - Action: Evaluate persistence requirement

6. **Price feed discrepancy**
   - Issue: Start price (Jupiter) vs lock price (Pyth) can differ
   - Action: Measure typical discrepancy, evaluate game fairness impact

7. **Session key expiry handling**
   - File: `programs/session_betting/.../lib.rs` line 955
   - Issue: Verify clock cannot be manipulated
   - Action: Review Solana clock security

### Lower Priority

8. **Global vault solvency monitoring**
   - Issue: No automated alerts if vault balance drops below expected
   - Action: Recommend monitoring implementation

9. **Rate limit effectiveness**
   - File: `backend/src/middleware/socketRateLimiter.ts`
   - Issue: In-memory rate limiting, not distributed
   - Action: Evaluate for multi-instance deployment

---

## Sources

- [Hacken - Solana Smart Contract Security Audit](https://hacken.io/services/blockchain-security/solana-smart-contract-security-audit/)
- [Chainlink - Ultimate Guide to Blockchain Oracle Security](https://chain.link/resources/blockchain-oracle-security)
- [Web3 Security Audits That Work in 2025](https://nekavc.medium.com/web3-security-audits-that-work-in-2025-a-practical-playbook-18cdd5543706)
- [Beosin - Solana Cross-Chain Protocol Security Audit](https://beosin.com/resources/solana-cross-chain-protocol-analysis-and-security-audit-key-points)
- [QuillAudits - Solana Smart Contract Auditing Guide](https://www.quillaudits.com/blog/smart-contract/solana-smart-contract-auditing-guide)
- [sannykim/solsec - Solana Security Resources](https://github.com/sannykim/solsec)
- [Cross-Chain Smart Contract Audits](https://medium.com/predict/cross-chain-smart-contract-audits-how-to-secure-multi-network-deployments-eb0abc1c08dc)

---

*Research completed: 2026-01-22*
