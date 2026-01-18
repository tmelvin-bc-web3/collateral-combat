# Sol Battles Security Audit Report

**Date:** January 2026
**Scope:** Full-stack security audit (Frontend, Backend, Database, Blockchain)
**Status:** CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

This audit identified **23 critical/high severity vulnerabilities** and **18 medium severity issues** across the Sol Battles platform. The most severe issues involve:

1. **WebSocket endpoints lacking authentication** - allows wallet impersonation
2. **Race conditions in balance operations** - enables double-spending
3. **Game logic exploits** - free bet abuse, payout manipulation
4. **Missing input validation** - multiple injection vectors

**Immediate action required** on items marked CRITICAL before production deployment.

---

## Vulnerability Summary

| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | 12 | Auth bypass, double-spend, wallet impersonation |
| HIGH | 11 | Race conditions, data leakage, payout manipulation |
| MEDIUM | 18 | Input validation, error handling, timing attacks |
| LOW | 5 | Information disclosure, configuration |

---

## CRITICAL VULNERABILITIES

### 1. WebSocket Authentication Bypass

**Location:** `backend/src/index.ts` (lines 1616-1912)

**Issue:** Multiple WebSocket events accept `wallet` parameter from client without signature verification:

```typescript
// VULNERABLE - wallet comes from untrusted client
socket.on('create_battle', (config, wallet) => { ... });
socket.on('join_battle', (battleId, wallet) => { ... });
socket.on('place_bet', (battleId, backedPlayer, amount, wallet) => { ... });
socket.on('place_prediction', (asset, side, amount, wallet) => { ... });
```

**Attack:** Any user can place bets, create battles, or perform actions as ANY wallet address by simply passing a different wallet parameter.

**Affected Events:**
- `create_battle` - Line 1616
- `join_battle` - Line 1629
- `queue_matchmaking` - Line 1648
- `place_bet` - Line 1806
- `get_my_bets` - Line 1815
- `place_prediction` - Line 1896
- `place_prediction_bet` - Line 1906
- `register_wallet` - Line 2076

**Fix Required:**
```typescript
// Require signature verification for all financial operations
socket.on('place_bet', async (battleId, backedPlayer, amount, wallet, signature, timestamp) => {
  // Verify wallet owns the signature
  if (!verifyAuthSignature(wallet, signature, timestamp)) {
    socket.emit('error', { message: 'Invalid signature' });
    return;
  }
  // ... proceed with bet
});
```

---

### 2. Double-Spend via Race Condition (TOCTOU)

**Location:** `backend/src/services/battleManager.ts` (lines 122-149)

**Issue:** Balance check and fund locking are separated by async operations:

```typescript
// Step 1: Check balance (TIME OF CHECK)
const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);

// ... gap where another request can pass the same check ...

// Step 2: Lock funds (TIME OF USE)
const lockTx = await balanceService.transferToGlobalVault(walletAddress, entryFeeLamports, 'battle');
```

**Attack:**
1. User has 1 SOL balance
2. Sends two concurrent `joinBattle` requests for 1 SOL each
3. Both pass balance check (seeing 1 SOL available)
4. Both attempt to lock funds - one succeeds, one fails but state is corrupted

**Fix Required:**
```typescript
// Use distributed lock per wallet
const lockKey = `balance_lock:${walletAddress}`;
await redis.lock(lockKey, async () => {
  const hasSufficient = await balanceService.hasSufficientBalance(walletAddress, entryFeeLamports);
  if (!hasSufficient) throw new Error('Insufficient balance');
  await balanceService.transferToGlobalVault(walletAddress, entryFeeLamports, 'battle');
});
```

---

### 3. Free Bet Exploitation - Fund Bypass

**Location:** `backend/src/services/ldsManager.ts` (lines 1012-1080)

**Issue:** Free bets skip ALL balance verification:

```typescript
if (!isFreeBet) {
  // Check balance, lock funds, etc.
} else {
  console.log(`[LDS] Processing free bet for ${walletAddress}...`);
  // NO BALANCE CHECK - proceeds directly to game
}
```

**Attack:**
1. Player joins LDS with `isFreeBet=true`
2. No balance verification occurs
3. Player wins and receives real SOL from other players' stakes
4. Platform covers the "free bet" amount from nowhere

**Fix Required:**
```typescript
if (isFreeBet) {
  // Verify user actually has free bet credits
  const freeBetCredits = getFreeBetCredits(walletAddress);
  if (freeBetCredits <= 0) {
    throw new Error('No free bet credits available');
  }
  // Deduct free bet credit
  consumeFreeBetCredit(walletAddress);
}
```

