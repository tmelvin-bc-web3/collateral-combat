# Backend Security Audit Report

**Date:** 2026-01-22
**Phase:** 07-backend-security
**Plan:** 07-01 (Input Validation and Auth/Session Audit)
**Auditor:** Claude Opus 4.5

---

## Executive Summary

| ID | Category | Severity | Description | Status |
|----|----------|----------|-------------|--------|
| SEC-01-01 | Input Validation | MEDIUM | Prediction side validation uses string comparison | FIXED |
| SEC-01-02 | Input Validation | MEDIUM | Token Wars side validation inconsistent | FIXED |
| SEC-01-03 | Input Validation | LOW | Wallet address validation via try/catch instead of explicit check | DOCUMENTED |
| SEC-01-04 | Input Validation | MEDIUM | LDS prediction validation missing | FIXED |
| SEC-01-05 | Input Validation | LOW | Chat content not length-validated | FIXED |
| SEC-01-06 | Input Validation | LOW | Battle config missing explicit validation | DOCUMENTED |
| SEC-02-01 | Auth/Session | HIGH | predictionService.ts uses hasSufficientBalance (race condition) | FIXED |
| SEC-02-02 | Auth/Session | CRITICAL | Replay cache Redis support | VERIFIED OK |
| SEC-02-03 | Auth/Session | LOW | Some signed operations use timestamp freshness check | VERIFIED OK |
| SEC-02-04 | Auth/Session | MEDIUM | Session key isolation verified for withdraw operations | VERIFIED OK |
| SEC-02-05 | Auth/Session | LOW | Signature verification uses nacl correctly | VERIFIED OK |
| SEC-03-01 | Race Condition | HIGH | predictionServiceOnChain hasSufficientBalance TOCTOU | FIXED |
| SEC-03-02 | Race Condition | HIGH | predictionService hasSufficientBalance TOCTOU | FIXED |
| SEC-03-03 | Race Condition | HIGH | spectatorService hasSufficientBalance TOCTOU | FIXED |
| SEC-03-04 | Race Condition | HIGH | battleManager joinBattle hasSufficientBalance TOCTOU | FIXED |
| SEC-03-05 | Race Condition | HIGH | battleManager createReadyCheck hasSufficientBalance TOCTOU | FIXED |
| SEC-03-06 | Race Condition | HIGH | tokenWarsManager placeBet hasSufficientBalance TOCTOU | FIXED |
| SEC-03-07 | Race Condition | HIGH | draftTournamentManager enterTournament hasSufficientBalance TOCTOU | FIXED |
| SEC-03-08 | Race Condition | HIGH | ldsManager joinGame hasSufficientBalance TOCTOU | FIXED |
| SEC-04-01 | Error Handling | MEDIUM | error.message exposed to clients | DOCUMENTED |
| SEC-04-02 | Error Handling | MEDIUM | WebSocket error emissions use raw messages | DOCUMENTED |
| SEC-04-03 | Error Handling | HIGH | Partial failure handling | VERIFIED OK |
| SEC-04-04 | Error Handling | LOW | Typed errors underutilized | DOCUMENTED |
| SEC-04-05 | Error Handling | LOW | Uncaught exception handling | VERIFIED OK |

**Summary:**
- **CRITICAL:** 1 (Verified OK - Already Implemented)
- **HIGH:** 9 (8 Fixed in SEC-03, 1 Verified OK in SEC-04)
- **MEDIUM:** 6 (3 Fixed, 1 Verified OK, 2 Documented)
- **LOW:** 7 (2 Fixed/Documented, 3 Verified OK, 2 Documented)

---

## SEC-01: Input Validation Audit

### Attack Surface Catalog

#### REST API Endpoints (index.ts)

| Endpoint | Method | Parameters | Validation Status |
|----------|--------|------------|-------------------|
| `/api/health` | GET | None | N/A |
| `/api/livez` | GET | None | N/A |
| `/api/readyz` | GET | None | N/A |
| `/api/tokens` | GET | None | N/A |
| `/api/prices` | GET | None | N/A |
| `/api/battles` | GET | None | N/A |
| `/api/battles/:id` | GET | battleId (param) | UUID format assumed |
| `/api/progression/:wallet` | GET | wallet (param) | Validated via PublicKey constructor |
| `/api/leaderboard` | GET | None | N/A |
| `/api/challenges/mine` | GET | wallet (auth header) | Auth middleware validates |
| `/api/challenges/stats` | GET | None | N/A |
| `/api/challenges/create` | POST | entryFee, leverage, duration | Validated explicitly |
| `/api/challenges/:code` | GET | code (param) | Regex validation present |
| `/api/challenges/:code/accept` | POST | code (param) | Auth + regex validation |

#### WebSocket Events (index.ts)

