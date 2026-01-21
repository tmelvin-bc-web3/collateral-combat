# Codebase Concerns

**Analysis Date:** 2026-01-21

## Tech Debt

### Silent Error Handling (Critical)

**Issue:** Extensive use of silent error swallowing with `catch (error) { return null; }` patterns throughout the codebase, masking failures and making debugging extremely difficult.

**Files:**
- `backend/src/db/progressionDatabase.ts` - 25+ instances of returning null on error
- `backend/src/db/database.ts` - Silent returns for profile operations
- `backend/src/utils/jwt.ts` - Returns null instead of throwing on auth failures
- `backend/src/db/balanceDatabase.ts` - Silent null returns for balance checks
- Web components - Multiple `catch (err: any) { }` blocks with no fallback

**Impact:**
- Failed database operations appear successful, creating data inconsistencies
- Authentication failures silently accepted instead of rejected
- Debugging becomes nearly impossible - no error context preserved
- Race conditions in settlement can occur when errors are hidden
- Progressive users may think actions succeeded when they failed

**Fix Approach:**
1. Implement structured error handling with specific error types
2. Log all errors with context (wallet, operation, timestamp)
3. Propagate errors to callers instead of silent null returns
4. Use try-catch only where recovery is possible, throw otherwise
5. Add monitoring/alerting for error patterns

---

### Unsafe Type Coercion (High)

**Issue:** Pervasive use of `as any` and `any` types in database layer defeats TypeScript safety.

**Files:**
- `backend/src/db/tokenWarsDatabase.ts` - 10+ instances of `as any`
- `backend/src/types.ts` - Event handlers use `any` payloads
- Web components - Multiple `catch (err: any)` instead of proper error types
- `backend/src/db/database.ts` - Uses `any` for row mapping

**Impact:**
- Removes type safety at critical data boundaries
- Silent type mismatches can cause runtime failures
- Database schema changes go undetected
- Payloads can be malformed without warning

**Fix Approach:**
1. Create proper types for all database row objects
2. Use type guards or zod schemas for external data validation
3. Replace `as any` with proper discriminated unions
4. Use `unknown` as fallback only when necessary

---

### Uncontrolled Console Logging (Medium)

**Issue:** 576+ console statements throughout backend code, creating excessive log noise and potential information leakage in production.

**Files:**
- `backend/src/index.ts` - Signature verification logging with wallet details
- `backend/src/services/battleManager.ts` - Trade signature cleanup logs
- `backend/src/utils/replayCache.ts` - Redis connection/error logs
- All database modules - Operation logging

**Impact:**
- Production logs difficult to parse with excessive noise
- Sensitive wallet addresses logged to console
- No structured logging format for parsing
- Server performance impact from high log volume

**Fix Approach:**
1. Replace `console.*` with structured logger (winston, pino, or similar)
2. Use log levels appropriately (debug vs info vs error)
3. Never log sensitive data (wallet addresses, signatures)
4. Use contextual logging with request IDs for tracing

---

### Missing Database Connection Resilience (Medium)

**Issue:** PostgreSQL database operations assume pool availability without reconnection logic.

**Files:**
- `backend/src/db/progressionDatabase.ts` - Creates Pool but no reconnection on failure
- `backend/src/db/database.ts` - Silent degradation when DATABASE_URL not set
- All database modules - No pool health checks or circuit breaker

**Impact:**
- Single connection failure cascades to all operations
- No automatic recovery if database temporarily unavailable
- Deployments don't validate database connectivity upfront
- Slow memory leaks possible from failed connection attempts

**Fix Approach:**
1. Implement connection pool health checks on startup
2. Add exponential backoff for failed connections
3. Implement circuit breaker pattern for database calls
4. Add readiness checks to startup sequence

---

## Known Bugs

### Signature Replay Protection Race Condition (High Severity)

**Symptoms:** Identical signatures accepted multiple times in rapid succession; same transaction executed twice.

