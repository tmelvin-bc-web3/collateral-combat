# Phase 7: Backend Security - Research

**Researched:** 2026-01-22
**Domain:** Backend security audit (Node.js, Express, Socket.IO)
**Confidence:** HIGH

## Summary

Backend security for this wagering platform requires verifying four critical areas: (1) input validation across all API and WebSocket endpoints, (2) wallet signature verification for authenticated operations, (3) TOCTOU race condition prevention using the `verifyAndLockBalance` pattern documented in Phase 6, and (4) secure error handling that prevents sensitive data exposure.

The Phase 6 contract audit documented 15 invariants that the backend MUST respect. The most critical finding is that the existing codebase uses the deprecated `hasSufficientBalance()` method in multiple services instead of the atomic `verifyAndLockBalance()` pattern, creating potential race conditions.

**Primary recommendation:** The audit should prioritize finding and fixing all uses of the deprecated `hasSufficientBalance()` pattern, then systematically review all endpoints for input validation gaps, authentication bypass vectors, and error handling issues.

## Standard Stack

The audit methodology follows OWASP guidelines with domain-specific additions for Solana/WebSocket.

### Core Audit Categories

| Category | OWASP Reference | DegenDome-Specific Focus |
|----------|-----------------|--------------------------|
| Input Validation | [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) | Wallet address format, lamport amounts, bet parameters |
| Authentication | [Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Wallet signature verification, replay attack prevention |
| Race Conditions | [CWE-367 TOCTOU](https://cwe.mitre.org/data/definitions/367.html) | Balance check-then-use patterns |
| Error Handling | [Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html) | No stack traces, no internal paths |

### Validation Libraries

| Library | Purpose | Status in Codebase |
|---------|---------|-------------------|
| Zod | Schema validation for API inputs | VERIFY USE |
| validator.js | String sanitization | VERIFY USE |
| express-validator | Request validation middleware | VERIFY USE |
| Joi | Alternative schema validation | VERIFY USE |

### Security Headers/Middleware

| Middleware | Purpose | Status |
|------------|---------|--------|
| helmet | Security HTTP headers | VERIFY CONFIGURED |
| cors | Cross-origin control | VERIFY WHITELIST |
| express-rate-limit | Request rate limiting | VERIFIED IN USE |
| Socket rate limiter | WebSocket rate limiting | VERIFIED IN USE |

## Architecture Patterns

### Pattern 1: Atomic Balance Operations (CRITICAL)

**What:** The `verifyAndLockBalance` pattern combines balance verification and fund locking into a single atomic on-chain transaction.

**Why critical:** Phase 6 documented this as INV-04 (User cannot withdraw funds locked in active bets). The deprecated `hasSufficientBalance()` creates a TOCTOU window where:
1. Backend checks balance (sufficient)
2. User initiates withdrawal (succeeds)
3. Backend records bet (insufficient funds, but bet already accepted)

**Correct pattern (from Phase 6 Contract Audit):**
```typescript
// CORRECT: Atomic verify-and-lock
async function placeBet(wallet: PublicKey, amount: number, roundId: number) {
  // 1. Create pending debit (tracks intent)
  const pendingId = await balanceService.debitPending(wallet, amount, 'game', roundId);

  // 2. Call transferToGlobalVault to lock funds on-chain atomically
  const tx = await balanceService.transferToGlobalVault(wallet, amount, 'game');
  if (!tx) {
    balanceService.cancelDebit(pendingId);
    throw new Error('Failed to lock funds');
  }

  // 3. Confirm debit only after on-chain lock succeeds
  balanceService.confirmDebit(pendingId);

  // 4. Record bet in backend (funds already locked)
  await recordBet(wallet, roundId, amount);
}
```

**Deprecated pattern (VULNERABLE):**
```typescript
// WRONG: Race condition between check and bet
async function placeBetUnsafe(wallet: PublicKey, amount: number) {
  const balance = await getOnChainBalance(wallet);
  if (balance >= amount) {
    await recordBet(wallet, amount); // Window for withdrawal!
  }
}
```

### Pattern 2: Wallet Signature Verification

**What:** All sensitive operations require cryptographic proof of wallet ownership.

**When to use:**
- Placing bets with wallet balance
- Withdrawing funds
- Updating user settings
- Accessing sensitive user data

**Required flow:**
```typescript
// 1. Frontend creates signed message
const message = `DegenDome:${action}:${timestamp}`;
const signature = await wallet.signMessage(new TextEncoder().encode(message));

// 2. Backend verifies signature
function verifyWalletSignature(walletAddress: string, signature: string, timestamp: string): boolean {
  // Check timestamp freshness (prevent replay)
  const now = Date.now();
  const messageTime = parseInt(timestamp);
  if (Math.abs(now - messageTime) > 5 * 60 * 1000) { // 5 minute window
    return false;
  }

  // Check replay cache (prevent signature reuse)
  if (replayCache.has(signature)) {
    return false;
  }

  // Verify cryptographic signature
  const message = `DegenDome:${action}:${timestamp}`;
  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    bs58.decode(signature),
    new PublicKey(walletAddress).toBytes()
  );

  if (isValid) {
    replayCache.set(signature, Date.now()); // Mark used
  }
  return isValid;
}
```

### Pattern 3: Input Validation Schema

**What:** All API inputs validated against strict schemas before processing.

**Schema requirements:**

| Field Type | Validation Rules |
|------------|------------------|
| `walletAddress` | 32-44 chars, base58 characters only, regex: `^[1-9A-HJ-NP-Za-km-z]{32,44}$` |
| `amount` (lamports) | Integer, >= MIN_BET (10,000,000), <= MAX_BET (100,000,000,000) |
| `amount` (SOL) | Number, >= 0.01, <= 100, max 9 decimal places |
| `side` | Enum: `'long'` or `'short'` (or `'token_a'`, `'token_b'`) |
| `roundId` | Integer, positive |
| `battleId` | UUID format or string ID |

**Example Zod schema:**
```typescript
const PlaceBetSchema = z.object({
  walletAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid wallet address'),
  amount: z.number().int().min(10_000_000).max(100_000_000_000),
  side: z.enum(['long', 'short']),
  roundId: z.number().int().positive(),
});
```

### Pattern 4: Error Response Sanitization

**What:** All error responses use generic messages, never expose internal details.

**Required:**
```typescript
// Safe error response
res.status(400).json({
  error: 'Invalid request',
  code: 'VAL_INVALID_INPUT',
  requestId: req.id // For support reference
});

// NEVER expose:
// - Stack traces
// - SQL queries
// - Internal file paths
// - Detailed validation failures for auth
// - Raw error messages from dependencies
```

### Anti-Patterns to Avoid

- **Check-then-use:** Never check balance separately from locking funds
- **Trusting client wallet:** Always use authenticated wallet from socket/session, not request body
- **Exposing internal errors:** Never pass `error.message` directly to response
- **Missing rate limits:** All endpoints must have rate limiting
- **Ignoring WebSocket:** WebSocket events are APIs too - validate all inputs

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signature verification | Custom crypto | `@solana/web3.js` nacl.sign.detached.verify | Crypto is hard, subtle bugs |
| Replay protection | Custom timestamp check | Atomic Redis SET NX EX (per v1.0 decision) | Redis guarantees atomicity |
| Rate limiting | Custom counter | express-rate-limit + socket rate limiter | Battle-tested, handles edge cases |
| Input validation | Custom regex | Zod/Joi schemas | Type inference, composable |
| Wallet address validation | Custom regex | @solana/web3.js PublicKey.isOnCurve | Handles all edge cases |

**Key insight:** The codebase already has `signatureVerification.ts` and `replayCache.ts` - audit should verify these are used correctly everywhere, not build alternatives.

## Common Pitfalls

### Pitfall 1: Deprecated hasSufficientBalance Usage

**What goes wrong:** Services use `hasSufficientBalance()` which checks balance but doesn't lock funds, creating TOCTOU window.

**Why it happens:** The correct pattern `verifyAndLockBalance` was added later; older code wasn't migrated.

**How to avoid:** Search for all uses of `hasSufficientBalance` and replace with atomic pattern.

**Warning signs in code:**
```typescript
// RED FLAG
const hasSufficient = await balanceService.hasSufficientBalance(wallet, amount);
if (hasSufficient) {
  // ... place bet without locking ...
}
```

**Affected services (from codebase grep):**
- `predictionService.ts:348`
- `draftTournamentManager.ts:205`
- `battleManager.ts:159`, `1003-1004`
- `tokenWarsManager.ts:802`
- `spectatorService.ts:227`
- `ldsManager.ts:1020`
- `predictionServiceOnChain.ts:732`

### Pitfall 2: Trusting Client-Provided Wallet Address

**What goes wrong:** Backend trusts `walletAddress` from request body instead of authenticated session.

**Why it happens:** Frontend sends wallet in requests for convenience; backend uses it directly.

**How to avoid:** Always derive wallet from authenticated socket/session, ignore request body wallet.

**Warning signs:**
```typescript
// RED FLAG: Using client-provided wallet
socket.on('place_bet', (data) => {
  const wallet = data.walletAddress; // Could be anyone's wallet!
  await placeBet(wallet, data.amount);
});

// CORRECT: Use authenticated wallet
socket.on('place_bet', (data) => {
  const wallet = getAuthenticatedWallet(socket); // From session
  await placeBet(wallet, data.amount);
});
```

### Pitfall 3: Missing Input Validation on WebSocket Events

**What goes wrong:** HTTP endpoints have validation middleware, WebSocket events don't.

**Why it happens:** WebSocket handlers are often written inline without validation layer.

**How to avoid:** Apply same validation schemas to WebSocket events as HTTP.

**Warning signs:**
```typescript
// RED FLAG: Direct use of user input
socket.on('open_position', (battleId, asset, side, leverage, size) => {
  battleManager.openPosition(battleId, wallet, asset, side, leverage, size);
  // What if leverage is -1? What if asset is '../../../etc/passwd'?
});
```

### Pitfall 4: Error Messages Exposing Internals

**What goes wrong:** Catch blocks pass raw error messages to responses.

**Why it happens:** Developers want helpful error messages during development.

**How to avoid:** Log detailed errors server-side, return generic messages to client.

**Warning signs:**
```typescript
// RED FLAG
} catch (error) {
  res.status(500).json({ error: error.message }); // Exposes stack trace
}

// CORRECT
} catch (error) {
  logger.error('Operation failed', { error, wallet, operation });
  res.status(500).json({ error: 'Internal error', code: 'SVC_INTERNAL_ERROR' });
}
```

### Pitfall 5: Inconsistent Partial Failure Handling

**What goes wrong:** Multi-step operations (lock funds -> record bet -> update pool) fail midway, leaving inconsistent state.

**Why it happens:** No transaction/rollback pattern for cross-system operations.

**How to avoid:** Use pending transaction tracking, idempotent operations, compensation patterns.

**Warning signs:**
```typescript
// RED FLAG: No rollback on partial failure
await lockFundsOnChain(wallet, amount);
await recordBetInDB(wallet, amount, roundId); // What if this fails?
await updatePoolTotals(roundId, amount);       // State is now inconsistent
```

## Code Examples

Verified patterns from the codebase.

### Correct: Signature Verification (from signatureVerification.ts)
```typescript
// Source: backend/src/utils/signatureVerification.ts
export function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  timestamp: string
): boolean {
  // 1. Validate timestamp (5 minute window)
  const now = Date.now();
  const messageTime = parseInt(timestamp);
  if (Math.abs(now - messageTime) > 5 * 60 * 1000) {
    return false;
  }

  // 2. Check replay cache
  if (replayCache.isUsed(signature)) {
    return false;
  }

  // 3. Verify signature cryptographically
  const message = `DegenDome:auth:${timestamp}`;
  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    bs58.decode(signature),
    new PublicKey(walletAddress).toBytes()
  );

  // 4. Mark signature as used
  if (isValid) {
    replayCache.markUsed(signature);
  }

  return isValid;
}
```

### Correct: Rate Limiting (from middleware/rateLimiter.ts)
```typescript
// Source: backend/src/middleware/rateLimiter.ts
const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,            // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' },
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 requests per minute for sensitive endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' },
});
```

### Correct: Socket Authentication (from index.ts)
```typescript
// Source: backend/src/index.ts
// SECURITY: Use authenticated wallet, not client-provided
const authenticatedWallet = getAuthenticatedWallet(socket, wallet);
walletAddress = authenticatedWallet;
const battle = await battleManager.createBattle(config, authenticatedWallet);
```

### Correct: Pending Transaction Tracking (from balanceService.ts)
```typescript
// Source: backend/src/services/balanceService.ts
async verifyAndLockBalance(
  walletAddress: string,
  amount: number,
  gameMode: string,
  gameId: string
): Promise<{ pendingId: string; txSignature: string }> {
  // 1. Create pending debit (atomic intent)
  const pendingId = await this.debitPending(walletAddress, amount, gameMode, gameId);

  try {
    // 2. Lock on-chain atomically
    const txSignature = await this.transferToGlobalVault(walletAddress, amount, gameMode);
    if (!txSignature) {
      this.cancelDebit(pendingId);
      throw new Error('Failed to lock funds on-chain');
    }

    // 3. Confirm only after on-chain success
    this.confirmDebit(pendingId);
    return { pendingId, txSignature };
  } catch (error) {
    this.cancelDebit(pendingId);
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `hasSufficientBalance()` check-then-bet | `verifyAndLockBalance()` atomic pattern | Phase 6 (v1.0) | Prevents balance race conditions |
| Trust client wallet in request | Use authenticated wallet from session | Phase 1 security hardening | Prevents bet-on-behalf-of attacks |
| Manual signature verification | Standardized verifyWalletSignature util | v1.0 decision | Consistent crypto, replay protection |
| In-memory replay cache | Redis SET NX EX (v1.0 decision) | v1.0 decision | Survives server restarts |

**Deprecated/outdated:**
- `hasSufficientBalance()`: Marked deprecated in code with warning, but still used in 7+ locations
- Direct error.message in responses: Should use error types from `types/errors.ts`

## Contract Invariants (from Phase 6)

The backend MUST respect these 15 invariants documented in CONTRACT-AUDIT.md:

### Balance Invariants

| ID | Invariant | Backend Responsibility |
|----|-----------|----------------------|
| INV-01 | `user_balance.balance = vault.lamports (modulo rent)` | Track pending transactions |
| INV-02 | `user_balance.total_deposited >= user_balance.total_withdrawn` | Never credit without on-chain success |
| INV-03 | `global_vault.lamports >= sum of all pending payouts` | Check vault before creditWinnings |
| INV-04 | User cannot withdraw funds locked in active bets | Use verifyAndLockBalance pattern |
| INV-05 | Balance updates occur BEFORE transfers | Follow state-before-call pattern |

### Session Invariants

| ID | Invariant | Backend Responsibility |
|----|-----------|----------------------|
| INV-11 | Session must be valid (not expired) | Backend can also validate expiry |
| INV-12 | Session.authority == user_balance.owner | Verify in backend if caching |
| INV-15 | Session cannot withdraw/transfer authority | Backend enforces same isolation |

### Round Lifecycle Invariants

| ID | Invariant | Backend Responsibility |
|----|-----------|----------------------|
| INV-06 | Round status: Open -> Locked -> Settled | Backend manages state transitions |
| INV-07 | Cannot place bets after lock_time | Reject bets in locked rounds |
| INV-08 | Cannot settle before end_time | Wait for round completion |

## Open Questions

Things that couldn't be fully resolved.

1. **Redis replay cache implementation status**
   - What we know: v1.0 decision says "Atomic Redis SET NX EX for replay protection"
   - What's unclear: Is this implemented, or still using in-memory cache?
   - Recommendation: Audit should verify actual implementation

2. **Helmet configuration completeness**
   - What we know: Codebase uses security middleware
   - What's unclear: Are all recommended headers configured?
   - Recommendation: Verify CSP, HSTS, X-Frame-Options settings

3. **Error type adoption**
   - What we know: `types/errors.ts` defines proper error classes
   - What's unclear: How widely are they used vs raw errors?
   - Recommendation: Audit should catalog error handling patterns

## Audit Scope Summary

Based on Phase 7 context and research:

### SEC-01: Input Validation
- All REST API parameters
- All WebSocket events
- Wallet address format validation
- Amount bounds checking (MIN_BET, MAX_BET)
- Enum/option validation

### SEC-02: Auth/Session
- Wallet signature verification on all sensitive operations
- Session key management
- Replay attack prevention
- Socket authentication patterns

### SEC-03: Race Conditions
- All uses of `hasSufficientBalance()` (7+ locations)
- Concurrent request handling
- TOCTOU in balance checking
- Pending transaction tracking

### SEC-04: Error Handling
- Error message sanitization
- No sensitive data in responses
- Partial failure recovery
- State consistency after failures

### Services to Audit (priority order)

1. **balanceService.ts** - Core balance operations, verifyAndLockBalance
2. **predictionServiceOnChain.ts** - Active Oracle game, handles real money
3. **tokenWarsManager.ts** - Active game mode, balance handling
4. **ldsManager.ts** - WIP game mode
5. **battleManager.ts** - Battle logic, entry fees
6. **spectatorService.ts** - Spectator betting
7. **draftTournamentManager.ts** - Draft tournaments

### Report Format

Single comprehensive report: `.planning/audits/BACKEND-AUDIT.md`
- Executive summary table at top
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Each finding: description, affected code, exploit scenario, remediation, verification

## Sources

### Primary (HIGH confidence)
- [OWASP Node.js Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [CWE-367: TOCTOU Race Condition](https://cwe.mitre.org/data/definitions/367.html)
- Phase 6 Contract Audit (CONTRACT-AUDIT.md) - 15 invariants documented

### Secondary (MEDIUM confidence)
- [WebSocket Security Hardening Guide](https://websocket.org/guides/security/)
- [Bright Security: WebSocket Top 8 Vulnerabilities](https://brightsec.com/blog/websocket-security-top-vulnerabilities/)
- [PortSwigger: Race Conditions](https://portswigger.net/web-security/race-conditions)

### Codebase Analysis (HIGH confidence)
- `backend/src/services/balanceService.ts` - verifyAndLockBalance pattern exists but hasSufficientBalance deprecated
- `backend/src/utils/signatureVerification.ts` - Signature verification utility
- `backend/src/utils/replayCache.ts` - Replay protection
- `backend/src/middleware/rateLimiter.ts` - Rate limiting
- `backend/src/middleware/auth.ts` - Authentication middleware
- `backend/src/types/errors.ts` - Error type definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OWASP guidelines well-documented
- Architecture patterns: HIGH - Phase 6 contract audit provides authoritative guidance
- Pitfalls: HIGH - Direct codebase analysis confirms issues
- Code examples: HIGH - From actual codebase

**Research date:** 2026-01-22
**Valid until:** 60 days (security best practices stable, but audit findings may change codebase)