| Event | Parameters | Validation Status | Finding |
|-------|------------|-------------------|---------|
| `create_battle` | config, wallet | Config validated in battleManager | OK |
| `join_battle` | battleId, wallet | Auth required via getAuthenticatedWallet | OK |
| `queue_matchmaking` | config, wallet | Auth required | OK |
| `open_position` | battleId, asset, side, leverage, size | Validated in battleManager | OK |
| `close_position` | battleId, positionId | Auth required | OK |
| `open_position_signed` | message, signature, walletAddress | Signature verified | OK |
| `close_position_signed` | message, signature, walletAddress | Signature verified | OK |
| `start_solo_practice` | config, wallet, onChainBattleId | Auth required | OK |
| `leave_battle` | battleId | No auth required (OK - just leaves room) | OK |
| `subscribe_prices` | tokens | Array of strings | OK |
| `subscribe_live_battles` | None | N/A | OK |
| `spectate_battle` | battleId | No auth required (spectating is public) | OK |
| `place_bet` | battleId, backedPlayer, amount, wallet | Auth + validation in spectatorService | OK |
| `place_prediction` | asset, side, amount, wallet | **FINDING: SEC-01-01** | FIXED |
| `place_prediction_bet` | asset, side, amount, bettor, useFreeBet | Auth required + **FINDING: SEC-01-01** | FIXED |
| `join_draft_lobby` | tier | String check only | OK |
| `start_draft` | entryId | UUID format | OK |
| `make_draft_pick` | entryId, roundNumber, coinId | Validated in manager | OK |
| `subscribe_lds` | None | N/A | OK |
| `lds_join_game` | wallet | Auth required | OK |
| `lds_submit_prediction` | gameId, wallet, prediction | **FINDING: SEC-01-04** | FIXED |
| `subscribe_token_wars` | None | N/A | OK |
| `token_wars_place_bet` | wallet, side, amountLamports, useFreeBet | Auth required + **FINDING: SEC-01-02** | FIXED |
| `register_for_match` | matchId, wallet | Auth required | OK |
| `send_chat_message` | battleId, content | Auth required + **FINDING: SEC-01-05** | FIXED |
| `load_chat_history` | battleId | No auth (public history) | OK |

---

### SEC-01-01: Prediction Side Validation [MEDIUM] - FIXED

**Affected Code:** `backend/src/index.ts:2101-2140`

**Description:**
The `place_prediction` and `place_prediction_bet` events accept a `side` parameter typed as `PredictionSide` but don't validate the actual value before passing to the service.

**Before (Vulnerable):**
```typescript
socket.on('place_prediction', async (asset: string, side: PredictionSide, amount: number, wallet: string) => {
  // No validation of side parameter
  const bet = await predictionService.placeBet(asset, side, amount, authenticatedWallet);
});
```

**Exploit Scenario:**
A malicious client could send an invalid side value (e.g., `"invalid"` or `null`), potentially causing unexpected behavior in pool calculations.

**Remediation Applied:**
```typescript
// Validate side parameter
if (side !== 'long' && side !== 'short') {
  socket.emit('prediction_error', 'Invalid side - must be "long" or "short"');
  return;
}
```

**Status:** FIXED

---

### SEC-01-02: Token Wars Side Validation [MEDIUM] - FIXED

**Affected Code:** `backend/src/index.ts:2512`

**Description:**
The `token_wars_place_bet` event expects `side: 'token_a' | 'token_b'` but doesn't validate the value.

**Before (Vulnerable):**
```typescript
socket.on('token_wars_place_bet', async (data: { wallet: string; side: 'token_a' | 'token_b'; amountLamports: number; useFreeBet?: boolean }) => {
  // TypeScript type annotation doesn't validate at runtime
  const result = await tokenWarsManager.placeBet(authenticatedWallet, data.side, data.amountLamports, isFreeBet);
});
```

**Remediation Applied:**
```typescript
// Validate side parameter
if (data.side !== 'token_a' && data.side !== 'token_b') {
  socket.emit('token_wars_bet_error' as any, { error: 'Invalid side - must be "token_a" or "token_b"' });
  return;
}
```

**Status:** FIXED

---

### SEC-01-03: Wallet Address Validation Pattern [LOW] - DOCUMENTED

**Affected Code:** Multiple services

**Description:**
Wallet addresses are validated by attempting to construct a Solana `PublicKey` object and catching exceptions. While this works, it's an indirect validation method.

**Current Pattern:**
```typescript
const walletPubkey = new PublicKey(walletAddress);
// If this doesn't throw, the address is valid base58
```

**Assessment:**
This pattern is acceptable because:
1. The Solana `PublicKey` constructor validates base58 format
2. Invalid addresses cause operations to fail safely
3. The alternative (regex validation) could have edge cases

**Recommendation:**
Consider adding an explicit validation utility for clearer error messages:
```typescript
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
```

**Status:** DOCUMENTED (No immediate action required)

---

### SEC-01-04: LDS Prediction Validation [MEDIUM] - FIXED

**Affected Code:** `backend/src/index.ts:2464-2488`

**Description:**
The `lds_submit_prediction` event accepts a prediction parameter that should be `'up' | 'down'` but wasn't validated.