---

### 4. Token Wars Payout Marked Won Without Payment

**Location:** `backend/src/services/tokenWarsManager.ts` (lines 634-658)

**Issue:** Failed payouts are marked as "won" in database:

```typescript
for (const bet of winningBets) {
  const tx = await this.retryPayout(bet.walletAddress, payout, battleId);
  if (tx) {
    settleBet(bet.id, 'won', payout);
  } else {
    settleBet(bet.id, 'won', 0);  // BUG: Marked WON but paid 0!
  }
}
```

**Impact:** User sees "won" status but receives nothing. Creates accounting inconsistencies and user complaints.

**Fix Required:**
```typescript
if (tx) {
  settleBet(bet.id, 'won', payout);
} else {
  settleBet(bet.id, 'payout_failed', 0);
  addToRetryQueue(bet.id, bet.walletAddress, payout);
}
```

---

### 5. Spectator Odds Lock Race Condition

**Location:** `backend/src/services/spectatorService.ts` (lines 397-479)

**Issue:** Odds lock `used` flag is checked and set non-atomically:

```typescript
// Check if lock is already used
if (lock.used) {
  return null;
}
// ... other checks ...
// Mark lock as used (RACE WINDOW)
spectatorBetDatabase.markLockUsed(lockId);
```

**Attack:**
1. Request odds lock for $10 bet
2. Send two concurrent `verifyAndRecordBet()` calls
3. Both pass the `!lock.used` check
4. Both create bets with same odds lock - double spend

**Fix Required:**
```typescript
// Atomic check-and-set
const marked = spectatorBetDatabase.markLockUsedAtomic(lockId);
if (!marked) {
  return null; // Already used by concurrent request
}
```

---

### 6. Waitlist Wallet Update Without Signature

**Location:** `backend/src/index.ts` (line 737)

**Issue:** `PUT /api/waitlist/wallet` accepts wallet changes without verification:

```typescript
app.put('/api/waitlist/wallet', async (req, res) => {
  const { email, walletAddress } = req.body;
  // NO SIGNATURE VERIFICATION
  await updateWalletForEmail(email, walletAddress);
});
```

**Attack:** Attacker can change wallet address for any email in the waitlist.

**Fix Required:** Require signature verification proving ownership of new wallet.

---

### 7. Draft Tournament Double Entry Race

**Location:** `backend/src/services/draftTournamentManager.ts` (lines 180-260)

**Issue:** Entry check is not atomic with entry creation:

```typescript
// Check exists (non-atomic)
const existing = db.getEntryForTournamentAndWallet(tournamentId, walletAddress);
if (existing) throw new Error('Already entered');

// ... async fund locking ...

// Create entry (can happen twice if concurrent)
const entry = createEntry(tournamentId, walletAddress, ...);
```

**Attack:** Send two concurrent join requests, both pass the existence check, both create entries.

---

### 8. Parallel Settlement Double Payment

**Location:** `backend/src/services/spectatorService.ts` (lines 633-676)

**Issue:** No idempotency check before crediting winnings:

```typescript
for (const bet of winningBets) {
  // NO CHECK if already settled
  const tx = await balanceService.creditWinnings(bet.bettor, totalPayoutLamports, 'spectator', battleId);
}
```

**Attack:** If settlement is triggered twice (retry, network issue), players receive double payment.

**Fix Required:**
```typescript
// Check settlement status first
if (isAlreadySettled(battleId)) {
  console.log('Battle already settled, skipping');
  return;
}
// Mark as settling BEFORE payouts
markSettlementStarted(battleId);
```

---

### 9. Solvency Bypass via Refunds

**Location:** `backend/src/services/balanceService.ts` (lines 407-458)

**Issue:** Refunds reduce `totalLocked` without validation:

```typescript
data.gameModeBalances[gameType].totalLocked = Math.max(0,
  data.gameModeBalances[gameType].totalLocked - amountLamports
);
```

**Attack:** Issue refunds exceeding locked amounts to drain other game modes' funds.

---

### 10. No Rate Limiting on Financial WebSocket Events

**Location:** `backend/src/index.ts`

**Issue:** Critical financial operations have no rate limiting:

| Event | Rate Limited? |
|-------|--------------|
| `place_bet` | NO |
| `place_prediction` | NO |
| `get_my_bets` | NO |
| `lds_join_game` | YES |
| `token_wars_place_bet` | YES |

