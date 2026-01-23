# Phase 11: Spectator Experience - Research

**Researched:** 2026-01-23
**Domain:** Real-time spectator viewing and betting UX for live battles
**Confidence:** HIGH

## Summary

This phase transforms the existing spectator system from functional to delightful. The backend infrastructure is complete (`spectatorService.ts`, `spectatorBetDatabase.ts`), the WebSocket events are wired up, and basic UI exists (`SpectatorView.tsx`, `BettingPanel.tsx`). The main work is UX enhancement: tug-of-war visualization (reusing Phase 10's `PnLComparisonBar`), quick bet strip, liquidation indicators, and mobile responsiveness.

**Key finding:** 90% of backend/betting logic is already implemented. `spectatorService.ts` (721 lines) handles parimutuel odds, bet placement, odds locking, and instant settlement via `creditWinnings`. The gaps are purely UI: (1) adapting `PnLComparisonBar` for spectators, (2) quick bet strip component, (3) liquidation distance display, (4) mobile-responsive layout, (5) price chart overlay.

**Primary recommendation:** Extend existing components rather than rebuild. The `PnLComparisonBar` from Phase 10 is the tug-of-war visualization - adapt it for spectator view. Add a new `QuickBetStrip` component following the Oracle page's one-tap pattern. Mobile layout requires responsive rework of `SpectatorView.tsx`.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already In Use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Socket.IO | 4.x | Real-time odds, bet updates | Already emits `odds_update`, `bet_placed`, `spectator_battle_update` |
| better-sqlite3 | 9.x | Bet persistence | `spectator_bets.db` with bets + odds_locks tables |
| TradingView | Widget | Price chart overlay | `TradingViewChart.tsx` already configured |
| Tailwind CSS | 3.x | Responsive design | `sm:`, `md:`, `lg:` breakpoints throughout codebase |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons | Trophy, Skull, ChevronLeft/Right already in `PnLComparisonBar` |
| @solana/wallet-adapter | 1.x | Wallet connection | Required for bet placement |
| framer-motion | 10.x | Animations | Available but not required - CSS animations sufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TradingView embed | Lightweight Charts | Less features, but faster load |
| CSS animations | Framer Motion | Overkill for simple transitions |
| Grid layout | Flexbox | Grid better for complex responsive layouts |

**Installation:**
No new packages needed. All dependencies exist in codebase.

## Architecture Patterns

### Existing Project Structure (Extend This)
```
backend/src/
├── services/
│   └── spectatorService.ts      # COMPLETE: Odds, bets, settlement
├── db/
│   └── spectatorBetDatabase.ts  # COMPLETE: Persistence layer

web/src/
├── app/spectate/
│   └── page.tsx                 # ENHANCE: Add quick bet, mobile layout
├── components/
│   ├── SpectatorView.tsx        # ENHANCE: Add tug-of-war, liquidation
│   ├── BettingPanel.tsx         # ENHANCE: Add quick bet strip
│   ├── battle/
│   │   └── PnLComparisonBar.tsx # REUSE: Adapt for spectator view
│   └── stands/
│       ├── BattleCard.tsx       # HAS: Quick bet buttons (example)
│       └── types.ts             # USE: Fighter, LiveBattleData types
```

### Pattern 1: Tug-of-War from Phase 10 (REUSE)
**What:** Visual bar showing PnL delta between fighters
**When to use:** Spectator battle view header
**Example:**
```typescript
// Source: web/src/components/battle/PnLComparisonBar.tsx
// Already implements:
// - Rope position = 50 + (delta * 2), clamped
// - Danger zones at 20% and 80%
// - Spring animation: cubic-bezier(0.34, 1.56, 0.64, 1)
// - Mobile responsive (sm: breakpoints)

// For spectator, use same component with renamed props:
<PnLComparisonBar
  userPnL={fighter1Pnl}      // Rename to fighter1Pnl in adapted version
  opponentPnL={fighter2Pnl}  // Rename to fighter2Pnl
  userPnLDollar={fighter1PnLDollar}
  opponentPnLDollar={fighter2PnLDollar}
/>
```

### Pattern 2: Quick Bet Strip (NEW - Follow Oracle Pattern)
**What:** One-tap betting anchored at screen bottom
**When to use:** Spectator view on all devices, especially mobile
**Example:**
```typescript
// Inspired by: web/src/app/predict/page.tsx bet button pattern
// And: .planning/research/SPECTATOR-BETTING-UX.md recommendations

interface QuickBetStripProps {
  battle: LiveBattle;
  walletAddress?: string;
  onPlaceBet: (fighter: 'fighter1' | 'fighter2', amount: number) => void;
}

// Layout pattern from research:
// ┌─────────────────────────────────────┐
// │ Quick Bet: [Fighter A] [$50] [BET]  │ ← Fixed at bottom
// └─────────────────────────────────────┘
```

### Pattern 3: Liquidation Distance Display (ENHANCE)
**What:** Visual indicator showing how close each fighter is to liquidation
**When to use:** Alongside position displays in spectator view
**Example:**
```typescript
// Source: backend/src/types.ts:23 - liquidationDistance already on PerpPosition
interface PerpPosition {
  liquidationDistance: number; // Percentage distance to liquidation
}

// Color thresholds from Phase 10.6:
// < 2%: critical (red, pulsing)
// 2-5%: warning (orange)
// 5-10%: caution (yellow)
// > 10%: safe (green)

function getLiquidationColor(distance: number): string {
  if (distance < 2) return 'bg-danger animate-pulse';
  if (distance < 5) return 'bg-warning';
  if (distance < 10) return 'bg-yellow-500';
  return 'bg-success';
}
```

### Pattern 4: Real-time Odds Update (ALREADY IMPLEMENTED)
**What:** WebSocket-driven odds display
**When to use:** BettingPanel and BattleCard components
**Example:**
```typescript
// Source: backend/src/index.ts:3012-3014
spectatorService.subscribe((event, data) => {
  case 'odds_update':
    io.to(`spectate_${data.battleId}`).emit('odds_update', data);
    io.to('live_battles').emit('odds_update', data);
});

// Frontend already handles in BettingPanel.tsx:48
socket.on('odds_update', (newOdds) => {
  if (newOdds.battleId === battle.id) {
    setOdds(newOdds);
  }
});
```

### Pattern 5: Instant Payout Settlement (ALREADY IMPLEMENTED)
**What:** Automatic credit to winner's PDA balance on battle end
**When to use:** No action needed - runs automatically
**Example:**
```typescript
// Source: backend/src/services/spectatorService.ts:665
// Winner payout is automatic via creditWinnings
const tx = await balanceService.creditWinnings(
  bet.bettor,
  totalPayoutLamports,
  'spectator',
  battleId
);
// No claim step required - funds appear in PDA balance immediately
```

### Anti-Patterns to Avoid
- **Rebuilding tug-of-war:** `PnLComparisonBar` already exists with correct formula
- **Separate mobile pages:** Use responsive CSS, not different routes
- **Blocking bet placement:** Use optimistic UI with error rollback
- **Full-page refreshes on odds change:** Flash indicators, not reloads

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tug-of-war bar | New visualization | `PnLComparisonBar.tsx` | Already has formula, animation, danger zones |
| Odds calculation | Manual math | `spectatorService.calculateOdds()` | Parimutuel formula already correct |
| Settlement logic | Custom settlement | `spectatorService.settleBets()` | Handles edge cases, XP, stats |
| Chart overlay | Custom chart | `TradingViewChart.tsx` | Configured with minimal mode |
| Responsive breakpoints | Custom media queries | Tailwind `sm:`, `md:`, `lg:` | Consistent with codebase |
| One-tap bet amounts | Custom presets | Follow `BET_AMOUNTS_SOL` pattern from Oracle | Proven UX |

**Key insight:** The spectator betting backend is complete. This phase is 90% frontend enhancement.

## Common Pitfalls

### Pitfall 1: Odds Display Reflow
**What goes wrong:** Odds update causes layout shift, disrupting user flow
**Why it happens:** Different number widths (1.5x vs 10.00x) cause text reflow
**How to avoid:** Use `tabular-nums` font-variant and fixed-width containers
**Warning signs:** Screen "jumps" when odds update, user loses place

### Pitfall 2: Mobile Bet Strip Blocking Content
**What goes wrong:** Quick bet strip covers live battle view
**Why it happens:** Fixed positioning without proper spacing
**How to avoid:** Add padding-bottom to main content equal to strip height
**Warning signs:** Users can't see fight outcome, complain about blocking

### Pitfall 3: Stale Odds on Slow Networks
**What goes wrong:** User places bet at old odds, gets worse payout
**Why it happens:** WebSocket latency, user taps before UI catches up
**How to avoid:** Auto-accept within 5% (BET-04), show "odds changed" toast
**Warning signs:** User complaints about odds mismatch

### Pitfall 4: Chart Obscuring Battle Data
**What goes wrong:** Price chart takes too much space, hides PnL
**Why it happens:** Chart priority over battle status
**How to avoid:** Chart is secondary - collapsible or overlay, not primary
**Warning signs:** Users don't know who's winning while watching chart

### Pitfall 5: Liquidation Indicator Not Updating
**What goes wrong:** Liquidation distance shows stale values
**Why it happens:** `liquidationDistance` not recalculated on price tick
**How to avoid:** Backend already updates on `updateAccountValue()` - ensure frontend re-renders
**Warning signs:** Fighter shows "safe" but gets liquidated

## Code Examples

Verified patterns from the existing codebase:

### Adapting PnLComparisonBar for Spectators
```typescript
// Current: web/src/components/battle/PnLComparisonBar.tsx
// For participant view (You vs Opponent)

// Spectator adaptation (create SpectatorPnLBar.tsx or add variant prop):
interface SpectatorPnLBarProps {
  fighter1: { pnl: number; pnlDollar: number; name: string };
  fighter2: { pnl: number; pnlDollar: number; name: string };
}

// Reuse existing formula:
const delta = fighter1.pnl - fighter2.pnl;
const clampedDelta = Math.max(-40, Math.min(40, delta * 2));
const ropePosition = 50 + clampedDelta;

// Reuse existing danger zones:
const isFighter1InDanger = ropePosition > 80;
const isFighter2InDanger = ropePosition < 20;
```

### Quick Bet Strip Component
```typescript
// New component: web/src/components/spectate/QuickBetStrip.tsx
// Following pattern from: web/src/components/stands/BattleCard.tsx:113-126

const QUICK_BET_AMOUNTS = [0.1, 0.25, 0.5, 1];

function QuickBetStrip({ battle, onBet, selectedAmount, setSelectedAmount }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur border-t border-white/10 p-3 safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center gap-2">
        {/* Amount presets */}
        <div className="flex gap-1">
          {QUICK_BET_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => setSelectedAmount(amt)}
              className={`px-2 py-1 rounded text-xs font-bold ${
                selectedAmount === amt
                  ? 'bg-warning text-black'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Fighter bet buttons */}
        <button
          onClick={() => onBet('fighter1')}
          className="flex-1 py-2 rounded-lg bg-success/20 text-success font-bold text-sm
                     active:scale-95 transition-transform touch-manipulation"
        >
          {truncate(battle.fighter1.name)} ({battle.odds?.player1.odds.toFixed(2)}x)
        </button>
        <button
          onClick={() => onBet('fighter2')}
          className="flex-1 py-2 rounded-lg bg-danger/20 text-danger font-bold text-sm
                     active:scale-95 transition-transform touch-manipulation"
        >
          {truncate(battle.fighter2.name)} ({battle.odds?.player2.odds.toFixed(2)}x)
        </button>
      </div>
    </div>
  );
}
```

### Liquidation Distance Indicator
```typescript
// Enhance: web/src/components/SpectatorView.tsx position display