**Before (Vulnerable):**
```typescript
socket.on('lds_submit_prediction', async (data: { gameId: string; wallet: string; prediction: 'up' | 'down' }) => {
  // No validation of prediction parameter
  const result = await ldsManager.submitPrediction(data.gameId, authenticatedWallet, data.prediction);
});
```

**Remediation Applied:**
```typescript
// Validate prediction parameter
if (data.prediction !== 'up' && data.prediction !== 'down') {
  socket.emit('lds_error' as any, { error: 'Invalid prediction - must be "up" or "down"' });
  return;
}
```

**Status:** FIXED

---

### SEC-01-05: Chat Content Length Validation [LOW] - FIXED

**Affected Code:** `backend/src/index.ts:2624-2664`

**Description:**
The `send_chat_message` event accepts content without explicit length validation. While chatService may handle this internally, defensive validation at the handler level is better.

**Remediation Applied:**
```typescript
// Validate content
if (!data.content || typeof data.content !== 'string') {
  socket.emit('chat_error', { code: 'invalid_content', message: 'Message content required' });
  return;
}
if (data.content.length > 500) {
  socket.emit('chat_error', { code: 'content_too_long', message: 'Message cannot exceed 500 characters' });
  return;
}
if (data.content.trim().length === 0) {
  socket.emit('chat_error', { code: 'empty_content', message: 'Message cannot be empty' });
  return;
}
```

**Status:** FIXED

---

### SEC-01-06: Battle Config Validation [LOW] - DOCUMENTED

**Affected Code:** `backend/src/index.ts:1769-1800`

**Description:**
Battle config (entryFee, leverage, duration, etc.) validation happens in battleManager but not at the handler level.

**Assessment:**
The battleManager does validate config values, and invalid configs fail safely. However, early validation at the handler level would provide better error messages.

**Recommendation for Phase 8:**
Add Zod schema validation for BattleConfig at the handler level.

**Status:** DOCUMENTED (Deferred to Phase 8)

---

## SEC-02: Auth/Session Security Audit

### Authentication Infrastructure Assessment

#### Signature Verification Utility (`backend/src/utils/signatureVerification.ts`)

**Review Status:** VERIFIED CORRECT

The implementation:
1. Uses `nacl.sign.detached.verify()` correctly
2. Verifies message includes timestamp for freshness
3. Uses 5-minute timestamp window (300,000ms)
4. Integrates with replay cache
5. Properly decodes base64 signature

**Code Excerpt:**
```typescript
export async function verifyWalletSignature(
  message: string,
  signature: string,
  expectedWallet: string
): Promise<VerificationResult> {
  // 1. Decode signature and public key
  const signatureBytes = bs58.decode(signature);
  const publicKeyBytes = bs58.decode(expectedWallet);
  const messageBytes = new TextEncoder().encode(message);

  // 2. Verify cryptographic signature
  const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

  // 3. Check replay cache
  if (await replayCache.has(messageHash)) {
    return { valid: false, error: 'Replay attack detected: signature already used' };
  }

  // 4. Add to replay cache
  await replayCache.set(messageHash);

  return { valid: true };
}
```

---

#### Replay Cache (`backend/src/utils/replayCache.ts`)

### SEC-02-02: Replay Cache Redis Support [CRITICAL] - VERIFIED OK (Already Implemented)

**Affected Code:** `backend/src/utils/replayCache.ts`

**Description:**
Replay attack prevention requires persistent storage that:
1. Survives server restarts
2. Works across multiple server instances (load balancing)
3. Provides atomic check-and-set operations

**Assessment:**
Reviewed the existing implementation and found Redis support is ALREADY IMPLEMENTED:
- Uses `redis` npm package with proper connection handling
- Implements atomic `SET NX EX` via `checkAndMarkSignature()` function
- Falls back to in-memory cache for development (with warnings)
- Includes DDoS protection via MAX_MEMORY_CACHE_SIZE limit
- Proper cleanup interval for expired entries

**Current Implementation (Correct):**
```typescript
// Redis connection with fallback
const REDIS_URL = process.env.REDIS_URL;
let redisClient: RedisClientType | null = null;

// Atomic check-and-set for replay prevention
export async function checkAndMarkSignature(key: string, ttlSeconds: number = 300): Promise<boolean> {
  if (redisAvailable && redisClient) {
    // Use SET with NX and EX options (single atomic operation)
    const result = await redisClient.set(key, '1', {
      NX: true,  // Only set if not exists
      EX: ttlSeconds,  // Set expiry in same operation
    });
    return result === null; // null means key existed (signature was used)
  }
  // Memory fallback with lock for atomicity
  ...
}
```

**Deployment Note:**
For production, ensure `REDIS_URL` environment variable is set. The in-memory fallback logs warnings and is NOT safe for production.

**Status:** VERIFIED OK (Already implemented correctly)

---

### SEC-02-01: predictionService Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/predictionService.ts:348-356`

**Description:**
The off-chain predictionService uses the deprecated `hasSufficientBalance()` pattern instead of `verifyAndLockBalance()`.

