# Contract Audit: session_betting

**Program ID:** `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`
**Audit Date:** 2026-01-22
**Auditor:** Claude Code (Phase 6 Plan 02)
**Contract:** `programs/session_betting/programs/session_betting/src/lib.rs` (1839 lines)

---

## Round State Machine Analysis

### State Transition Diagram

```
   +---------+
   |  Open   |
   +---------+
        |
        +----> lock_round (authority, after lock_time)
        |           |
        +----> lock_round_fallback (permissionless, after lock_time_fallback)
                    |
                    v
              +---------+
              | Locked  |
              +---------+
                    |
                    +----> settle_round (permissionless, after end_time)
                                |
                                v
                          +-----------+
                          |  Settled  |
                          +-----------+
                                |
                                +----> close_round (authority, after grace_period)
                                            |
                                            v
                                      [Account Closed]
```

### Transition Validation

| From | To | Instruction | Guard | Line |
|------|-----|-------------|-------|------|
| Open | Locked | lock_round | `round.status == RoundStatus::Open` | 141 |
| Open | Locked | lock_round_fallback | `round.status == RoundStatus::Open` | 187 |
| Locked | Settled | settle_round | `round.status == RoundStatus::Locked` | 232 |
| Settled | Closed | close_round | `round.status == RoundStatus::Settled` | 288 |

### Status Assignment Analysis

All locations where `round.status` is modified:

| Line | Instruction | Assignment |
|------|-------------|------------|
| 110 | start_round | `round.status = RoundStatus::Open` |
| 173 | lock_round | `round.status = RoundStatus::Locked` |
| 220 | lock_round_fallback | `round.status = RoundStatus::Locked` |
| 252 | settle_round | `round.status = RoundStatus::Settled` |

### Open Question Resolution

**Question 1: Can any path skip the lock step?**

**Answer: NO**

Evidence:
- `settle_round` is the ONLY instruction that sets `RoundStatus::Settled` (line 252)
- `settle_round` has a guard `require!(round.status == RoundStatus::Locked, ...)` (line 232)
- There is no other instruction that can transition to Settled
- Calling `settle_round` on an Open round returns `RoundNotLocked` error

**Verification complete: No path exists to settle a round without locking first.**

---

**Question 2: Permissionless fallback griefing potential?**

**Answer: LOW RISK**

Evidence:
- Timing constraint: `lock_time_fallback = lock_time + 60 seconds` (line 107)
- Cannot call fallback until 60s after normal lock time (line 192-195)
- Price source: Pyth oracle required (lines 198-211), not user input
- Staleness check enforced: `get_price_no_older_than(current_time, MAX_PRICE_AGE_SECONDS)` (line 210-211)
- Feed ID validated: `price_feed.id.to_bytes() == game_state.price_feed_id` (lines 202-205)
- Price must be positive: `require!(price.price > 0, ...)` (line 214)

**Attack vectors considered:**

| Attack | Mitigated By | Status |
|--------|-------------|--------|
| Lock early with bad price | Timing constraint (60s delay) | PREVENTED |
| Submit arbitrary price | Pyth oracle required | PREVENTED |
| Use stale price | 60s staleness check | PREVENTED |
| Use wrong price feed | Feed ID validation | PREVENTED |

**Conclusion:** Fallback mechanism is secure. Authority has 60-second priority window. Fallback uses same security controls as authority path.

### Lock Timing Analysis

| Constant | Value | Purpose |
|----------|-------|---------|
| ROUND_DURATION_SECONDS | 30 | Total round length |
| LOCK_BUFFER_SECONDS | 5 | Time before end when lock happens |
| FALLBACK_LOCK_DELAY_SECONDS | 60 | Delay for permissionless fallback |

Timeline for a round starting at T=0:
- T+0s: Round starts (Open)
- T+25s: lock_time reached (authority can lock)
- T+30s: end_time reached (settle possible)
- T+85s: lock_time_fallback reached (anyone can lock if still Open)

The 60-second fallback delay ensures:
1. Authority has reasonable time to lock normally
2. Rounds don't get stuck if authority goes offline
3. Permissionless locking still uses oracle price (no manipulation)

---