function LiquidationIndicator({ distance }: { distance: number }) {
  const color = distance < 2 ? 'bg-danger'
              : distance < 5 ? 'bg-warning'
              : distance < 10 ? 'bg-yellow-500'
              : 'bg-success';

  const critical = distance < 2;

  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color} ${critical ? 'animate-pulse' : ''}`} />
      <span className={`text-xs font-mono ${critical ? 'text-danger font-bold' : 'text-white/60'}`}>
        {distance.toFixed(1)}% to liq
      </span>
    </div>
  );
}
```

### Mobile-Responsive Battle Viewer Layout
```typescript
// Pattern from: web/src/components/stands/BattleCard.tsx
// Mobile-first approach with sm:/md:/lg: breakpoints

// SpectatorView responsive structure:
<div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
  {/* Main battle view - full width on mobile, 2/3 on desktop */}
  <div className="lg:col-span-2 order-1">
    {/* Tug-of-war bar */}
    <SpectatorPnLBar ... />

    {/* Price chart - collapsible on mobile */}
    <div className="hidden sm:block">
      <TradingViewChart symbol="SOL" minimal />
    </div>

    {/* Fighter positions - stacked on mobile, side-by-side on tablet+ */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <FighterPositions fighter={fighter1} />
      <FighterPositions fighter={fighter2} />
    </div>
  </div>

  {/* Betting panel - bottom sheet on mobile, sidebar on desktop */}
  <div className="lg:col-span-1 order-2 lg:order-2">
    <BettingPanel ... />
  </div>
</div>

{/* Quick bet strip - only on mobile, fixed at bottom */}
<div className="lg:hidden">
  <QuickBetStrip ... />
</div>
```