**Vulnerable Pattern:**
```typescript
// Race condition: balance could change between check and debit
const hasSufficient = await balanceService.hasSufficientBalance(bettor, amountLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
// ... gap where user could withdraw ...
pendingId = await balanceService.debitPending(bettor, amountLamports, 'oracle', round.id);
```

**Remediation Applied (SEC-03 Plan 07-02):**
Migrated to atomic `verifyAndLockBalance()` pattern - see SEC-03 section for details.

**Status:** FIXED (Plan 07-02)

---

### SEC-02-03: Timestamp Freshness Verification [LOW] - VERIFIED OK

**Affected Code:** `backend/src/utils/signatureVerification.ts`

**Description:**
Signed operations verify timestamp freshness with a 5-minute window.

**Assessment:**
- 5 minutes is reasonable for network latency and user UX
- Not so long that it creates significant replay risk
- Consistent with industry standards

**Status:** VERIFIED OK

---

### SEC-02-04: Session Key Isolation [MEDIUM] - VERIFIED OK

**Affected Code:** `backend/src/index.ts` (withdraw handlers)

**Description:**
Per Phase 6 contract audit (INV-15), session keys CANNOT withdraw or transfer authority. Backend must enforce the same.

**Verification:**
1. Withdraw operations in balanceService.ts require wallet signature, not session
2. The `getAuthenticatedWallet()` function returns the wallet that signed authentication
3. Session-based actions (betting) use the session wallet
4. Withdraw/authority actions require fresh wallet signature

**Evidence from index.ts:**
- No withdraw WebSocket handlers exist (withdrawals happen via frontend direct to chain)
- API endpoints for admin operations use `requireAuth()` middleware
- Sensitive operations use `getAuthenticatedWallet(socket, wallet)`

**Status:** VERIFIED OK (Backend enforces same isolation as contract)

---

### SEC-02-05: Signature Verification Correctness [LOW] - VERIFIED OK

**Affected Code:** `backend/src/utils/signatureVerification.ts`

**Description:**
Verified that signature verification:
1. Uses `nacl.sign.detached.verify()` (correct for Solana wallet signatures)
2. Decodes signature with bs58 (correct for Solana format)
3. Encodes message as UTF-8 bytes (correct)
4. Verifies against expected wallet public key

**Status:** VERIFIED OK

---

## Operation-by-Operation Auth Audit

### Sensitive Operations Requiring Wallet Signature

| Operation | Location | Auth Method | Status |
|-----------|----------|-------------|--------|
| Place prediction bet | index.ts:2119 | `getAuthenticatedWallet()` | OK |
| Place spectator bet | index.ts:1965 | `getAuthenticatedWallet()` | OK |
| Place Token Wars bet | index.ts:2522 | `getAuthenticatedWallet()` | OK |
| Join LDS game | index.ts:2422 | `getAuthenticatedWallet()` | OK |
| Submit LDS prediction | index.ts:2464 | `getAuthenticatedWallet()` | OK |
| Create battle | index.ts:1769 | `getAuthenticatedWallet()` | OK |
| Open position | index.ts:1823 | `getAuthenticatedWallet()` | OK |
| Open position (signed) | index.ts:1865 | `verifyWalletSignature()` | OK |
| Create challenge | index.ts:2950 | `requireAuth()` middleware | OK |
| Accept challenge | index.ts:3093 | `requireAuth()` middleware | OK |
| Send chat message | index.ts:2624 | `getAuthenticatedWallet()` | OK |

### Operations NOT Requiring Auth (Intentional)

| Operation | Location | Reason |
|-----------|----------|--------|
| Subscribe to prices | index.ts:1941 | Public data |
| Subscribe to live battles | index.ts:1946 | Public data |
| Spectate battle | index.ts:1955 | Watching is public |
| Load chat history | index.ts:2666 | Public data |
| Get challenge by code | index.ts:3033 | Public info (code is secret) |

---

## SEC-03: Race Condition (TOCTOU) Audit

### Overview

Time-of-check to time-of-use (TOCTOU) race conditions occur when a security check (balance verification) is temporally separated from the action it authorizes (fund debit). This creates a window where the checked condition can change.

### The Vulnerable Pattern

The deprecated `hasSufficientBalance()` pattern creates a race condition:

```typescript
// BEFORE: VULNERABLE TO TOCTOU
const hasSufficient = await balanceService.hasSufficientBalance(wallet, amount);
if (!hasSufficient) throw new Error('Insufficient balance');
// RACE WINDOW: User could withdraw between check and lock!
const pendingId = await balanceService.debitPending(wallet, amount, 'game', gameId);
const lockTx = await balanceService.transferToGlobalVault(wallet, amount, 'game');
```

**Exploit Scenario:**
1. Attacker has 1 SOL balance
2. Attacker sends two simultaneous bet requests (0.6 SOL each)
3. Both pass `hasSufficientBalance()` check (balance = 1 SOL > 0.6 SOL)
4. Both proceed to debit, but only 1 SOL exists
5. Result: Platform is now short 0.2 SOL

