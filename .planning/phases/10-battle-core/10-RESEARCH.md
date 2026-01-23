# Phase 10: Battle Core - Research

**Researched:** 2026-01-23
**Domain:** Real-time PvP trading battles with matchmaking, execution, and settlement
**Confidence:** HIGH

## Summary

This phase implements the core battle loop: matchmaking, real-time battle execution, and settlement. The existing codebase has substantial infrastructure that can be extended rather than rebuilt.

**Key finding:** The `battleManager.ts` already implements ~70% of needed functionality including matchmaking queue, ready check system, position management, liquidation mechanics, and winner payout. The main gaps are: (1) ELO-based matching, (2) challenge board system, (3) tug-of-war PnL visualization, (4) liquidation distance indicators, and (5) battle history persistence.

**Primary recommendation:** Extend existing `battleManager.ts` and `challengesDatabase.ts` rather than building new systems. Focus on UI enhancements (tug-of-war bar, liquidation indicators) and adding ELO tracking.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already In Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO | 4.x | Real-time battle updates | Already handling battle_update, price_update events |
| better-sqlite3 | 9.x | Battle history persistence | Consistent with progression, challenge databases |
| uuid | 9.x | Battle/position IDs | Used throughout codebase |
| tweetnacl | 1.x | Signature verification | Replay attack prevention already implemented |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @coral-xyz/anchor | 0.31.1 | On-chain settlement | Used by balanceService for fund locking |
| bs58 | 5.x | Signature encoding | Already in battleManager for signed trades |
| Pyth Network | - | Real-time price feeds | priceService already configured with 1s tick |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLite | PostgreSQL | More complex setup, not needed at current scale |
| Socket.IO | WebSocket raw | Less features, Socket.IO rooms perfect for battles |
| In-memory ELO | Redis | Overkill, SQLite persistence sufficient |

**Installation:**
No new packages needed. All dependencies exist in codebase.

## Architecture Patterns

### Existing Project Structure (Extend This)
```
backend/src/
├── services/
│   ├── battleManager.ts      # EXTEND: Add ELO matching, challenge flow
│   ├── balanceService.ts     # USE: verifyAndLockBalance pattern
│   ├── priceService.ts       # USE: 1s tick for real-time PnL
│   └── progressionService.ts # USE: XP/stats infrastructure
├── db/
│   ├── challengesDatabase.ts # EXTEND: Add open challenges listing
│   └── battleHistoryDatabase.ts # CREATE: Battle logs for profiles

web/src/
├── components/battle/
│   ├── PnLComparisonBar.tsx  # ENHANCE: Tug-of-war visualization
│   ├── BattleHeader.tsx      # ENHANCE: Liquidation indicators
│   └── BattleArena.tsx       # EXTEND: Multi-position display
├── contexts/
│   └── BattleContext.tsx     # USE: Socket event handling exists
```

### Pattern 1: Atomic Balance Lock (ALREADY IMPLEMENTED)
**What:** Lock funds on-chain before battle starts
**When to use:** Any entry fee collection
**Example:**
```typescript
// Source: backend/src/services/battleManager.ts:161
const lockResult = await balanceService.verifyAndLockBalance(
  walletAddress,
  entryFeeLamports,
  'battle',
  battleId
);
// Funds are now in global vault, cannot be withdrawn
```

### Pattern 2: Ready Check System (ALREADY IMPLEMENTED)
**What:** Both players confirm before battle starts
**When to use:** After matchmaking finds opponents
**Example:**
```typescript
// Source: backend/src/services/battleManager.ts:984-1107
// Funds locked for BOTH players BEFORE ready check emits
private async createReadyCheck(player1, player2, config) {
  // Lock player 1 funds
  lockResult1 = await balanceService.verifyAndLockBalance(player1, ...);
  // Lock player 2 funds
  lockResult2 = await balanceService.verifyAndLockBalance(player2, ...);
  // Only then emit match_found
  this.emitReadyCheckEvent('match_found', {...});
}
```

