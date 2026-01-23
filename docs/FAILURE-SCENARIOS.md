# Failure Scenarios Documentation

> **Purpose**: Document all failure scenarios across game modes with expected behavior, recovery mechanisms, and monitoring guidance.
>
> **Policy**: Favor house (safe) - if unclear, hold funds for manual review rather than auto-refunding.

## Table of Contents

1. [Transaction Failures](#1-transaction-failures)
2. [Backend Crashes](#2-backend-crashes)
3. [RPC Issues](#3-rpc-issues)
4. [Game Mode Specific](#4-game-mode-specific)
5. [Recovery Infrastructure](#5-recovery-infrastructure)
6. [Monitoring & Alerts](#6-monitoring--alerts)

---

## 1. Transaction Failures

### 1.1 RPC Timeout During Lock

| Property | Value |
|----------|-------|
| **Severity** | CRITICAL |
| **Component** | `balanceService.verifyAndLockBalance()` |
| **Trigger** | `transferToGlobalVault()` times out or fails |

**What Can Go Wrong:**
- Solana RPC node becomes unresponsive during fund lock
- Network congestion causes transaction to hang
- Rate limiting from RPC provider

**Expected System Behavior:**
1. `verifyAndLockBalance()` catches the error
2. Pending transaction in `balanceDatabase` is cancelled via `cancelTransaction()`
3. User's available balance remains unchanged (optimistic lock rolled back)
4. Bet placement fails with user-friendly error

**Recovery Mechanism:**
- Automatic: Transaction cancelled, no funds moved
- User action: Retry bet placement

**Warning Signs:**
- Increased RPC timeout errors in logs
- Spike in cancelled pending transactions
- Alert: `BALANCE_TRANSFER_FAILED`

---

### 1.2 Settlement Transaction Failure

| Property | Value |
|----------|-------|
| **Severity** | CRITICAL |
| **Component** | `balanceService.creditWinnings()` |
| **Trigger** | On-chain payout transaction fails after game settled |

**What Can Go Wrong:**
- RPC failure during winner payout
- Insufficient global vault balance (should not happen if solvency checks pass)
- Transaction signature verification failure

**Expected System Behavior:**
1. `creditWinnings()` catches the error
2. Failed payout recorded via `failedPayoutsDatabase.addFailedPayout()`
3. Alert sent via `alertService.sendCriticalAlert()`
4. Funds remain in global vault (safe)

**Recovery Mechanism:**
- Automatic: `failedPayoutsDatabase` stores failed payout for retry
- Manual: Admin reviews `failed_payouts` table
- Retry: Background job can retry pending failed payouts

**Warning Signs:**
- Alert: `PAYOUT_FAILED`
- Non-zero count in `failed_payouts` with status `pending`
- User complaints about missing winnings

---

### 1.3 Confirmation Timeout

| Property | Value |
|----------|-------|
| **Severity** | HIGH |
| **Component** | `balanceDatabase.cleanupStalePendingTransactions()` |
| **Trigger** | Transaction sent but confirmation never received |

**What Can Go Wrong:**
- Transaction dropped by validator
- Network partition prevents confirmation propagation
- Backend restarts before confirmation callback

**Expected System Behavior:**
1. Pending transaction remains in database with `status: 'pending'`
2. After 60 seconds, `cleanupStalePendingTransactions()` marks as `state: 'failed'`
3. User's available balance is restored (pending debit removed)

**Recovery Mechanism:**
- Automatic: Hourly cleanup via `cleanupOldTransactions()`
- Manual: Check on-chain if transaction actually succeeded

**Warning Signs:**
- Stale pending transactions > 1 minute old
- User balance discrepancy between UI and on-chain

---

## 2. Backend Crashes

### 2.1 Crash Mid-Settlement

| Property | Value |
|----------|-------|
| **Severity** | CRITICAL |
| **Component** | Game managers (predictionService, battleManager, etc.) |
| **Trigger** | Backend crashes after game ends but before all payouts complete |

**What Can Go Wrong:**
- Process killed during payout loop
- Unhandled exception in settlement logic
- Memory exhaustion

**Expected System Behavior:**
1. On-chain state remains authoritative (funds in global vault)
2. Backend restarts and game state is recoverable from database
3. Partial payouts may have succeeded - must check before retrying

**Recovery Mechanism:**
- Automatic: Failed payouts queue survives restart (SQLite persistence)
- Manual: Review game settlement status, cross-reference on-chain
- Retry: Resume payout for users who didn't receive credits

**Warning Signs:**
- Incomplete settlement records in database
- Mismatch between game `settled` status and payout count
- Users report partial payouts in multi-winner scenarios

---

### 2.2 Crash During Payout

| Property | Value |
|----------|-------|
| **Severity** | HIGH |
| **Component** | `balanceService.creditWinnings()` |
| **Trigger** | Backend crashes during individual payout |

**What Can Go Wrong:**
- Process killed after on-chain transfer but before database update
- Database write fails after successful on-chain transfer

**Expected System Behavior:**
1. If on-chain transfer succeeded: User has funds, database may be stale
2. If on-chain transfer failed: Transaction rolled back automatically
3. `recordGameModePayout()` may not have been called

**Recovery Mechanism:**
- Manual: Compare on-chain global vault balance with database tracking
- Reconciliation: `verifyGlobalVaultSolvency()` identifies discrepancies
- Audit: Check Solana transaction history for the game

**Warning Signs:**
- `verifyGlobalVaultSolvency()` shows `solvent: false`
- Game mode accounting doesn't match actual vault balance
- Alert: `BALANCE_SOLVENCY_FAILED`

---

## 3. RPC Issues

### 3.1 Stale Balance Reads

| Property | Value |
|----------|-------|
| **Severity** | MEDIUM |
| **Component** | `balanceService.getOnChainBalance()` |
| **Trigger** | RPC returns cached/stale balance data |

**What Can Go Wrong:**
- Load balancer routes to out-of-sync RPC node
- RPC cluster has propagation delays
- User deposits but balance not yet visible

**Expected System Behavior:**
1. `getAvailableBalance()` accounts for pending debits (conservative)
2. `verifyAndLockBalance()` does atomic on-chain check (authoritative)
3. If balance insufficient on-chain, bet fails with `InsufficientBalance`

**Recovery Mechanism:**
- Automatic: Atomic on-chain verification catches stale reads
- User action: Wait a few seconds and retry

**Warning Signs:**
- Users report "insufficient balance" despite UI showing sufficient funds
- Discrepancy between `getOnChainBalance()` and actual on-chain state

---

### 3.2 Network Partitions

| Property | Value |
|----------|-------|
| **Severity** | HIGH |
| **Component** | All on-chain operations |
| **Trigger** | Complete loss of RPC connectivity |

**What Can Go Wrong:**
- Data center outage
- RPC provider goes down
- DNS resolution failure

**Expected System Behavior:**
1. All on-chain operations fail gracefully
2. New bets rejected (cannot verify balance)
3. Settlements queue up (or pause games if possible)
4. Health check `/readyz` returns unhealthy

**Recovery Mechanism:**
- Automatic: Backend retries with exponential backoff
- Manual: Switch to backup RPC provider
- Alert: Monitor `/readyz` endpoint

**Warning Signs:**
- All RPC calls timing out
- Health endpoint `/readyz` returns unhealthy
- No new games starting

---

## 4. Game Mode Specific

### 4.1 Oracle (Prediction) Edge Cases

#### 4.1.1 Pyth Price Feed Unavailable

| Property | Value |
|----------|-------|
| **Severity** | CRITICAL |
| **Component** | `predictionServiceOnChain.ts` |
| **Trigger** | Pyth oracle returns stale or unavailable price |

**What Can Go Wrong:**
- Pyth Network outage
- Price staleness > 60 second threshold
- Invalid price feed account

**Expected System Behavior:**
1. Round cannot start without valid Pyth price
2. If mid-round: Round marked as cancelled
3. All bets refunded via `recordGameModeRefund()`

**Recovery Mechanism:**
- Automatic: Bets refunded, no platform fee taken
- User action: Wait for Pyth to recover

---

#### 4.1.2 Single-Sided Pool

| Property | Value |
|----------|-------|
| **Severity** | LOW |
| **Component** | Payout calculation |
| **Trigger** | All bets on one side (e.g., everyone bet LONG) |

**What Can Go Wrong:**
- No losing pool to distribute to winners

**Expected System Behavior:**
1. Winners get their bet amount back (no profit)
2. No platform fee taken (nothing to take fee from)
3. Contract line 993-995 handles this case

**Recovery Mechanism:**
- Automatic: Full refund to all participants

---

### 4.2 Battle Edge Cases

#### 4.2.1 Player Disconnection Mid-Battle

| Property | Value |
|----------|-------|
| **Severity** | MEDIUM |
| **Component** | `battleManager.ts` |
| **Trigger** | Player's WebSocket disconnects during active battle |

**What Can Go Wrong:**
- Player cannot close positions
- Player appears inactive

**Expected System Behavior:**
1. Battle continues with existing positions
2. Disconnected player's positions remain open
3. At battle end, final P&L calculated normally
4. Winner determined by P&L regardless of connection status

**Recovery Mechanism:**
- User action: Reconnect and resume
- Automatic: Battle settles normally at end time

---

#### 4.2.2 Battle Cancellation (No Opponent)

| Property | Value |
|----------|-------|
| **Severity** | LOW |
| **Component** | `battleManager.ts` |
| **Trigger** | Matchmaking timeout, no opponent found |

**What Can Go Wrong:**
- User's entry fee locked but no battle

**Expected System Behavior:**
1. Battle marked as `cancelled`
2. Entry fee refunded via `releaseLockedBalance()`
3. `recordGameModeRefund()` updates accounting

**Recovery Mechanism:**
- Automatic: Full refund within timeout period

---

### 4.3 Spectator Edge Cases

#### 4.3.1 Battle Ends in Draw

| Property | Value |
|----------|-------|
| **Severity** | LOW |
| **Component** | `spectatorService.ts` |
| **Trigger** | Both battle players have identical P&L |

**What Can Go Wrong:**
- No clear winner for spectator bets

**Expected System Behavior:**
1. All spectator bets refunded
2. No platform fee taken
3. Contract line 913-917 handles draw scenario

**Recovery Mechanism:**
- Automatic: Full refund to all spectators

---

### 4.4 Draft Tournament Edge Cases

#### 4.4.1 Token Delisting During Tournament

| Property | Value |
|----------|-------|
| **Severity** | MEDIUM |
| **Component** | `draftTournamentManager.ts` |
| **Trigger** | Drafted token gets delisted from price feeds |

**What Can Go Wrong:**
- Cannot calculate portfolio performance
- Unfair advantage/disadvantage for players with that token

**Expected System Behavior:**
1. Token frozen at last known price
2. Portfolio performance calculated with frozen value
3. Admin may choose to cancel tournament for fairness

**Recovery Mechanism:**
- Manual: Admin review required
- Option: Partial refund or exclude token from scoring

---

### 4.5 LDS (Last Degen Standing) Edge Cases

#### 4.5.1 All Players Eliminated Same Round

| Property | Value |
|----------|-------|
| **Severity** | MEDIUM |
| **Component** | `ldsManager.ts` |
| **Trigger** | Everyone predicts wrong in same round |

**What Can Go Wrong:**
- No clear winner

**Expected System Behavior:**
1. Prize split among last eliminated players
2. Payout calculated proportionally

**Recovery Mechanism:**
- Automatic: Fair split among tied losers

---

### 4.6 Token Wars Edge Cases

#### 4.6.1 Identical Token Performance

| Property | Value |
|----------|-------|
| **Severity** | LOW |
| **Component** | `tokenWarsManager.ts` |
| **Trigger** | Both tokens have exactly same % change |

**What Can Go Wrong:**
- No winner determination

**Expected System Behavior:**
1. Result is a draw
2. All bets refunded
3. No platform fee taken

**Recovery Mechanism:**
- Automatic: Full refund

---

## 5. Recovery Infrastructure

### 5.1 Failed Payouts Database

**Location**: `backend/src/db/failedPayoutsDatabase.ts`

**Schema**:
```sql
failed_payouts (
  id TEXT PRIMARY KEY,
  game_type TEXT,
  game_id TEXT,
  wallet_address TEXT,
  amount_lamports INTEGER,
  payout_type TEXT,  -- 'payout' | 'refund'
  reason TEXT,
  status TEXT,       -- 'pending' | 'retrying' | 'recovered' | 'failed_permanent'
  retry_count INTEGER,
  ...
)
```

**Key Functions**:
- `addFailedPayout()` - Queue failed payout for recovery
- `getPendingFailedPayouts()` - Get payouts to retry
- `markRecovered()` - Mark as successfully recovered
- `markPermanentFailure()` - Mark as unrecoverable (needs manual intervention)

---

### 5.2 Pending Transaction Cleanup

**Location**: `backend/src/db/balanceDatabase.ts`

**Key Functions**:
- `cleanupStalePendingTransactions()` - Marks >60s pending transactions as failed
- `cleanupOldTransactions()` - Removes confirmed/cancelled transactions >24h old

**Scheduled**: Every hour via `setInterval` in `BalanceService` constructor

---

### 5.3 Global Vault Solvency Check

**Location**: `backend/src/services/balanceService.ts`

**Function**: `verifyGlobalVaultSolvency()`

**Returns**:
```typescript
{
  solvent: boolean,
  vaultBalance: number,
  totalLiabilities: number,
  surplus: number,
  breakdown: Record<GameMode, {
    locked: number,
    paidOut: number,
    available: number
  }>
}
```

**Usage**:
- Periodic health check (e.g., every 5 minutes)
- Before large payouts
- Admin dashboard monitoring

---

## 6. Monitoring & Alerts

### 6.1 Critical Alerts

| Alert Code | Trigger | Response |
|------------|---------|----------|
| `BALANCE_TRANSFER_FAILED` | Fund lock fails | Check RPC health |
| `PAYOUT_FAILED` | Winner payout fails | Check failed_payouts table |
| `BALANCE_SOLVENCY_FAILED` | Game mode tries to overpay | Investigate immediately |
| `REFUND_FAILED` | Refund operation fails | Manual recovery needed |

### 6.2 Warning Signs Summary

| Metric | Threshold | Action |
|--------|-----------|--------|
| Pending transactions > 60s | > 0 | Investigate RPC/network |
| Failed payouts pending | > 0 | Run recovery job |
| `verifyGlobalVaultSolvency().solvent` | false | Stop all payouts, investigate |
| Health endpoint `/readyz` | unhealthy | Check RPC connectivity |
| Cancelled transactions/hour | > 10 | Check for systematic issues |

### 6.3 Reconciliation Checklist

**Daily**:
1. Check `failed_payouts` table for pending entries
2. Run `verifyGlobalVaultSolvency()` and verify `solvent: true`
3. Review `BALANCE_*` alerts from past 24 hours

**Weekly**:
1. Compare on-chain global vault balance with sum of all game mode `totalLocked - totalPaidOut`
2. Audit any `failed_permanent` entries
3. Review transaction cleanup logs

---

## Appendix: Error Handling Decision Tree

```
User places bet
    |
    v
verifyAndLockBalance() called
    |
    +-- Success --> Bet accepted
    |
    +-- RPC Timeout --> Cancel pending TX --> Return error --> User retries
    |
    +-- Insufficient Balance --> Cancel pending TX --> Return error
    |
    +-- Other Error --> Cancel pending TX --> Log error --> Return generic error

Game settles
    |
    v
creditWinnings() called for each winner
    |
    +-- Success --> Record payout --> Continue
    |
    +-- Solvency Check Fails --> Alert --> Add to failed_payouts --> Continue (skip this payout)
    |
    +-- RPC Error --> Add to failed_payouts --> Alert --> Continue
```

---

*Last updated: 2026-01-23*
*Version: 1.0*