### The Secure Pattern

The `verifyAndLockBalance()` method performs atomic verification and locking:

```typescript
// AFTER: SECURE - Atomic verification and lock
const lockResult = await balanceService.verifyAndLockBalance(
  wallet,
  amount,
  'game',
  gameId
);
// Funds are now locked on-chain - no race condition possible
```

**How it works:**
1. Creates pending transaction record (marks balance as "in-use")
2. Transfers funds to global vault on-chain (atomic operation)
3. If transfer fails, pending transaction is rolled back
4. User cannot withdraw funds that are locked in vault

---

### SEC-03-01: predictionServiceOnChain.ts Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/predictionServiceOnChain.ts:732-756`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(bettor, amountLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
const pendingId = await balanceService.debitPending(bettor, amountLamports, 'oracle', round.id);
const lockTx = await balanceService.transferToGlobalVault(bettor, amountLamports, 'oracle');
```

**After:**
```typescript
let lockResult: { txId: string; newBalance: number };
try {
  lockResult = await balanceService.verifyAndLockBalance(
    bettor,
    amountLamports,
    'oracle',
    round.id
  );
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    const available = await balanceService.getAvailableBalance(bettor);
    throw new Error(`Insufficient balance. Available: ${(available / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  }
  throw new Error('Failed to lock funds on-chain. Please try again.');
}
const lockTx = lockResult.txId;
```

**Status:** FIXED

---

### SEC-03-02: predictionService.ts Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/predictionService.ts:346-356`

**Note:** This is the legacy off-chain prediction service. While `predictionServiceOnChain.ts` is the active service, this was also fixed to prevent any future issues.

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(bettor, amountLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
pendingId = await balanceService.debitPending(bettor, amountLamports, 'oracle', round.id);
```

**After:**
```typescript
try {
  const lockResult = await balanceService.verifyAndLockBalance(
    bettor,
    amountLamports,
    'oracle',
    round.id
  );
  lockTxId = lockResult.txId;
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    throw new Error(`Insufficient balance`);
  }
  throw new Error('Failed to lock funds on-chain. Please try again.');
}
```

**Status:** FIXED

---

### SEC-03-03: spectatorService.ts Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/spectatorService.ts:224-241`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(bettor, amountLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
const pendingId = await balanceService.debitPending(bettor, amountLamports, 'spectator', battleId);
const lockTx = await balanceService.transferToGlobalVault(bettor, amountLamports, 'spectator');
```

**After:**
```typescript
let lockResult: { txId: string; newBalance: number };
try {
  lockResult = await balanceService.verifyAndLockBalance(
    bettor,
    amountLamports,
    'spectator',
    battleId
  );
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    throw new Error(`Insufficient balance`);
  }
  throw new Error('Failed to lock wager on-chain. Please try again.');
}
const lockTx = lockResult.txId;
```

**Status:** FIXED

---

### SEC-03-04: battleManager.ts joinBattle Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/battleManager.ts:157-183`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
pendingId = await balanceService.debitPending(walletAddress, entryFeeLamports, 'battle', battleId);
lockTx = await balanceService.transferToGlobalVault(walletAddress, entryFeeLamports, 'battle');
```

**After:**
```typescript
try {
  const lockResult = await balanceService.verifyAndLockBalance(
    walletAddress,
    entryFeeLamports,
    'battle',
    battleId
  );
  lockTx = lockResult.txId;
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    throw new Error(`Insufficient balance`);
  }
  throw new Error('Failed to lock entry fee on-chain. Please try again.');
}
```

**Status:** FIXED

---

### SEC-03-05: battleManager.ts createReadyCheck Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/battleManager.ts:990-1044`

**Before:**
```typescript
// Verify both players have sufficient balance BEFORE creating battle
const [p1HasBalance, p2HasBalance] = await Promise.all([
  balanceService.hasSufficientBalance(player1Wallet, entryFeeLamports),
  balanceService.hasSufficientBalance(player2Wallet, entryFeeLamports),
]);
// ... separate debitPending and transferToGlobalVault calls
```

**After:**
```typescript
// SECURITY: Atomic balance verification and fund locking for BOTH players
let lockResult1: { txId: string; newBalance: number } | null = null;
let lockResult2: { txId: string; newBalance: number } | null = null;

try {
  lockResult1 = await balanceService.verifyAndLockBalance(player1Wallet, entryFeeLamports, 'battle', readyCheckGameId);
} catch (error: any) {
  console.error(`[BattleManager] Player 1 failed to lock funds`);
  return;
}

try {
  lockResult2 = await balanceService.verifyAndLockBalance(player2Wallet, entryFeeLamports, 'battle', readyCheckGameId);
} catch (error: any) {
  // Refund player 1 since player 2 failed
  await balanceService.refundFromGlobalVault(player1Wallet, entryFeeLamports, 'battle', readyCheckGameId);
  return;
}
```

**Status:** FIXED

---

### SEC-03-06: tokenWarsManager.ts placeBet Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/tokenWarsManager.ts:797-824`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, amountLamports);
if (!hasSufficient) {
  return { success: false, error: 'Insufficient balance' };
}
pendingId = await balanceService.debitPending(walletAddress, amountLamports, 'token_wars', battle.id);
const lockTx = await balanceService.transferToGlobalVault(walletAddress, amountLamports, 'token_wars');
```

**After:**
```typescript
try {
  await balanceService.verifyAndLockBalance(
    walletAddress,
    amountLamports,
    'token_wars',
    battle.id
  );
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    return { success: false, error: 'Insufficient balance' };
  }
  return { success: false, error: 'Failed to lock bet on-chain. Please try again.' };
}
```

**Status:** FIXED

---

### SEC-03-07: draftTournamentManager.ts enterTournament Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/draftTournamentManager.ts:199-229`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);
if (!hasSufficient) {
  throw new Error('Insufficient balance');
}
pendingId = await balanceService.debitPending(walletAddress, entryFeeLamports, 'draft', tournamentId);
lockTx = await balanceService.transferToGlobalVault(walletAddress, entryFeeLamports, 'draft');
```

**After:**
```typescript
try {
  const lockResult = await balanceService.verifyAndLockBalance(
    walletAddress,
    entryFeeLamports,
    'draft',
    tournamentId
  );
  lockTx = lockResult.txId;
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    throw new Error('Insufficient balance');
  }
  throw new Error('Failed to lock entry fee on-chain. Please try again.');
}
```

**Status:** FIXED

---

### SEC-03-08: ldsManager.ts joinGame Race Condition [HIGH] - FIXED

**Affected Code:** `backend/src/services/ldsManager.ts:1015-1042`

**Before:**
```typescript
const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, CONFIG.ENTRY_FEE_LAMPORTS);
if (!hasSufficient) {
  return { success: false, error: 'Insufficient balance' };
}
pendingId = await balanceService.debitPending(walletAddress, CONFIG.ENTRY_FEE_LAMPORTS, 'lds', game.id);
const lockTx = await balanceService.transferToGlobalVault(walletAddress, CONFIG.ENTRY_FEE_LAMPORTS, 'lds');
```

**After:**
```typescript
try {
  await balanceService.verifyAndLockBalance(
    walletAddress,
    CONFIG.ENTRY_FEE_LAMPORTS,
    'lds',
    game.id
  );
} catch (error: any) {
  if (error.code === 'BAL_INSUFFICIENT_BALANCE') {
    return { success: false, error: 'Insufficient balance' };
  }
  return { success: false, error: 'Failed to lock entry fee on-chain. Please try again.' };
}
```

**Status:** FIXED

---

### Concurrent Request Handling Analysis

Beyond the TOCTOU fixes, the following concurrent request handling patterns were audited:

#### Multiple Bets Same Wallet Same Round

**Finding:** Oracle rounds (both services) allow multiple bets per round from the same wallet. This is by design (users can double down).

**Assessment:** OK - Each bet uses `verifyAndLockBalance()` which atomically checks and locks, preventing over-betting.

#### Concurrent Battle Entry

**Finding:** `battleManager.ts` tracks player battles via `playerBattles` Map. The check `this.playerBattles.get(walletAddress)` is not atomic with battle join.

**Assessment:** LOW RISK - The worst case is a player briefly appears in two battles, but:
1. On-chain locks prevent fund double-spending
2. The second battle will fail when trying to lock funds (already locked)
3. Eventual consistency will resolve within milliseconds

**Recommendation for Phase 8:** Consider adding mutex pattern for battle join operations.

#### Tournament Double-Entry

**Finding:** `draftTournamentManager.ts` checks for existing entry via DB query:
```typescript
const existing = db.getEntryForTournamentAndWallet(tournamentId, walletAddress);
if (existing) throw new Error('Already entered');
```

**Assessment:** LOW RISK - Database INSERT would fail on unique constraint. On-chain lock prevents fund double-spending.

---

### Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SEC-03-01 | predictionServiceOnChain hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-02 | predictionService hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-03 | spectatorService hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-04 | battleManager joinBattle hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-05 | battleManager createReadyCheck hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-06 | tokenWarsManager placeBet hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-07 | draftTournamentManager enterTournament hasSufficientBalance TOCTOU | HIGH | FIXED |
| SEC-03-08 | ldsManager joinGame hasSufficientBalance TOCTOU | HIGH | FIXED |

**All 8 TOCTOU race conditions have been fixed by migrating to the atomic `verifyAndLockBalance()` pattern.**

---

## SEC-04: Error Handling Audit

### Overview

Error handling security concerns:
1. **Information Disclosure:** Error messages should not expose internal details (paths, SQL queries, stack traces)
2. **Partial Failure Handling:** Multi-step operations should leave system in consistent state
3. **Error Type Consistency:** Using typed errors enables better error handling downstream

---

### Error Infrastructure Assessment

**Excellent Foundation Already Present:**

The backend has a well-designed error infrastructure in `backend/src/types/errors.ts` and `backend/src/utils/errors.ts`:

- `AppError` base class with code, statusCode, isOperational, context
- Typed errors: `DatabaseError`, `AuthError`, `BalanceError`, `ValidationError`, `ServiceError`
- Factory functions: `createAuthError()`, `createBalanceError()`, etc.
- Type guards: `isAppError()`, `isDatabaseError()`, etc.
- **Critical:** `toApiError()` function that sanitizes errors for client responses

**The Problem:**
The infrastructure exists but is not consistently used. Most handlers use raw `error.message` in responses.

---

### SEC-04-01: Error Message Exposure to Clients [MEDIUM] - DOCUMENTED

**Finding:**
Multiple handlers return `error.message` directly to clients:

```typescript
// Pattern found in 30+ locations
res.status(500).json({ error: error.message || 'Failed to X' });
socket.emit('error', error.message);
```

**Risk Assessment:**
- **Stack traces:** NOT exposed (verified - only logged internally)
- **SQL errors:** NOT exposed (verified - database errors caught at DB layer)
- **Internal paths:** Could be exposed if error message includes file paths
- **Sensitive data:** Could be exposed if service throws detailed errors

**Examples of Safe Patterns Already in Use:**
```typescript
// Good: Using error codes
res.status(403).json({ error: 'Wallet address does not match authenticated wallet', code: 'FORBIDDEN' });