### Pattern 3: Real-time PnL Calculation (ALREADY IMPLEMENTED)
**What:** Calculate PnL using live prices every tick
**When to use:** During active battles
**Example:**
```typescript
// Source: backend/src/services/battleManager.ts:569-599
private updateAccountValue(player: BattlePlayer): void {
  player.account.positions.forEach(position => {
    const currentPrice = priceService.getPrice(position.asset);
    const priceChange = (currentPrice - position.entryPrice) / position.entryPrice;
    const pnlPercent = position.side === 'long' ? priceChange : -priceChange;
    position.unrealizedPnl = position.size * pnlPercent * position.leverage;
    // Check liquidation...
  });
}
```

### Pattern 4: Parimutuel Settlement (USE FROM SPECTATOR)
**What:** Winners split loser pool minus platform fee
**When to use:** Battle settlement (adapted from spectator bets)
**Example:**
```typescript
// Source: backend/src/services/spectatorService.ts:606-616
const platformFeeLamports = Math.floor(losingPool * PLATFORM_FEE_PERCENT / 100);
const distributablePool = losingPool - platformFeeLamports;
// For battle: winner gets entire entry pool minus fee
```

### Anti-Patterns to Avoid
- **Check-then-act:** Never check balance then assume it's still there. Use `verifyAndLockBalance()` atomic pattern.
- **In-memory only:** Battle history MUST be persisted to SQLite for profiles.
- **Blocking matchmaking:** User should be able to browse while in queue (background matching).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Balance verification | Manual RPC calls | `balanceService.verifyAndLockBalance()` | Handles TOCTOU, pending tracking |
| Ready check timeout | Custom timers | Existing `readyCheckTimers` Map | Already handles cancellation, refunds |
| Replay attack prevention | Basic nonce | `usedTradeSignatures` Map + cleanup | Already implemented in battleManager |
| Price feeds | Custom oracle | `priceService` with Pyth primary | 1s tick, CMC fallback, listeners |
| Challenge codes | UUID | `generateChallengeCode()` | Human-readable "FIGHT" + alphanumeric |

**Key insight:** The battleManager.ts is 1325 lines of battle logic. Extend it, don't replace it.

## Common Pitfalls

### Pitfall 1: Matchmaking Queue Memory Leak
**What goes wrong:** Queue entries never removed for disconnected users
**Why it happens:** User closes tab without leaving queue
**How to avoid:** Add socket disconnect handler that calls `leaveMatchmaking()`
**Warning signs:** Queue size grows but battles don't start

### Pitfall 2: Ready Check Refund Race
**What goes wrong:** Both players' funds locked, one declines, refund fails
**Why it happens:** Refund transaction fails or is slow
**How to avoid:** Already solved - see `cancelReadyCheck()` which refunds both in parallel
**Warning signs:** Funds stuck in global vault after cancelled battles

### Pitfall 3: Liquidation During Settlement
**What goes wrong:** Position liquidated at exact moment battle ends
**Why it happens:** Race between liquidation check and battle timer
**How to avoid:** `endBattle()` closes all positions at current price first, then calculates winner
**Warning signs:** Player liquidated but battle shows them winning

### Pitfall 4: ELO Inflation at Launch
**What goes wrong:** All new players have same ELO, unfair matches
**Why it happens:** No skill differentiation initially
**How to avoid:** Use placement matches (MATCH-05: protected queue for first 10 battles)
**Warning signs:** High-skill players stomping beginners

### Pitfall 5: Challenge Code Collision
**What goes wrong:** Two challenges get same code
**Why it happens:** Random generation without collision check
**How to avoid:** Already solved - `generateChallengeCode()` has retry loop with collision check
**Warning signs:** Challenge lookup returns wrong battle

## Code Examples

Verified patterns from the existing codebase:

### ELO Calculation (To Be Added)
```typescript
// Standard ELO formula - to add in battleManager.ts
// Source: Research pattern from ELO-MMR Paper - Stanford
const K_FACTOR_NEW = 32;    // Higher for new players (volatility)
const K_FACTOR_ESTABLISHED = 16;  // Lower for established players

function calculateEloChange(
  winnerElo: number,
  loserElo: number,
  kFactor: number = K_FACTOR_ESTABLISHED
): { winnerGain: number; loserLoss: number } {
  const expectedWin = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const change = Math.round(kFactor * (1 - expectedWin));
  return { winnerGain: change, loserLoss: change };
}
```

### Matchmaking Key with ELO (Enhancement)
```typescript
// Current: backend/src/services/battleManager.ts:848
private getMatchmakingKey(config: BattleConfig): string {
  return `${config.entryFee}-${config.duration}-${config.mode}`;
}

// Enhanced version - add ELO tier
private getMatchmakingKey(config: BattleConfig, eloTier: string): string {
  return `${config.entryFee}-${config.duration}-${config.mode}-${eloTier}`;
}

function getEloTier(elo: number): string {
  if (elo < 1000) return 'bronze';
  if (elo < 1500) return 'silver';
  if (elo < 2000) return 'gold';
  if (elo < 2500) return 'platinum';
  return 'diamond';
}
```

### Liquidation Distance Calculation (Enhancement)
```typescript
// Current liquidation check: backend/src/services/battleManager.ts:585-589
// To add liquidation distance indicator:
function getLiquidationDistance(position: PerpPosition): number {
  const currentPrice = priceService.getPrice(position.asset);
  if (position.side === 'long') {
    // Distance to liquidation for long: (current - liq) / current * 100
    return ((currentPrice - position.liquidationPrice) / currentPrice) * 100;
  } else {
    // Distance to liquidation for short: (liq - current) / current * 100
    return ((position.liquidationPrice - currentPrice) / currentPrice) * 100;
  }
}
// Returns: 5.2 means 5.2% away from liquidation
```

### Open Challenge Listing (Enhancement to challengesDatabase.ts)
```typescript
// To add to backend/src/db/challengesDatabase.ts
export function getOpenChallenges(
  filters?: { minFee?: number; maxFee?: number; eloTier?: string }
): BattleChallenge[] {
  let sql = `
    SELECT * FROM battle_challenges
    WHERE status = 'pending' AND expires_at > ?
  `;
  const params: any[] = [Date.now()];

  if (filters?.minFee) {
    sql += ' AND entry_fee >= ?';
    params.push(filters.minFee);
  }
  if (filters?.maxFee) {
    sql += ' AND entry_fee <= ?';
    params.push(filters.maxFee);
  }

  sql += ' ORDER BY created_at DESC LIMIT 50';

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];
  return rows.map(mapRowToChallenge);
}
```