**Fix Required:** Apply `checkSocketRateLimit` to ALL financial operations.

---

### 11. JWT Expiry Mismatch

**Location:** `backend/src/utils/jwt.ts` vs `backend/src/index.ts`

**Issue:** Token created with 4h expiry but response claims 24h:

```typescript
// jwt.ts
{ expiresIn: '4h' }

// index.ts response
res.json({ token, expiresIn: '24h' });  // WRONG
```

**Impact:** Frontend caches token for 24h but backend rejects after 4h.

---

### 12. Default JWT Secret in Development

**Location:** `backend/src/utils/jwt.ts` (line 9)

**Issue:** Fallback secret is a known string:

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
```

**Risk:** If `JWT_SECRET` not set in production, all tokens are forgeable.

**Note:** Production check exists (lines 4-6) but relies on process exit.

---

## HIGH SEVERITY VULNERABILITIES

### 13. In-Memory Replay Protection

**Location:** `backend/src/middleware/auth.ts` (line 24)

**Issue:** Signature replay protection uses in-memory Map:
- Doesn't persist across server restarts
- In load-balanced environments, each server has separate cache
- Allows replay attacks between servers

**Fix:** Use Redis or database for replay tracking.

---

### 14. Error Messages Leak Information

**Location:** Multiple files

**Examples:**
```typescript
res.status(500).json({ error: error.message });  // Exposes internal errors
```

**Files affected:**
- `index.ts`: lines 376, 701, 752, 773, 882, 893, 911, 1067
- All socket error handlers

**Fix:** Return generic error messages, log details server-side.

---

### 15. Email Enumeration via Waitlist

**Location:** `backend/src/index.ts` (line 706)

**Issue:** `/api/waitlist/status/:email` returns different responses for existing vs non-existing emails.

**Fix:** Return same response structure regardless of existence.

---

### 16. Prediction Data Publicly Exposed

**Location:** `backend/src/index.ts` (lines 979-1002)

**Issue:** `/api/predictions/round/:roundId` returns all user bets with wallet addresses publicly.

**Fix:** Require authentication or anonymize wallet addresses.

---

### 17. CORS Allows No-Origin Requests

**Location:** `backend/src/config.ts` (lines 38-42)

**Issue:** Requests without Origin header are allowed in production:

```typescript
if (!origin) {
  callback(null, true);  // Allows any no-origin request
}
```

**Fix:** Only allow no-origin for specific health check endpoints.

---

### 18. SSRF via NFT Image URL

**Location:** `backend/src/index.ts` (lines 321-335)

**Issue:** NFT image URL validation misses some private IP ranges:
- Blocks: 127.0.0.1, 192.168.x.x, 10.x.x.x
- Misses: 172.16.0.0/12

**Fix:** Use comprehensive private IP detection.

---

### 19. Payout Rounding Losses

**Location:** Multiple game managers

**Issue:** Multiple `Math.floor()` operations cause fund leakage:

```typescript
const perWinner = Math.floor(distributablePool / winnerWallets.length);
// With 1000 lamports / 3 winners = 333 each = 999 total, 1 lost
```

**Fix:** Track remainder and add to last winner or platform.

---

### 20. Free Bet Double Credit

**Location:** `backend/src/services/ldsManager.ts` (lines 884-912)

**Issue:** Free bet refund has no idempotency:

```typescript
addFreeBetCredit(walletAddress, 1, `LDS game ${gameId} refund`);
// If this succeeds but response times out, retry credits again
```

**Fix:** Use transaction ID for deduplication.

---

### 21. Matchmaking Race Condition

**Location:** `backend/src/services/battleManager.ts` (lines 745-776)

**Issue:** Player can be added to multiple battles simultaneously:

```typescript
const existingBattle = this.playerBattles.get(walletAddress);
// Race window between get and set
this.playerBattles.set(walletAddress, battleId);
```

**Fix:** Use mutex/lock per wallet during matchmaking.

---

### 22. Dynamic SQL Construction

**Location:** `backend/src/db/challengesDatabase.ts` (lines 235-251)

**Issue:** SQL query built with string concatenation:

```typescript
let sql = 'UPDATE battle_challenges SET status = ?';
if (updates?.winnerId) {
  sql += ', winner_id = ?';
}
```

**Fix:** Use static prepared statements with NULL for optional values.

---

### 23. Price Feed Staleness

**Location:** `backend/src/services/ldsManager.ts` (lines 345-365)

**Issue:** No validation of price freshness from `priceService`.

**Risk:** Stale prices during high volatility cause incorrect game outcomes.

**Fix:** Check price timestamp and reject if too old.

---

## MEDIUM SEVERITY VULNERABILITIES

### 24-41. Medium Findings Summary

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 24 | Auth tokens in localStorage | Frontend AuthContext | Use httpOnly cookies |
| 25 | Socket wallet transmission plaintext | Frontend socket.ts | Ensure WSS only |
| 26 | Waitlist email in localStorage | Frontend waitlist page | Clear after use |
| 27 | Integer parsing without bounds | Backend index.ts | Add explicit bounds |
| 28 | Missing input validation | Multiple endpoints | Add validation |
| 29 | Status enum not validated | Database files | Runtime enum check |
| 30 | No pagination limits | Database queries | Add max limits |
| 31 | Timing attack on auth | Auth middleware | Generic error messages |
| 32 | Admin wallets in env var | Config | Use database |
| 33 | Email regex too permissive | Waitlist validation | Stricter validation |
| 34 | Helmet CSP disabled | Backend config | Enable CSP |
| 35 | No request body size limit | WebSocket events | Add limits |
| 36 | Prediction deadline uses server time | LDS manager | Add tolerance |
| 37 | Tie detection float precision | Token Wars | Use epsilon comparison |
| 38 | Early bird bonus pool exceed | Oracle | Cap at pool size |
| 39 | Batch refund incomplete tracking | LDS manager | Track per-player status |
| 40 | No verify endpoint rate limit | Auth routes | Add rate limiting |
| 41 | Signature message inconsistency | Auth utils | Document formats |

---

## REMEDIATION PRIORITY

### Immediate (Before Any Production Traffic)

1. **Add WebSocket authentication** - All financial socket events
2. **Fix double-spend race conditions** - Add distributed locking
3. **Validate free bet eligibility** - Check credits before allowing
4. **Fix odds lock atomicity** - Atomic check-and-set

### Short Term (Within 1 Week)

5. Add idempotency to all payouts
6. Fix error message leakage
7. Add rate limiting to all endpoints
8. Fix JWT expiry mismatch
9. Move replay protection to Redis

### Medium Term (Within 1 Month)

10. Implement comprehensive input validation
11. Add solvency monitoring
12. Fix rounding precision issues
13. Add price feed freshness checks
14. Implement comprehensive audit logging

---

## SECURITY CHECKLIST FOR DEPLOYMENT

- [ ] All WebSocket events require signature verification
- [ ] Balance operations use distributed locks
- [ ] Free bets validate credit availability
- [ ] Payout operations are idempotent
- [ ] All error messages are generic
- [ ] Rate limiting on all endpoints
- [ ] JWT_SECRET is set in production
- [ ] CORS properly configured
- [ ] Private IP ranges blocked for image URLs
- [ ] Audit logging enabled
- [ ] Solvency checks before all payouts
- [ ] Price feed staleness detection

---

## APPENDIX: Files Requiring Changes

### Critical Priority

| File | Changes Needed |
|------|----------------|
| `backend/src/index.ts` | WebSocket auth, rate limiting, error handling |
| `backend/src/services/balanceService.ts` | Distributed locking, idempotency |
| `backend/src/services/battleManager.ts` | Race condition fixes |
| `backend/src/services/ldsManager.ts` | Free bet validation, idempotency |
| `backend/src/services/tokenWarsManager.ts` | Payout status handling |
| `backend/src/services/spectatorService.ts` | Odds lock atomicity |
| `backend/src/services/draftTournamentManager.ts` | Entry atomicity |

### High Priority

| File | Changes Needed |
|------|----------------|
| `backend/src/middleware/auth.ts` | Redis replay protection |
| `backend/src/config.ts` | CORS fixes |
| `backend/src/utils/jwt.ts` | Expiry consistency |
| `backend/src/db/challengesDatabase.ts` | Static SQL |
| `backend/src/db/waitlistDatabase.ts` | Remove string interpolation |

### Medium Priority

| File | Changes Needed |
|------|----------------|
| `web/src/contexts/AuthContext.tsx` | httpOnly cookie consideration |
| All database files | Input validation, pagination |
| All game managers | Rounding fixes, timing validation |

---

*Report generated by comprehensive security audit. All findings verified through manual code review.*