// Good: Using generic message with fallback
res.status(400).json({ error: error.message || 'Failed to join waitlist' });
```

**Recommendation for Phase 8:**
Replace direct `error.message` with `toApiError()`:

```typescript
// BEFORE
res.status(500).json({ error: error.message || 'Failed to X' });

// AFTER
const apiError = toApiError(error);
res.status(apiError.statusCode).json({ code: apiError.code, error: apiError.message });
```

**Status:** DOCUMENTED (Low risk - no stack traces or SQL exposed, Phase 8 improvement)

---

### SEC-04-02: WebSocket Error Emissions [MEDIUM] - DOCUMENTED

**Finding:**
WebSocket error emissions also use raw error messages:

```typescript
// 40+ locations
socket.emit('error', error.message);
socket.emit('draft_error', error.message);
socket.emit('lds_join_error', { error: error.message });
```

**Assessment:**
Same risk as HTTP responses. Most are user-friendly messages from services, but some could expose internal details.

**Recommendation for Phase 8:**
Create a WebSocket-specific sanitization function:

```typescript
function emitSafeError(socket: Socket, event: string, error: unknown): void {
  const apiError = toApiError(error);
  socket.emit(event, { code: apiError.code, message: apiError.message });
}
```

**Status:** DOCUMENTED (Phase 8 improvement)

---

### SEC-04-03: Partial Failure Handling Analysis [HIGH] - VERIFIED

**Critical Flows Analyzed:**

#### 1. verifyAndLockBalance Flow (balanceService.ts)
```
1. Check balance (on-chain read)
2. Create pending transaction (local DB)
3. Transfer to global vault (on-chain write)
```

**Failure Scenarios:**
| Step | Fails | Consequence | Handling |
|------|-------|-------------|----------|
| 1 | Read fails | No state change | OK - Operation fails cleanly |
| 2 | DB insert fails | No state change | OK - Error before on-chain |
| 3 | TX fails | Pending record exists | RISK - pending not cleaned up |

**Finding:** If step 3 fails, the pending transaction record remains in the database, effectively locking the balance even though no funds were moved on-chain.

**Mitigation Already Present:**
- The `verifyAndLockBalance()` method calls `cancelTransaction()` on failure:
```typescript
} catch (error) {
  cancelTransaction(pendingId);  // Rollback pending record
  throw error;
}
```

**Status:** VERIFIED OK - Rollback on failure implemented

---

#### 2. Place Bet Flow (predictionServiceOnChain.ts, spectatorService.ts)
```
1. verifyAndLockBalance (atomic lock)
2. Create bet record (in-memory or DB)
3. Notify listeners
```

**Failure Scenarios:**
| Step | Fails | Consequence | Handling |
|------|-------|-------------|----------|
| 1 | Lock fails | No state change | OK |
| 2 | Record fails | Funds locked, no bet | RISK |
| 3 | Notify fails | Bet exists, no update | LOW |

**Finding:** If bet record creation fails after funds are locked, funds remain in global vault with no corresponding bet record.

**Mitigation Present:**
Services wrap step 2 in try/catch with refund:
```typescript
try {
  bet = dbPlaceBet(...);
} catch (error) {
  await balanceService.refundFromGlobalVault(...);
  throw new Error('Failed to place bet');
}
```

**Status:** VERIFIED OK - Refund on failure implemented

---

#### 3. Battle Ready Check Flow (battleManager.ts)
```
1. Lock funds for Player 1 (on-chain)
2. Lock funds for Player 2 (on-chain)
3. Create battle record
4. Set up ready check
```

**Failure Scenarios:**
| Step | Fails | Consequence | Handling |
|------|-------|-------------|----------|
| 1 | Lock fails | No state change | OK |
| 2 | Lock fails | P1 funds locked, P2 not | RISK |
| 3 | Create fails | Both funds locked | RISK |

**Mitigation Present (SEC-03 fix):**
```typescript
try {
  lockResult1 = await verifyAndLockBalance(player1Wallet, ...);
} catch { return; }

