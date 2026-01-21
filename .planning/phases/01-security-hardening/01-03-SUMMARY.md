---
phase: 01-security-hardening
plan: 03
subsystem: auth
tags: [typescript, redis, security, replay-protection, authentication, middleware]

# Dependency graph
requires:
  - phase: 01-01
    provides: Error type hierarchy (AuthError, AuthErrorCode)
provides:
  - Atomic signature replay protection using Redis SET NX EX
  - Memory fallback with lockSet for atomic check-and-set
  - Cache size limit (100k) with LRU-ish eviction for DDoS protection
  - Structured security event logging (JSON format)
  - Unique signature-based cache keys (auth:sig:{signature})
affects: [all-auth-endpoints, 01-05-error-handling, 01-06-logging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic Redis operations with SET NX EX (single command)"
    - "Synchronous lock mechanism for memory fallback atomicity"
    - "Cache size limits with eviction for DDoS protection"
    - "Signature-based cache keys for unique replay detection"
    - "Structured JSON logging for security events"

key-files:
  created: []
  modified:
    - backend/src/utils/replayCache.ts
    - backend/src/middleware/auth.ts

key-decisions:
  - "Use SET with NX and EX options for atomic Redis operations (prevents TOCTOU race)"
  - "Use lockSet for memory fallback atomicity (JavaScript single-threaded = synchronous check-and-set is atomic)"
  - "Cache size limit of 100k entries with 10% LRU-ish eviction (prevents memory exhaustion attacks)"
  - "Use full signature as cache key instead of wallet:timestamp (each signature is unique per signing)"
  - "Structured JSON logging for security events (foundation for Plan 01-06 logging infrastructure)"

patterns-established:
  - "Atomic cache operations pattern: Redis SET NX EX or memory lockSet for check-and-mark"
  - "DDoS protection pattern: Cache size limits with eviction strategy"
  - "Security logging pattern: Structured JSON with level, type, event, context, timestamp"
  - "Signature cache key pattern: auth:sig:{signature} for uniqueness"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 01 Plan 03: Signature Replay Protection Summary

**Atomic signature replay protection using Redis SET NX EX and memory lockSet, eliminating TOCTOU race conditions in auth middleware**

## Performance

- **Duration:** 3 minutes
- **Started:** 2026-01-21T21:27:14Z
- **Completed:** 2026-01-21T21:30:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed TOCTOU race condition in Redis path by using atomic SET with NX and EX options
- Fixed TOCTOU race condition in memory fallback by implementing synchronous lockSet mechanism
- Added cache size limit (100k entries) with LRU-ish eviction to prevent memory exhaustion attacks
- Enhanced auth middleware to use unique signature-based cache keys
- Implemented structured JSON logging for security events (foundation for Plan 01-06)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix atomic signature caching in replayCache.ts** - `14fa8a2` (fix)
   - Redis: Use SET with NX and EX options (single atomic operation)
   - Memory: Add lockSet for synchronous atomic check-and-set
   - Memory: Add cache size limit (100k entries) for DDoS protection
   - Memory: LRU-ish eviction when limit reached (delete oldest 10%)

2. **Task 2: Enhance auth middleware with signature protection** - `f031315` (feat)
   - Use full signature as cache key (auth:sig:{signature})
   - Add structured logging for security events
   - Add TODO for rate limiting (not implemented yet)
   - Import error utilities from Plan 01-01

## Files Created/Modified

- `backend/src/utils/replayCache.ts` - Atomic signature replay cache with Redis and memory fallback
- `backend/src/middleware/auth.ts` - Enhanced authentication middleware with signature replay protection

## Decisions Made

**1. Atomic Redis operations with SET NX EX**
- **Rationale:** Previous implementation used SETNX followed by EXPIRE (two separate operations), creating a race window where key could exist without TTL
- **Pattern:** `await redisClient.set(key, '1', { NX: true, EX: ttlSeconds })`
- **Benefit:** Single atomic operation eliminates TOCTOU vulnerability

**2. Synchronous lockSet for memory fallback**
- **Rationale:** JavaScript is single-threaded, so synchronous check-and-set within one tick is atomic. Async operations between check and set create race window.
- **Pattern:** Check lockSet → check memoryCache → add to lockSet → add to memoryCache → release lock via setImmediate
- **Benefit:** Provides atomicity without Redis, handles Redis unavailability gracefully

**3. Cache size limit with eviction**
- **Rationale:** Unbounded cache growth enables memory exhaustion DoS attacks
- **Implementation:** 100k entry limit, evict oldest 10% when limit reached
- **Trade-off:** LRU-ish (not true LRU) but sufficient for security purpose, avoids overhead of tracking access times

**4. Signature-based cache keys**
- **Rationale:** Each signature is unique per signing (even for same message), so using signature alone is sufficient for replay protection
- **Previous:** `auth:${walletAddress}:${signature}` (redundant wallet in key)
- **Now:** `auth:sig:${signature}` (cleaner, more specific)
- **Benefit:** Simpler key structure, explicit about what's being cached

**5. Structured JSON logging**
- **Rationale:** Foundation for Plan 01-06 structured logging infrastructure
- **Format:** `{ level, type, event, wallet (truncated), timestamp }`
- **Benefit:** Machine-readable, searchable, privacy-aware (wallet truncation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks executed smoothly without problems.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next plans:**
- Signature replay protection complete for 01-04 (Atomic PDA balance verification)
- Error handling integrated with 01-01 infrastructure
- Security logging pattern established for 01-06 (Structured logging infrastructure)
- Auth middleware hardened for production use

**Blockers:** None

**Concerns:** None - atomic operations verified, race conditions eliminated

---
*Phase: 01-security-hardening*
*Completed: 2026-01-21*
