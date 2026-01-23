# Phase 9: Integration - Research

**Researched:** 2026-01-23
**Domain:** Cross-cutting concerns verification, multi-sig implementation, economic model validation
**Confidence:** HIGH

## Summary

Phase 9 verifies cross-cutting concerns before mainnet: on-chain/off-chain state consistency under failure scenarios, authority key security via multi-sig implementation, and economic model correctness (solvency invariants, fee accuracy). This is an audit + implementation phase building on the clean codebase from Phase 8.

Key findings:
- **Squads Protocol is the clear choice for multi-sig** - Industry standard, formally verified, $10B+ secured, simpler than SPL Governance for treasury management
- **Failure handling infrastructure exists** - `failedPayoutsDatabase.ts` tracks failed payouts for recovery, but failure scenario testing is not automated
- **Economic invariants already tracked** - Per-game-mode accounting exists in `balanceDatabase.ts`, but global vault vs. aggregate liability reconciliation is not automated
- **All services now use `verifyAndLockBalance`** - Phase 7 TOCTOU fix was applied; deprecated `hasSufficientBalance` no longer used in critical paths
- **Fee constants centralized** - Phase 8 consolidated fees to `backend/src/utils/fees.ts` (PLATFORM_FEE_BPS=500, DRAFT_FEE_BPS=1000)

**Primary recommendation:** Focus on three areas: (1) Document and automate failure scenario tests using existing infrastructure, (2) Implement Squads Protocol 2-of-3 multi-sig for authority, (3) Add property-based tests using Trident fuzzer for economic invariants.

## Standard Stack