try {
  lockResult2 = await verifyAndLockBalance(player2Wallet, ...);
} catch {
  // Refund P1 since P2 failed
  await balanceService.refundFromGlobalVault(player1Wallet, ...);
  return;
}
```

**Status:** VERIFIED OK - Sequential locks with rollback

---

#### 4. Settlement Flow (predictionServiceOnChain.ts, spectatorService.ts)
```
1. Determine winners
2. Credit each winner (on-chain)
3. Mark bets as settled (DB)
```

**Failure Scenarios:**
| Step | Fails | Consequence | Handling |
|------|-------|-------------|----------|
| 2 | Credit fails | Winner not paid | HIGH RISK |
| 3 | DB update fails | Funds credited, not tracked | MEDIUM |

**Mitigation Present:**
Failed credits are logged to `failedPayoutsDatabase`:
```typescript
if (!tx) {
  addFailedPayout(gameType, gameId, wallet, amount, 'credit', 'TX failed', retries);
}
```

**Recovery Process:**
Admin endpoint or manual intervention can retry failed payouts.

**Status:** VERIFIED OK - Failed payout recovery queue exists

---

### SEC-04-04: Error Type Usage [LOW] - DOCUMENTED

**Finding:**
Services mostly use raw `Error()` instead of typed errors:

```typescript
// Current pattern (most services)
throw new Error('Insufficient balance');