**Files:**
- `backend/src/middleware/auth.ts` - `verifyAuthSignature()` at line 68-73
- `backend/src/utils/replayCache.ts` - `checkAndMarkSignature()` at line 127-151

**Trigger:**
1. User signs transaction at T=0ms
2. Sends request A and request B simultaneously (T=1ms apart)
3. Both requests call `checkAndMarkSignature()`
4. Race condition: both read false, both write true
5. Both requests accepted as valid

**Details:** In-memory cache check-then-set is not atomic. Redis `SETNX` *is* atomic, but fallback is not. If Redis fails, attackers can replay signatures.

**Workaround:**
- Enable Redis in production (`REDIS_URL` env var)
- Avoid sending simultaneous requests with same signature
- Reduce signature TTL to 300ms (currently 5 minutes)

**Permanent Fix:** Use Redis as primary store with no fallback, or implement distributed locking.

---

### Database Connection Returns Null Instead of Throwing (High Impact)

**Symptoms:**
- User deposits appear to succeed but funds not recorded
- Progression data lost without notification
- Wagers placed on supposedly zero balance

**Files:**
- `backend/src/db/database.ts` - `getProfile()` returns null on error (line 115)
- `backend/src/db/progressionDatabase.ts` - All functions return null/[] on error
- `backend/src/db/balanceDatabase.ts` - Silent null returns

**Trigger:** Network interruption to PostgreSQL during game round settlement.

**Impact:**
- Data inconsistency between blockchain and backend
- User funds trapped in vault with no record
- No audit trail of what failed

**Workaround:**
- Check endpoint health before critical operations
- Verify database connection in startup sequence
- Use transaction logs for reconciliation

---

### Free Bet Escrow Accumulation (Medium)

**Symptoms:** Free bets assigned but never consumed; unclaimed winnings pile up in escrow.

**Files:**
- `backend/src/services/freeBetEscrowService.ts` - No cleanup for expired bets
- `backend/src/db/progressionDatabase.ts` - Free bet credits never expire

**Trigger:** Users earn free bets at level milestones but don't play for extended period.

**Impact:**
- Platform liability grows unbounded
- Escrow account balance inflates
- No audit of unclaimed vs earned

**Fix Approach:**
1. Implement 30-day expiration for free bets
2. Add cleanup job to reclaim expired balances
3. Store expiration timestamp on grant

---

## Security Considerations

### Wallet Address Logging (Medium Risk)

**Risk:** Wallet addresses logged to console, exposing user activity patterns in production logs.

**Files:**
- `backend/src/index.ts` - Line 71, 88 logs wallets on signature replay
- `backend/src/middleware/auth.ts` - Logs wallet addresses on auth failures
- `backend/src/services/battleManager.ts` - Trade signatures logged with context

**Current Mitigation:** Only in development (supposedly).

**Recommendations:**
1. Never log wallet addresses in production
2. Use wallet ID hash instead of raw address
3. Rotate logs to secure storage
4. Add audit trail separate from application logs

---

### Redis Connection Unencrypted (Medium Risk)

**Risk:** REDIS_URL environment variable likely unencrypted; connection credentials exposed.

**Files:**
- `backend/src/utils/replayCache.ts` - Line 33 creates Redis client from env var

**Current Mitigation:** None.