### Multi-Sig Implementation

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [@sqds/multisig](https://github.com/Squads-Protocol/v4) | v4 | Multi-sig program SDK | First formally verified on Solana, $10B+ secured, 300+ teams |
| @solana/web3.js | Latest | Transaction building | Standard Solana SDK |

**Why Squads over SPL Governance:**

| Factor | Squads Protocol | SPL Governance |
|--------|-----------------|----------------|
| **Focus** | Multi-sig & treasury | Full DAO governance |
| **Verification** | Formally verified | Standard audits |
| **Status** | Actively maintained | [Archived/relocated](https://github.com/Mythic-Project/solana-program-library/tree/master/governance) |
| **Complexity** | Simple API for multi-sig | Complex plugin architecture |
| **Adoption** | Industry standard for multi-sig | Better for voting systems |

### Failure Scenario Testing

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| [Bankrun](https://www.npmjs.com/package/solana-bankrun) | Latest | Lightweight testing, time manipulation | Integration tests, simulating failures |
| [Trident](https://github.com/Ackee-Blockchain/trident) | Latest | Property-based fuzzing for Anchor | Economic invariant testing |
| Jest/Vitest | Configured | Backend unit tests | Service-level failure simulation |

### Economic Invariant Testing

| Tool | Purpose | Use Case |
|------|---------|----------|
| Trident | Property-based testing | Fuzz `transfer_to_global_vault`, `credit_winnings` |
| Bankrun | Account state manipulation | Simulate pool imbalances, rounding edge cases |
| Manual property tests | Arithmetic verification | Draw scenarios, single-sided pools |

**Installation:**

```bash
# Squads SDK
npm install @sqds/multisig @solana/web3.js

# Trident (in program directory)
cargo install trident-cli
trident init
```

## Architecture Patterns

### Pattern 1: Squads Multi-Sig Authority Transfer

**What:** Transfer program authority from single key to Squads multi-sig vault
**When to use:** Before mainnet deployment
**Configuration:** 2-of-3 for small team (recommended), 3-of-5 for larger

```typescript
// Source: https://docs.squads.so/main/development/introduction/quickstart
import * as multisig from "@sqds/multisig";
const { Multisig } = multisig.accounts;

// 1. Create the multi-sig
const createKey = Keypair.generate();
const [multisigPda] = multisig.getMultisigPda({ createKey: createKey.publicKey });

const signature = await multisig.rpc.multisigCreate({
  connection,
  treasury: treasury.publicKey,
  createKey: createKey,
  creator: creator,
  multisigPda,
  configAuthority: null, // Immutable configuration
  threshold: 2,          // 2-of-3 approval required
  members: [
    { key: member1.publicKey, permissions: Permissions.all() },
    { key: member2.publicKey, permissions: Permissions.all() },
    { key: member3.publicKey, permissions: Permissions.all() },
  ],
  timeLock: 0,
});

// 2. Transfer authority using existing two-step process
// Step 1: propose_authority_transfer to multisigPda
// Step 2: Accept from multi-sig (requires quorum)
```

### Pattern 2: Failure Scenario Test Structure

**What:** Systematic testing of all failure modes across game modes
**When to use:** Integration testing, pre-mainnet verification

```typescript
// Recommended test structure
describe('Failure Scenarios', () => {
  describe('Transaction Failures', () => {
    it('should handle RPC timeout during fund lock', async () => {
      // Simulate RPC timeout
      // Verify pending transaction cancelled
      // Verify user balance unchanged
      // Verify no phantom bet recorded
    });

    it('should handle failed settlement with funds locked', async () => {
      // Lock funds successfully
      // Simulate settlement tx failure
      // Verify failedPayoutsDatabase.addFailedPayout called
      // Verify recovery job can retry
    });
  });

  describe('Backend Crash Recovery', () => {
    it('should recover in-flight bets on restart', async () => {
      // Create pending transaction
      // Simulate crash (skip confirmation)
      // Restart and run cleanupStalePendingTransactions
      // Verify transaction marked failed
      // Verify user notified
    });
  });

  describe('RPC Issues', () => {
    it('should handle stale balance reads gracefully', async () => {
      // User has 1 SOL on-chain
      // Pending debit of 0.5 SOL not yet confirmed
      // Verify getAvailableBalance returns 0.5 SOL
    });
  });
});
```

### Pattern 3: Economic Invariant Property Tests

**What:** Property-based tests that verify solvency invariants hold for arbitrary inputs
**When to use:** Continuous fuzzing, audit preparation

```rust
// Source: https://github.com/Ackee-Blockchain/trident
// Trident invariant check example

#[trident::test_case]
fn test_pool_solvency(
    bets: Vec<(u64, BetSide)>,  // Random bets
    winner: WinnerSide,
) {
    // Place random bets
    let mut up_pool = 0u64;
    let mut down_pool = 0u64;
    for (amount, side) in bets {
        match side {
            BetSide::Up => up_pool = up_pool.saturating_add(amount),
            BetSide::Down => down_pool = down_pool.saturating_add(amount),
        }
    }

    let total_pool = up_pool.saturating_add(down_pool);

    // Calculate all payouts
    let total_payouts = calculate_all_payouts(bets, winner, up_pool, down_pool);

    // INVARIANT: total_payouts + fees <= total_pool
    let fee = total_pool * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
    assert!(total_payouts + fee <= total_pool, "Solvency violation!");
}
```

### Pattern 4: Global Vault Monitoring

**What:** Runtime check that global vault balance >= sum of game mode liabilities
**When to use:** Continuous monitoring, pre-settlement check

```typescript
// Add to balanceService.ts
async verifyGlobalVaultSolvency(): Promise<{
  solvent: boolean;
  vaultBalance: number;
  totalLiabilities: number;
  breakdown: Record<GameMode, { locked: number; paidOut: number; available: number }>;
}> {
  const vaultBalance = await this.getGlobalVaultBalance();
  const gameModeBalances = getAllGameModeBalances();

  let totalLiabilities = 0;
  const breakdown: Record<GameMode, any> = {} as any;

  for (const [mode, balance] of Object.entries(gameModeBalances)) {
    const available = balance.totalLocked - balance.totalPaidOut;
    totalLiabilities += Math.max(0, available);
    breakdown[mode as GameMode] = {
      locked: balance.totalLocked,
      paidOut: balance.totalPaidOut,
      available,
    };
  }

  return {
    solvent: vaultBalance >= totalLiabilities,
    vaultBalance,
    totalLiabilities,
    breakdown,
  };
}
```

### Anti-Patterns to Avoid

- **Auto-refund on failure:** User decision: "favor house (safe)" - hold funds for manual review
- **Single authority key:** Never go to mainnet with single-signer authority
- **Skipping failure scenarios for "happy path":** All game modes must test all failure categories
- **Integer division before multiplication:** Always multiply first to preserve precision

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-sig transactions | Custom signing logic | Squads Protocol | Formally verified, battle-tested |
| Fuzzing framework | Custom random test generators | Trident | Solana-specific, invariant-aware |
| Failed payout tracking | In-memory retry logic | `failedPayoutsDatabase.ts` | Already exists, persisted |
| Time manipulation in tests | Sleep/delay | Bankrun time-travel | Deterministic, fast |
| Per-game accounting | Global counter | `gameModeBalances` in balanceDatabase | Already implemented |

**Key insight:** The infrastructure for failure handling and solvency tracking already exists. Phase 9 is about verifying it works and adding automated tests.

## Common Pitfalls

### Pitfall 1: Draw Scenario Rounding Errors

**What goes wrong:** In a draw, all bets should be refunded. But if fees were already deducted, refunds may be short.
**Why it happens:** Fee calculation happens during settlement, not claim.
**How to avoid:** Verify draw handling path: contract returns `position.amount` without fee deduction (line 913-917 in lib.rs confirms this)
**Warning signs:** User complaints about draw refunds being less than bet amount

### Pitfall 2: Single-Sided Pool Division by Zero

**What goes wrong:** If all bets are on one side, winning pool calculation divides by zero.
**Why it happens:** `share = bet_amount * losing_pool / winning_pool` when losing_pool = 0
**How to avoid:** Contract handles this: if winning_pool == 0, return bet_amount (line 993-995)
**Verification:** Add test case with 100% one-sided pool

### Pitfall 3: Backend Crash Mid-Settlement Race

**What goes wrong:** Backend locks funds, crashes before recording bet in database, user can't get refund.
**Why it happens:** Non-atomic cross-system operation
**How to avoid:**
1. `verifyAndLockBalance` creates pending transaction BEFORE on-chain call
2. `cleanupStalePendingTransactions` marks stale transactions as failed
3. Failed payouts queue for manual recovery
**Warning signs:** Orphaned pending transactions older than 1 minute

### Pitfall 4: Multi-Sig Configuration Lock-In

**What goes wrong:** Squads with configAuthority=null cannot change threshold or members
**Why it happens:** Immutable configuration for security
**How to avoid:**
- Set reasonable initial threshold (2-of-3 allows one key loss)
- Consider configAuthority for upgrade path (with time-lock)
**Decision point:** Discuss with team before deployment

### Pitfall 5: Global Vault Underfunding

**What goes wrong:** Platform fees withdrawn from global vault, leaving insufficient funds for payouts
**Why it happens:** `withdraw_fees` doesn't check against pending game mode liabilities
**How to avoid:**
1. Contract checks: `amount <= game_state.total_fees_collected` (line 442-445)
2. Contract checks: `global_vault.lamports() >= amount` (line 448-451)
3. Add runtime monitoring: alert when vault balance drops below 2x average daily payout
**Warning signs:** Solvency check failures in creditWinnings

### Pitfall 6: Fee Mismatch Between Contract and Backend

**What goes wrong:** Contract uses 5% fee, backend calculates different amount, user reports discrepancy
**Why it happens:** Constants defined in multiple places
**How to avoid:**
- Contract: `PLATFORM_FEE_BPS = 500` (line 18 of lib.rs)
- Backend: `PLATFORM_FEE_BPS = 500` (fees.ts)
- Verification: Property test that contract payout + fee + loser_loss = total_pool
**Status:** Phase 8 centralized fee constants - verify match with contract

## Code Examples

### Failure Scenario: RPC Timeout During Lock

```typescript
// Source: Pattern for testing RPC failures
describe('RPC Timeout Handling', () => {
  it('should cancel pending transaction on lock failure', async () => {
    const wallet = 'TestWallet123...';
    const amount = 10_000_000; // 0.01 SOL

    // Mock RPC to timeout
    jest.spyOn(balanceService, 'transferToGlobalVault').mockRejectedValue(
      new Error('RPC timeout')
    );

    // Attempt to lock balance
    await expect(
      balanceService.verifyAndLockBalance(wallet, amount, 'oracle', 'round-123')
    ).rejects.toThrow();

    // Verify pending transaction was cancelled
    const pending = getPendingDebits(wallet);
    expect(pending).toHaveLength(0);

    // Verify available balance unchanged
    const balance = await balanceService.getAvailableBalance(wallet);
    expect(balance).toBe(originalBalance);
  });
});
```

### Economic Invariant: Solvency Check

```typescript
// Source: backend/src/services/balanceService.ts (to add)
// Property test for solvency invariant

function verifySolvencyInvariant(
  gameModeBalances: Record<GameMode, GameModeBalance>,
  globalVaultBalance: number
): void {
  let totalLiabilities = 0;

  for (const [mode, balance] of Object.entries(gameModeBalances)) {
    // Liability = locked - paidOut (what we still owe)
    const liability = Math.max(0, balance.totalLocked - balance.totalPaidOut);
    totalLiabilities += liability;

    // Per-mode invariant: paidOut <= locked
    if (balance.totalPaidOut > balance.totalLocked) {
      throw new Error(`Solvency violation: ${mode} paid out ${balance.totalPaidOut} > locked ${balance.totalLocked}`);
    }
  }

  // Global invariant: vault >= total liabilities
  if (globalVaultBalance < totalLiabilities) {
    throw new Error(`Global solvency violation: vault ${globalVaultBalance} < liabilities ${totalLiabilities}`);
  }
}
```

### Multi-Sig Authority Transfer

```typescript
// Source: https://docs.squads.so/main + existing authority transfer pattern
import * as multisig from "@sqds/multisig";

async function transferAuthorityToMultisig(
  connection: Connection,
  currentAuthority: Keypair,
  multisigPda: PublicKey,
  program: Program
): Promise<string> {
  // Step 1: Propose transfer to multi-sig
  const proposeTx = await program.methods
    .proposeAuthorityTransfer(multisigPda)
    .accounts({
      gameState: gameStatePDA,
      authority: currentAuthority.publicKey,
    })
    .signers([currentAuthority])
    .rpc();

  console.log('Authority transfer proposed:', proposeTx);
  console.log('Multi-sig members must now approve and execute accept_authority_transfer');

  return proposeTx;
}

// Step 2 happens via Squads UI or CLI
// Members vote on transaction that calls accept_authority_transfer
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single authority key | Multi-sig (Squads) | Industry standard | Prevents single point of failure |
| Manual failure recovery | `failedPayoutsDatabase.ts` | Already exists | Automated retry queue |
| Global balance check | Per-game mode accounting | Phase 6-7 | Prevents cross-game drain |
| `hasSufficientBalance` check | `verifyAndLockBalance` atomic | Phase 7.2 | No TOCTOU race |
| Scattered fee constants | Centralized `fees.ts` | Phase 8.1 | DRY, verifiable |

**Deprecated/outdated:**
- Single-key authority for production: NEVER (use multi-sig)
- Manual solvency checks: Add automated monitoring
- SPL Governance for multi-sig: Use Squads (simpler, better maintained)

## Existing Infrastructure

The codebase already has infrastructure for Phase 9 requirements:

### Failure Handling

| Component | Location | Status |
|-----------|----------|--------|
| Failed payout tracking | `backend/src/db/failedPayoutsDatabase.ts` | IMPLEMENTED |
| Pending transaction cleanup | `balanceDatabase.ts:cleanupStalePendingTransactions` | IMPLEMENTED |
| Stale transaction timeout | 1 minute in `balanceDatabase.ts` | CONFIGURED |
| Alert service | `backend/src/services/alertService.ts` | IMPLEMENTED |

### Solvency Tracking

| Component | Location | Status |
|-----------|----------|--------|
| Per-game mode balances | `balanceDatabase.ts:gameModeBalances` | IMPLEMENTED |
| Lock/payout/refund tracking | `recordGameModeLock/Payout/Refund` | IMPLEMENTED |
| Solvency check before payout | `canPayoutFromGameMode` | IMPLEMENTED |
| Global vault balance query | `balanceService.getGlobalVaultBalance` | IMPLEMENTED |

### Missing (To Implement)

| Component | Description | Priority |
|-----------|-------------|----------|
| Global vault vs. liability reconciliation | Automated check that vault >= sum of liabilities | HIGH |
| Failure scenario test suite | Automated tests for each failure category | HIGH |
| Multi-sig setup | Squads Protocol integration | HIGH |
| Property-based economic tests | Trident fuzzing for invariants | MEDIUM |
| Runtime solvency monitoring | Alert when vault drops below threshold | MEDIUM |

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-sig member selection**
   - What we know: 2-of-3 is standard for small teams, 3-of-5 for larger
   - What's unclear: Who are the specific signers for DegenDome?
   - Recommendation: Document structure now, assign signers at deployment time (per CONTEXT.md)

2. **Fee withdrawal timing**
   - What we know: Contract allows authority to withdraw collected fees
   - What's unclear: What's the safe withdrawal threshold? (leave buffer for payouts)
   - Recommendation: Never withdraw if remaining > 50% of daily average volume

3. **Pyth price feed latency on mainnet**
   - What we know: 60-second staleness check in contract
   - What's unclear: Actual update frequency on mainnet SOL/USD feed
   - Recommendation: Verify before mainnet, consider tightening to 30s

4. **Failed payout retry policy**
   - What we know: `failedPayoutsDatabase` tracks failures with retry count
   - What's unclear: What's max retries before manual review?
   - Recommendation: 3 automatic retries, then escalate to manual review (favor house philosophy)

## Sources

### Primary (HIGH confidence)
- [Squads Protocol v4 Documentation](https://docs.squads.so/main) - Multi-sig implementation
- [Squads Protocol GitHub](https://github.com/Squads-Protocol/v4) - SDK reference
- [QuickNode Squads Guide](https://www.quicknode.com/guides/solana-development/3rd-party-integrations/multisig-with-squads) - Setup tutorial
- Contract source: `programs/session_betting/programs/session_betting/src/lib.rs` (read directly)
- Backend services: `balanceService.ts`, `balanceDatabase.ts`, `failedPayoutsDatabase.ts` (read directly)

### Secondary (MEDIUM confidence)
- [Trident Fuzzing Framework](https://github.com/Ackee-Blockchain/trident) - Property testing
- [Helius Testing Guide](https://www.helius.dev/blog/a-guide-to-testing-solana-programs) - Integration testing patterns
- [SPL Governance GitHub](https://github.com/solana-labs/solana-program-library/blob/master/governance/README.md) - Alternative (not recommended)
- [Solana Cookbook Debugging](https://solanacookbook.com/guides/debugging-solana-programs.html) - Testing best practices

### Tertiary (LOW confidence)
- [solsec GitHub](https://github.com/sannykim/solsec) - Security resources collection
- Various Medium articles on Solana testing (for ecosystem patterns)

## Metadata

**Confidence breakdown:**
- Multi-sig recommendation: HIGH - Squads clearly dominant, formally verified
- Failure scenario testing: HIGH - Existing infrastructure documented
- Economic invariants: HIGH - Contract code verified, patterns identified
- Property testing: MEDIUM - Trident is standard but implementation requires setup
- Runtime monitoring: MEDIUM - Patterns clear, implementation specifics TBD

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, Squads v4 mature)

**Next steps for planning:**
1. Create failure scenario documentation for all game modes (INT-01)
2. Plan Squads multi-sig setup with 2-of-3 configuration (INT-02)
3. Design property tests for solvency invariants (INT-03)
4. Add runtime vault monitoring with alerts
5. Create security audit report with severity ratings (per CONTEXT.md)