// Preferred pattern (balanceService.ts uses this)
throw { code: 'BAL_INSUFFICIENT_BALANCE', message: '...' };
```

**Assessment:**
This is a code quality issue, not a security issue. Typed errors enable better error handling but don't affect security.

**Recommendation for Phase 8:**
Gradually migrate to typed errors:
```typescript
import { BalanceError, BalanceErrorCode } from '../types/errors';
throw new BalanceError(BalanceErrorCode.INSUFFICIENT_BALANCE, 'Insufficient balance', { required, available });
```

**Status:** DOCUMENTED (Code quality - Phase 8)

---

### SEC-04-05: Uncaught Exception Handling [LOW] - VERIFIED OK

**Finding:**
Global exception handlers exist and send alerts:

```typescript
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  await alertService.sendCriticalAlert('Uncaught Exception', ...);
  setTimeout(() => process.exit(1), 1000);
});
```

**Assessment:**
- Stack traces are logged internally (OK)
- Alerts are sent to Discord (OK)
- Server restarts on uncaught exception (OK)
- Stack is truncated to 500 chars in alert context (OK)

**Status:** VERIFIED OK

---

### Summary

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SEC-04-01 | error.message exposed to clients | MEDIUM | DOCUMENTED |
| SEC-04-02 | WebSocket error emissions | MEDIUM | DOCUMENTED |
| SEC-04-03 | Partial failure handling | HIGH | VERIFIED OK |
| SEC-04-04 | Error type usage | LOW | DOCUMENTED |
| SEC-04-05 | Uncaught exception handling | LOW | VERIFIED OK |

**Key Findings:**
1. **No stack traces or SQL errors reach clients** - Verified safe
2. **Partial failures are handled with rollback/recovery** - Well implemented
3. **Error message sanitization not consistently used** - Phase 8 improvement
4. **Typed error infrastructure exists but underutilized** - Phase 8 improvement

---

## Recommendations for Phase 8

### High Priority
1. ~~Migrate predictionService.ts to verifyAndLockBalance~~ - DONE (SEC-03)
2. **Deploy Redis in production** - ReplayCache now supports Redis but needs deployment config
3. **Adopt toApiError() consistently** - Replace raw error.message in responses

### Medium Priority
4. **Add Zod schema validation** - For BattleConfig and other complex inputs at handler level
5. **Explicit wallet validation utility** - Better error messages for invalid wallets
6. **Create emitSafeError() for WebSocket** - Consistent WebSocket error sanitization

### Low Priority
7. ~~Audit other WIP services~~ - DONE (SEC-03)
8. **Migrate to typed errors** - Use BalanceError, ValidationError, etc. throughout
9. **Consider rate limit tuning** - Current limits may need adjustment based on usage patterns

---

## Appendix: Files Modified During Audit

| File | Changes |
|------|---------|
| `backend/src/index.ts` | Added validation for prediction side, token wars side, LDS prediction, chat content |

**Note:** `backend/src/utils/replayCache.ts` was reviewed and found to already have Redis support with atomic SET NX EX - no changes needed.

---

*Audit completed: 2026-01-22*
*Next: SEC-03 (Transaction Integrity) and SEC-04 (Rate Limiting) in Plan 07-02*