**Recommendations:**
1. Use encrypted env var storage (Vault, AWS Secrets Manager)
2. Implement TLS for Redis connection (redis://)
3. Rotate credentials quarterly
4. Monitor Redis access logs

---

### In-Memory Signature Cache No Size Limit (Low-Medium Risk)

**Risk:** Memory usage unbounded if cleanup interval fails; DDoS vector.

**Files:**
- `backend/src/index.ts` - Line 54, `usedSignatures` Map has no max size
- `backend/src/utils/replayCache.ts` - Line 22, `memoryCache` has no limit

**Trigger:** Attacker sends 1M unique invalid signatures → memory grows to GB+ → OOM.

**Current Mitigation:** Cleanup interval every 60 seconds.

**Recommendations:**
1. Implement max cache size (e.g., 100k entries)
2. Use LRU eviction when limit reached
3. Add cache size monitoring alert

---

### Missing Input Validation on Wallet Addresses (Low-Medium Risk)

**Risk:** Invalid wallet addresses accepted; potential for address confusion attacks.

**Files:**
- `backend/src/middleware/auth.ts` - `isValidSolanaAddress()` at line 35-43
- `web/src/contexts/AuthContext.tsx` - No validation before API calls

**Current Check:**
```typescript
if (!address || address.length < 32 || address.length > 44) return false;
const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
return base58Regex.test(address);
```

**Gap:** Accepts any 32-44 char base58 string; doesn't verify against Solana network.

**Recommendations:**
1. Use `new PublicKey()` constructor for validation (throws on invalid)
2. Validate address is not system account (11111...)
3. Check against known bad addresses (PDAs shouldn't be user wallets)

---

## Performance Bottlenecks

### Synchronous Database Operations During Round Settlement (Critical)

**Problem:** `progressionDatabase.ts` performs synchronous writes during game round settlement, blocking WebSocket event loop.

**Files:**
- `backend/src/db/progressionDatabase.ts` - All operations are synchronous
- `backend/src/services/battleManager.ts` - Calls progressionDb during settlement

**Cause:** Better-sqlite3 is synchronous (no async version).

**Current Capacity:**
- ~1000 users per second before blocking
- Each settlement writes XP + progression + cosmetics = 3 DB queries
- 30-second round with 1000 concurrent users = 300ms blocking

**Scaling Path:**
1. Migrate to async-sqlite or better SQLite wrapper
2. Batch writes into single transaction
3. Queue writes to background worker
4. Implement read-replica for queries

---

### Pyth Price Feed Network Latency (Medium)

**Problem:** Hermes price feed has variable latency (50-500ms); blocking settlement.

**Files:**
- `backend/src/services/priceService.ts` - Fetches from `hermes.pyth.network/v2/updates`

**Current Behavior:**
- Waits for Pyth response synchronously
- Falls back to CMC on timeout (1 second)
- No caching of prices between fetches

**Improvement Path:**
1. Pre-fetch prices 5 seconds before round end
2. Use last known valid price if fetch fails
3. Cache Pyth response for 1 second across requests

---

### Battle P&L Recalculation on Every Update (Medium)

**Problem:** Full position recalculation happens on every price tick and position change.

**Files:**
- `backend/src/services/battleManager.ts` - `calculatePlayerPnl()` called per update

**Current Load:**
- 1000 battles × 2 players × 10 positions × 1 sec ticks = 20k calculations/sec
- Each calculation: fetch price, apply leverage, sum positions

**Fix:** Cache P&L deltas, update incrementally instead of recalculating.

---

### Draft Tournament Leaderboard Calculation O(n²) (Medium)

**Problem:** Leaderboard re-sorts all entries on each new portfolio price.

**Files:**
- `backend/src/services/draftTournamentManager.ts` - Presumably scores all entries

**Current Load:**
- 1000 players × 1000 ticks/week = 1M sorts
- Each sort recalculates all 6 coin performances

**Fix:** Use heap or segment tree for incremental ranking updates.

---

## Fragile Areas

### WebSocket Connection State Management (Fragile)

**Files:**
- `backend/src/index.ts` - Socket event handlers (1000+ lines)
- `web/src/lib/socket.ts` - Client-side socket singleton

**Why Fragile:**
- No connection state machine; handlers assume `socket.id` stable
- Reconnection loses battle context silently
- Race conditions between disconnect and new battle start
- No heartbeat or connection verification

**Safe Modification:**
1. Add `'use client'` pragma and connection state enum
2. Implement exponential backoff reconnection (100ms → 30s)
3. Queue game actions during disconnection
4. Verify socket state before critical operations

**Test Coverage Gaps:**
- No tests for network reconnection
- No tests for simultaneous battles during disconnect
- No tests for duplicate connection headers

---

### In-Memory Matchmaking Queue (Fragile)

**Files:**
- `backend/src/services/battleManager.ts` - Lines 51-52, `matchmakingQueue` Map

**Why Fragile:**
- Only persists in-memory; lost on server restart
- No overflow handling for 10k+ waiting players
- No timeout for stale queue entries
- Players think they're queued but aren't after crash

**Safe Modification:**
1. Back queue with Redis for persistence
2. Add TTL to queue entries (10 minutes)
3. Implement max queue size with rejection
4. Log queue size metrics every minute

**Test Coverage Gaps:**
- No test for 10k+ queue entries
- No test for queue corruption on crash

---

### PDA Balance Verification Gap (Critical)

**Files:**
- `backend/src/services/balanceService.ts` - Checks balance but doesn't lock funds
- `backend/src/services/battleManager.ts` - Creates battle without on-chain transfer

**Why Fragile:**
- Balance checked at start of round but funds not locked
- User can withdraw during battle without repercussion
- Double-spending possible: place bet, withdraw, withdraw again
- No atomic operation between balance check and fund lock

**Safe Modification:**
1. Move balance check to smart contract validation
2. Implement on-chain fund locking on bet placement
3. Add fail-safe: reject bet if balance < amount after checking
4. Implement escrow vault for all active wagers

**Test Coverage Gaps:**
- No test for withdraw-during-battle scenario
- No test for multiple simultaneous bets exceeding balance

---

### Off-Chain Oracle Price Data Without Blockchain Anchor (Medium Risk)

**Files:**
- `backend/src/services/predictionService.ts` - Uses CMC/Pyth prices not stored on-chain
- `web/src/app/predict/page.tsx` - Trusts backend price data

**Why Fragile:**
- Prices only in backend memory; no audit trail
- User disputes can't be verified against chain
- Backend can modify prices after-the-fact without detection
- No cryptographic proof of price at settlement time

**Safe Modification:**
1. Store start and end prices in `PredictionRound` account on-chain
2. Use Pyth price feed as immutable reference
3. Allow users to claim winnings with price proof
4. Implement appeal mechanism for disputed rounds

---

## Scaling Limits

### PostgreSQL Connection Pool Exhaustion

**Current Capacity:** Default pool = 10 connections

**Limit:** At 1000 concurrent users with 1 connection per user during settlement, all 10 connections exhausted.

**Scaling Path:**
1. Increase pool size to 50 (adjust per benchmark)
2. Implement connection pooling proxy (PgBouncer)
3. Monitor connection usage; alert at 80%
4. Use read replicas for non-write queries

---

### WebSocket Memory Per Connection

**Current Usage:** ~5MB per active socket (event buffers, context data)

**Limit:** 1000 concurrent users = 5GB RAM

**Scaling Path:**
1. Implement connection pooling with shared state
2. Use Redis for distributed state instead of in-memory
3. Implement graceful degradation: disconnect lowest-level users
4. Add memory monitoring with alerts

---

### Smart Contract Instruction Size

**Current:** Oracle round settlement requires 3-4 instructions (start, lock, settle)

**Limit:** 1M compute units per transaction; ~20 accounts per instruction

**At Scale (10k rounds/day):**
- 100k accounts created × rent cost = 300 SOL/month
- Grace period cleanup becomes expensive

**Scaling Path:**
1. Batch multiple round closures per transaction
2. Implement rent-payer subsidy program
3. Archive old rounds to off-chain storage

---

## Dependencies at Risk

### @coral-xyz/anchor 0.32.1 (Medium Risk)

**Risk:** Anchor version locked to specific compiler; breaking changes in Solana CLI cause issues.

**Impact:** Can't upgrade Solana CLI without recompiling all programs.

**Migration Plan:**
1. Track Anchor releases monthly
2. Test upgrade in staging before production
3. Keep 2 versions supported if possible

---

### better-sqlite3 v12.5.0 (Medium Risk)

**Risk:** Native module; breaks on Node.js major version upgrades or libc changes.

**Impact:** Docker image rebuild required for Node.js upgrades.

**Migration Plan:**
1. Migrate to sql.js (pure JavaScript) or async-sqlite
2. Benchmark performance impact
3. Implement in staging first

---

### Pyth Network API Dependency (High Risk)

**Risk:** Single external dependency for price feeds; if down, all prediction rounds fail.

**Impact:** $0 revenue during outage; users can't place bets.

**Mitigation:** CMC fallback available but lower quality.

**Scaling Path:**
1. Cache prices locally for 5 seconds
2. Add multiple fallback oracle sources
3. Implement price staleness detection
4. Use exponential moving average for missing data

---

## Missing Critical Features

### Audit Trail for Financial Transactions

**Problem:** No immutable log of who won what and when.

**Blocks:**
- Dispute resolution
- Tax reporting
- Regulatory compliance
- Fraud detection

**Implementation Path:**
1. Create immutable event log table
2. Log all settlement events with signatures
3. Hash chain events for tamper detection
4. Archive to cold storage quarterly

---

### User KYC/AML Checks

**Problem:** No identity verification; can't operate on mainnet.

**Blocks:**
- Mainnet deployment
- High-value transactions
- Regulatory compliance

**Implementation Path:**
1. Integrate Veriff or similar KYC provider
2. Store verification status in database
3. Gate high-value features on verification
4. Implement sanctions list checks

---

### Multi-Signature Authority

**Problem:** Single authority wallet can drain all funds.

**Blocks:**
- Mainnet deployment
- Institutional deposits
- Regulatory approval

**Implementation Path:**
1. Deploy 3-of-5 multisig on Program upgrade authority
2. Require 2 admins to sign fund transfers
3. Implement timelock for sensitive operations (24h delay)
4. Add multisig to smart contract

---

## Test Coverage Gaps

### WebSocket Reconnection Under Load (Critical Gap)

**What's Not Tested:**
- 1000 simultaneous socket disconnects/reconnects
- Battles continuing while socket reconnecting
- Race condition: user places bet → disconnect → reconnect → bet duplicate

**Files:**
- `backend/src/index.ts` - Socket event handlers
- `web/src/lib/socket.ts` - Reconnection logic

**Risk:** High - manifests only under production load.

**Priority:** HIGH

---

### Database Failure Scenarios (Critical Gap)

**What's Not Tested:**
- PostgreSQL down for 5 minutes → recovery
- Connection pool exhaustion
- Corrupt row data (invalid JSON in field)
- Transaction deadlock between writes

**Files:**
- All `backend/src/db/*.ts` modules

**Risk:** High - causes data loss.

**Priority:** HIGH

---

### Signature Verification Edge Cases (High Gap)

**What's Not Tested:**
- Invalid base58 signatures
- Signatures with padding characters
- Signatures from different message format
- Timestamp bounds (future, ancient)

**Files:**
- `backend/src/middleware/auth.ts`
- `backend/src/utils/signatureVerification.ts`

**Risk:** Medium - security bypass.

**Priority:** HIGH

---

### Fund Locking Race Condition (High Gap)

**What's Not Tested:**
- User bets 1 SOL → balance check passes → user withdraws 0.5 SOL → bet settled at 1 SOL (insufficient funds)
- Multiple bets simultaneously with overlapping funds
- Partial fund locks on partial transaction failure

**Files:**
- `backend/src/services/battleManager.ts`
- `backend/src/services/balanceService.ts`

**Risk:** High - double-spending.

**Priority:** HIGH

---

*Concerns audit: 2026-01-21*