### Tug-of-War Bar (Frontend Enhancement)
```typescript
// Enhance existing: web/src/components/battle/PnLComparisonBar.tsx
interface TugOfWarBarProps {
  player1Pnl: number;  // e.g., +5.2%
  player2Pnl: number;  // e.g., -3.1%
}

function TugOfWarBar({ player1Pnl, player2Pnl }: TugOfWarBarProps) {
  // Calculate delta - positive means player1 ahead
  const delta = player1Pnl - player2Pnl;
  // Convert to percentage position (50% = tied, 0% = p2 winning, 100% = p1 winning)
  // Clamp delta effect to prevent bar going off screen
  const clampedDelta = Math.max(-20, Math.min(20, delta));
  const barPosition = 50 + (clampedDelta * 2.5); // 20% delta = full swing

  return (
    <div className="relative h-8 bg-gray-800 rounded">
      {/* Danger zones at edges */}
      <div className="absolute left-0 w-[10%] h-full bg-red-500/30" />
      <div className="absolute right-0 w-[10%] h-full bg-green-500/30" />
      {/* Position indicator */}
      <div
        className="absolute top-0 h-full w-2 bg-warning transition-all"
        style={{ left: `${barPosition}%` }}
      />
      {/* Center line */}
      <div className="absolute left-1/2 w-px h-full bg-white/30" />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Check-then-lock | `verifyAndLockBalance` atomic | Phase 7.2 (2026-01-22) | Prevents TOCTOU race conditions |
| On-chain wager per bet | Global vault + off-chain tracking | Phase 8 | Faster, cheaper settlements |
| Simple timestamp nonce | `usedTradeSignatures` Map + cleanup | Already in code | Prevents replay attacks |

**Deprecated/outdated:**
- `hasSufficientBalance()` - Marked deprecated in code, use `verifyAndLockBalance()` instead
- `debitPending()` without lock - Creates race condition, replaced by atomic lock

## Implementation Inventory

What exists vs what needs building:

### Already Implemented (Use Directly)
- [x] Matchmaking queue with key-based grouping
- [x] Ready check system with fund locking
- [x] Position open/close with leverage
- [x] Liquidation detection and handling
- [x] Real-time PnL calculation per tick
- [x] Winner determination at battle end
- [x] On-chain payout via `creditWinnings`
- [x] Challenge code generation
- [x] Challenge acceptance and battle creation
- [x] Replay attack prevention for signed trades

### Needs Enhancement
- [ ] Matchmaking by ELO tier (add to queue key)
- [ ] Open challenges listing (add to challengesDatabase)
- [ ] Protected queue for new players (add battle count check)
- [ ] Tug-of-war PnL bar (enhance PnLComparisonBar)
- [ ] Liquidation distance indicator (add calculation, display)
- [ ] Direct wallet challenge (add target wallet to challenge)

### Needs Implementation
- [ ] ELO tracking database (new table in progressionDatabase or separate)
- [ ] Battle history database (for profile stats)
- [ ] Tie handling at settlement (price unchanged edge case)
- [ ] Background queue notification (toast when matched)

## Open Questions

Things that couldn't be fully resolved:

1. **ELO Reset vs Carry-Over**
   - What we know: Research suggests starting at 1200 ELO is standard
   - What's unclear: Should ELO carry from existing battle history?
   - Recommendation: Start fresh at 1200, backfill from existing battles optional

2. **Multiple Positions - Capital Allocation**
   - What we know: CONTEXT.md says "multiple positions allowed, full close only"
   - What's unclear: Can margin exceed remaining balance across positions?
   - Recommendation: Yes, allow until balance is 0 (consistent with current code)

3. **Liquidation = Zero Capital**
   - What we know: CONTEXT.md says "zero capital = instant loss"
   - What's unclear: Does this mean balance + margin = 0, or just balance = 0?
   - Recommendation: Total account value (balance + margin + unrealized PnL) <= 0 = loss

## Sources

### Primary (HIGH confidence)
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/services/battleManager.ts` - Core battle logic
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/services/balanceService.ts` - Fund locking
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/db/challengesDatabase.ts` - Challenge system
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/types.ts` - Type definitions
- `/Users/taylermelvin/Desktop/sol-battles/.planning/phases/10-battle-core/10-CONTEXT.md` - User decisions

### Secondary (MEDIUM confidence)
- `/Users/taylermelvin/Desktop/sol-battles/.planning/research/TRADING-BATTLE-PATTERNS.md` - Research on battle patterns
- `/Users/taylermelvin/Desktop/sol-battles/.planning/REQUIREMENTS.md` - Requirements mapping

### Tertiary (LOW confidence)
- ELO formula details from training data - verify with Wikipedia if needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase libraries
- Architecture: HIGH - Extending existing patterns
- Pitfalls: HIGH - Derived from existing code analysis
- ELO mechanics: MEDIUM - Standard formula but implementation details TBD

**Research date:** 2026-01-23
**Valid until:** 60 days (stable architecture, minimal external dependencies)