### Pool Visualization (A vs B Split)
```typescript
// Exists in: web/src/components/stands/BattleCard.tsx:92-109
// Reuse this pattern in SpectatorView

<div className="mb-4">
  <div className="flex justify-between text-xs text-white/40 mb-1">
    <span>Spectator Pool</span>
    <span className="text-warning font-semibold">{totalPool.toFixed(2)} SOL</span>
  </div>
  <div className="flex h-6 rounded-md overflow-hidden">
    <div
      className="bg-success flex items-center justify-center text-xs font-bold"
      style={{ width: `${fighter1Percent}%` }}
    >
      {fighter1Percent.toFixed(0)}%
    </div>
    <div
      className="bg-danger flex items-center justify-center text-xs font-bold"
      style={{ width: `${fighter2Percent}%` }}
    >
      {fighter2Percent.toFixed(0)}%
    </div>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate mobile pages | Responsive CSS breakpoints | Standard practice | One codebase, consistent UX |
| Manual odds refresh | WebSocket real-time updates | Already implemented | Sub-second odds updates |
| Claim step for payouts | Instant `creditWinnings` | Phase 7+ | No user action needed |
| Blocking modals for bets | Optimistic UI + toast | Research recommendation | Faster perceived performance |

**Deprecated/outdated:**
- `handlePlaceBetLegacy()` in BettingPanel - Use odds lock flow instead
- Polling for odds - WebSocket events are wired

## Implementation Inventory

What exists vs what needs building:

### Already Implemented (Use Directly)
- [x] `spectatorService.ts` - All betting logic
- [x] `spectatorBetDatabase.ts` - Persistence
- [x] WebSocket events - `odds_update`, `bet_placed`, `spectator_battle_update`
- [x] `BettingPanel.tsx` - Bet placement UI
- [x] `SpectatorView.tsx` - Basic viewer
- [x] `TradingViewChart.tsx` - Chart overlay
- [x] `PnLComparisonBar.tsx` - Tug-of-war visualization
- [x] `BattleCard.tsx` - Pool visualization pattern
- [x] Instant settlement via `creditWinnings`

### Needs Enhancement
- [ ] VIEW-01: `SpectatorView` - Add both fighters' full position display
- [ ] VIEW-02: Adapt `PnLComparisonBar` for spectator (or create variant)
- [ ] VIEW-03: Add liquidation distance indicators to position cards
- [ ] VIEW-04: Add TradingView chart overlay to SpectatorView
- [ ] VIEW-05: Mobile-responsive layout rework of SpectatorView

### Needs Implementation
- [ ] BET-03: `QuickBetStrip` component (new)
- [ ] BET-04: Auto-accept odds changes logic (5% threshold)
- [ ] BET-05: Pool visualization in SpectatorView (pattern exists in BattleCard)

### Already Complete (Verify Only)
- [x] BET-01: Fighter selection in BettingPanel
- [x] BET-02: Live odds in BettingPanel via `odds_update` event
- [x] BET-06: Instant payout via `settleBets()` -> `creditWinnings()`

## Open Questions

Things that couldn't be fully resolved:

1. **Chart Position in Mobile Layout**
   - What we know: Price chart is VIEW-04 requirement
   - What's unclear: Should chart be collapsible, overlay, or hidden on mobile?
   - Recommendation: Collapsible accordion, default closed on mobile

2. **Quick Bet Strip vs Full Betting Panel**
   - What we know: Both exist in mockups
   - What's unclear: Should quick bet strip replace or supplement BettingPanel?
   - Recommendation: Quick bet strip for mobile, full panel for desktop

3. **Auto-Accept Threshold**
   - What we know: BET-04 says <5% auto-accept
   - What's unclear: Should this be configurable by user?
   - Recommendation: Default ON at 5%, no user toggle (keep simple)

## Sources

### Primary (HIGH confidence)
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/services/spectatorService.ts` - Complete betting implementation
- `/Users/taylermelvin/Desktop/sol-battles/backend/src/db/spectatorBetDatabase.ts` - Persistence layer
- `/Users/taylermelvin/Desktop/sol-battles/web/src/components/SpectatorView.tsx` - Existing viewer
- `/Users/taylermelvin/Desktop/sol-battles/web/src/components/BettingPanel.tsx` - Existing betting UI
- `/Users/taylermelvin/Desktop/sol-battles/web/src/components/battle/PnLComparisonBar.tsx` - Tug-of-war bar
- `/Users/taylermelvin/Desktop/sol-battles/.planning/research/SPECTATOR-BETTING-UX.md` - UX research

### Secondary (MEDIUM confidence)
- `/Users/taylermelvin/Desktop/sol-battles/.planning/phases/10-battle-core/10-RESEARCH.md` - Phase 10 context
- `/Users/taylermelvin/Desktop/sol-battles/.planning/phases/10-battle-core/10-CONTEXT.md` - Battle UX decisions

### Tertiary (LOW confidence)
- Mobile responsive patterns from Tailwind training data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Extending existing proven patterns
- Pitfalls: HIGH - Derived from existing code and research doc
- Mobile patterns: MEDIUM - Following Tailwind conventions

**Research date:** 2026-01-23
**Valid until:** 60 days (stable frontend patterns, no external API changes)
