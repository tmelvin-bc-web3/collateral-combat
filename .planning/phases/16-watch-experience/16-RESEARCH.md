# Phase 16: Watch Experience - Research

**Researched:** 2026-01-24
**Domain:** Mobile-first spectating UX, gesture navigation, betting interactions
**Confidence:** HIGH

## Summary

This phase creates a mobile-optimized battle viewing and betting experience with TikTok-style vertical navigation, a thumb-friendly betting strip, and floating chat overlay. The research focuses on gesture handling, mobile UX patterns, and safe area considerations.

The codebase already has substantial foundations:
- `useSwipeNavigation` hook for horizontal swipe gestures
- `QuickBetStrip` component with basic amount selection
- `SpectatorView` with responsive battle viewer
- Safe area inset CSS patterns (`safe-area-inset`, `env(safe-area-inset-bottom)`)
- Touch-manipulation CSS classes throughout

**Primary recommendation:** Extend existing gesture infrastructure with `react-swipeable` for vertical swipe detection, use CSS scroll-snap for battle feed navigation, and modify `QuickBetStrip` to support swipe-to-select-fighter interaction.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-swipeable | ^7.0.2 | Swipe gesture detection | 629+ dependents on npm, maintained by Formidable Labs, minimal footprint, supports all swipe directions |
| CSS scroll-snap | native | Vertical page snapping | Browser-native, no bundle size, smooth performance, used by TikTok web |
| Tailwind CSS | ^3.4.19 | Responsive layouts | Already in project, responsive utilities, thumb-zone patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-simple-pull-to-refresh | ^1.5.0 | Pull-to-refresh gesture | If native CSS scroll-snap doesn't provide good refresh feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-swipeable | @use-gesture/react | More powerful but larger bundle (7KB vs 2KB gzipped), overkill for directional swipes |
| react-swipeable | Custom touch handlers | More control but reinventing wheel, edge cases already solved |
| CSS scroll-snap | react-virtualized | Only needed if 100+ battles in feed causes memory issues |

**Installation:**
```bash
cd web && pnpm add react-swipeable
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/watch/
├── WatchViewer.tsx           # Full-screen battle viewer (portrait-only)
├── BattleFeed.tsx            # Vertical scroll container with snap points
├── BattleSlide.tsx           # Single battle in feed (40% chart / 60% bet area)
├── QuickBetStripV2.tsx       # Swipe-to-bet interaction in thumb zone
├── FloatingChat.tsx          # Twitch-style overlay chat
└── hooks/
    └── useVerticalSwipe.ts   # Vertical swipe navigation hook (wraps react-swipeable)
```

### Pattern 1: CSS Scroll-Snap for TikTok-Style Navigation
**What:** Use native CSS scroll-snap for vertical battle navigation
**When to use:** Always for the vertical feed - it's performant and feels native
**Example:**
```tsx
// BattleFeed.tsx - Container
<div className="h-screen overflow-y-auto snap-y snap-mandatory">
  {battles.map(battle => (
    <BattleSlide key={battle.id} battle={battle} className="h-screen snap-start" />
  ))}
</div>
```

```css
/* Tailwind classes used:
 * snap-y snap-mandatory - vertical snapping, always snap to point
 * h-screen - full viewport height per slide
 * snap-start - snap to top of each battle
 */
```

### Pattern 2: Swipe-to-Bet Interaction
**What:** Swipe direction on preset amounts determines fighter selection
**When to use:** On the QuickBetStrip, swipe left = Fighter 1, swipe right = Fighter 2
**Example:**
```tsx
// QuickBetStripV2.tsx
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => placeBet(selectedAmount, 'fighter1'),
  onSwipedRight: () => placeBet(selectedAmount, 'fighter2'),
  delta: 50, // Minimum swipe distance
  preventScrollOnSwipe: true,
  trackMouse: false, // Touch-only
});

return (
  <div {...handlers} className="fixed bottom-0 left-0 right-0">
    {/* Amount selector row */}
    <div className="flex justify-center gap-2">
      {[0.1, 0.25, 0.5, 1].map(amt => (
        <button
          key={amt}
          onClick={() => setSelectedAmount(amt)}
          className={`px-4 py-2 rounded-lg ${selectedAmount === amt ? 'bg-warning' : 'bg-white/10'}`}
        >
          {amt} SOL
        </button>
      ))}
    </div>
    {/* Visual swipe hint */}
    <div className="text-center text-xs text-white/40 mt-2">
      <span className="text-success">&larr; {fighter1Name}</span>
      {' | Swipe to bet | '}
      <span className="text-danger">{fighter2Name} &rarr;</span>
    </div>
  </div>
);
```

### Pattern 3: Floating Chat Overlay (Twitch-style)
**What:** Recent messages float over content, semi-transparent, positioned to not cover bet buttons
**When to use:** Always visible during battle viewing on mobile
**Example:**
```tsx
// FloatingChat.tsx
export function FloatingChat({ messages, onOpen }: FloatingChatProps) {
  const recentMessages = messages.slice(-5); // Show last 5

  return (
    <div
      className="absolute left-3 bottom-[140px] w-[60%] pointer-events-none"
      // Position above bet area (140px), left side, 60% width
    >
      {recentMessages.map((msg, i) => (
        <div
          key={msg.id}
          className="text-sm text-white/80 bg-black/40 backdrop-blur-sm rounded px-2 py-1 mb-1"
          style={{ opacity: 0.5 + (i / recentMessages.length) * 0.5 }}
          // Older messages more transparent
        >
          <span className="text-warning font-semibold">{msg.sender}:</span> {msg.content}
        </div>
      ))}
      <button
        onClick={onOpen}
        className="pointer-events-auto text-xs text-white/40 hover:text-white"
      >
        Tap to chat
      </button>
    </div>
  );
}
```

### Pattern 4: Two-Tap Bet Confirmation
**What:** First tap selects amount, confirm button appears, second tap places bet
**When to use:** Standard pattern for all betting actions on mobile
**Example:**
```tsx
// State machine: idle -> amount_selected -> confirming -> placing -> success/error
const [betState, setBetState] = useState<'idle' | 'confirming' | 'placing'>('idle');
const [pendingBet, setPendingBet] = useState<{ amount: number; fighter: string } | null>(null);

const handleSwipe = (fighter: string) => {
  setPendingBet({ amount: selectedAmount, fighter });
  setBetState('confirming');
};

const handleConfirm = async () => {
  if (!pendingBet) return;
  setBetState('placing');
  await placeBet(pendingBet);
  setBetState('idle');
  setPendingBet(null);
};

// Render confirm overlay when confirming
{betState === 'confirming' && (
  <div className="absolute inset-x-0 bottom-0 p-4 bg-black/90">
    <p>Bet {pendingBet.amount} SOL on {pendingBet.fighter}?</p>
    <div className="flex gap-2">
      <button onClick={() => setBetState('idle')}>Cancel</button>
      <button onClick={handleConfirm} className="bg-warning">Confirm</button>
    </div>
  </div>
)}
```

### Pattern 5: Pull-to-Refresh with CSS
**What:** Pull down refreshes battle list and current battle data
**When to use:** At top of BattleFeed when user over-scrolls
**Example:**
```tsx
// Using existing touch events pattern from codebase
const [isPulling, setIsPulling] = useState(false);
const [pullDistance, setPullDistance] = useState(0);

const handleTouchMove = (e: TouchEvent) => {
  if (scrollContainer.scrollTop === 0) {
    const delta = e.touches[0].clientY - startY;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
      setIsPulling(true);
    }
  }
};

const handleTouchEnd = () => {
  if (pullDistance > 60) {
    refreshBattles();
  }
  setPullDistance(0);
  setIsPulling(false);
};
```

### Anti-Patterns to Avoid
- **Don't use scroll-snap with smooth-scroll:** Can cause janky behavior. Use `scroll-behavior: auto` for snap containers.
- **Don't block touch events on betting area:** Always use `touch-action: manipulation` for better responsiveness.
- **Don't place interactive elements in top 20% or bottom 20% edges:** iOS Safari has gesture regions there.
- **Don't rely on hover states for mobile:** Project already has `@media (hover: none)` patterns - follow them.
- **Don't make bet buttons smaller than 44px:** Project standard, already enforced via `min-h-[44px]`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vertical swipe detection | Custom touch event handling | react-swipeable | Edge cases (velocity, direction locking, multi-touch) already solved |
| Pull-to-refresh | Custom implementation | react-simple-pull-to-refresh OR CSS overscroll-behavior | Momentum, bounce-back, and loading states are complex |
| Keyboard push-up | Manual viewport calculation | CSS `interactive-widget: resizes-content` + safe-area-inset-bottom | Browser handles it better, especially iOS |
| Battle navigation | React Router for each battle | URL param + scroll position | Keep it SPA-like, don't create navigation entries |
| Safe area padding | Hardcoded pixel values | `env(safe-area-inset-*)` | Device-specific, already used in codebase |

**Key insight:** The project already has patterns for mobile touch interactions (`touch-manipulation`, `min-h-[44px]`, safe-area-inset). Extend these rather than creating new systems.

## Common Pitfalls

### Pitfall 1: Scroll-Snap Fights Pull-to-Refresh
**What goes wrong:** Pull gesture triggers scroll snap instead of refresh
**Why it happens:** Snap points intercept the pull gesture
**How to avoid:** Use `overscroll-behavior: contain` on snap container, detect pull at scroll position 0 only
**Warning signs:** Pull gesture sometimes works, sometimes snaps to previous battle

### Pitfall 2: Keyboard Covers Bet Buttons
**What goes wrong:** Chat keyboard opens and covers the confirm button
**Why it happens:** iOS doesn't automatically push content up for fixed-bottom elements
**How to avoid:** Use `position: sticky` instead of `fixed` for elements that need to stay visible, OR listen to `visualViewport.resize` event and adjust padding
**Warning signs:** Users can't tap confirm after opening chat

### Pitfall 3: Swipe Conflicts with Scroll
**What goes wrong:** Horizontal swipe-to-bet triggers vertical scroll
**Why it happens:** Touch events propagate to scroll container
**How to avoid:** Set `preventScrollOnSwipe: true` in react-swipeable config, use `touch-action: pan-y` on the swipeable element
**Warning signs:** Bet accidentally places when trying to scroll

### Pitfall 4: Safe Area Not Applied on PWA
**What goes wrong:** Content hides behind iPhone notch/home bar in PWA mode
**Why it happens:** Missing `viewport-fit=cover` meta tag
**How to avoid:** Ensure layout.tsx has `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
**Warning signs:** Works in Safari but not when added to home screen

### Pitfall 5: Auto-Advance Races with User Interaction
**What goes wrong:** Battle ends, user is mid-bet, auto-advance changes context
**Why it happens:** Timer-based advance doesn't check interaction state
**How to avoid:** Delay auto-advance if `betState !== 'idle'`, show "Tap to continue" instead
**Warning signs:** User places bet on wrong battle after auto-advance

## Code Examples

Verified patterns from existing codebase and official sources:

### Extending Existing useSwipeNavigation for Vertical
```typescript
// src/hooks/useVerticalSwipe.ts
// Adapting the existing useSwipeNavigation pattern for vertical

import { useSwipeable, SwipeEventData } from 'react-swipeable';

interface UseVerticalSwipeOptions {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useVerticalSwipe({
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}: UseVerticalSwipeOptions) {
  const handlers = useSwipeable({
    onSwipedUp: () => onSwipeUp?.(),
    onSwipedDown: () => onSwipeDown?.(),
    delta: threshold,
    preventScrollOnSwipe: false, // Let scroll handle it normally
    trackMouse: false,
    touchEventOptions: { passive: true },
  });

  return handlers;
}
```

### Full-Screen Battle Viewer Layout (40/60 split)
```tsx
// src/components/watch/BattleSlide.tsx
// Following existing SpectatorView patterns

interface BattleSlideProps {
  battle: LiveBattle;
  onBetPlaced?: () => void;
}

export function BattleSlide({ battle, onBetPlaced }: BattleSlideProps) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Chart Area - 40% */}
      <div className="h-[40vh] relative overflow-hidden">
        <TradingViewChart symbol="SOL" />
        {/* Overlay: fighter names, PnL, time remaining */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-bg-primary to-transparent p-4">
          <SpectatorPnLBar
            fighter1={{ wallet: battle.players[0]?.walletAddress, pnl: battle.players[0]?.account.totalPnlPercent }}
            fighter2={{ wallet: battle.players[1]?.walletAddress, pnl: battle.players[1]?.account.totalPnlPercent }}
          />
        </div>
      </div>

      {/* Betting Area - 60% */}
      <div className="flex-1 relative">
        {/* Fighter cards, odds, stake info */}
        <div className="p-4 space-y-4">
          {/* Battle info content */}
        </div>

        {/* Floating Chat */}
        <FloatingChat messages={messages} onOpen={openChatKeyboard} />

        {/* Quick Bet Strip - fixed to thumb zone */}
        <QuickBetStripV2
          battle={battle}
          onBetPlaced={onBetPlaced}
          className="absolute bottom-0 inset-x-0"
        />
      </div>
    </div>
  );
}
```

### Safe Area Bottom Padding (from existing codebase)
```tsx
// Pattern from BottomNavBar.tsx - already working

<nav
  className="fixed bottom-0 left-0 right-0 z-50"
  style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
>
  {/* Content */}
</nav>

// Alternative CSS class from globals.css
// .safe-area-inset already exists - reuse it
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom touch handlers | react-swipeable hooks | 2023 | Cleaner API, better TypeScript support |
| JavaScript scroll-snap polyfill | Native CSS scroll-snap | 2022 | All major browsers support, no JS needed |
| `position: fixed` + manual keyboard handling | CSS `interactive-widget` | 2024 | Browser handles keyboard resize natively |
| `touchstart`/`touchend` manual | `touch-action` CSS | 2023 | Declarative, more performant |

**Deprecated/outdated:**
- **react-swipeable-views:** Unmaintained since 2020, use CSS scroll-snap instead
- **Hammer.js:** Overkill for simple swipes, larger bundle, use react-swipeable
- **iOS rubber-band scrolling JS hacks:** Use `overscroll-behavior` CSS property instead

## Open Questions

Things that couldn't be fully resolved:

1. **Auto-advance delay timing**
   - What we know: TikTok shows result ~2-3 seconds, YouTube Shorts shows indefinitely
   - What's unclear: Optimal time for betting context (need user testing)
   - Recommendation: Start with 3 seconds + "Tap to continue" option, make configurable

2. **Chat fade timing**
   - What we know: Twitch uses 10-15 second fade on mobile
   - What's unclear: Best timing for battle context where messages are less frequent
   - Recommendation: 8 seconds fade, newer messages more opaque (already in code example)

3. **More battles indicator style**
   - What we know: Could be dots, peek preview, or arrows
   - What's unclear: Which performs better for engagement
   - Recommendation: Start with subtle dots at bottom edge, A/B test later

## Sources

### Primary (HIGH confidence)
- react-swipeable GitHub: https://github.com/FormidableLabs/react-swipeable - API patterns
- CSS-Tricks scroll-snap: https://css-tricks.com/practical-css-scroll-snapping/ - Implementation patterns
- MDN env(): https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env - Safe area insets

### Secondary (MEDIUM confidence)
- Thumb zone research (leaguelane.com): https://leaguelane.com/mobile-betting-games-moved-controls-to-bottom-center-screen/ - Steven Hoober's 49% single-hand grip finding
- Mobile Navigation UX 2026 (designstudiouiux.com): https://www.designstudiouiux.com/blog/mobile-navigation-ux/ - Bottom nav best practices
- Sports Betting App UX (prometteursolutions.com): https://prometteursolutions.com/blog/user-experience-and-interface-in-sports-betting-apps/ - Thumb-friendly patterns

### Tertiary (LOW confidence)
- TikTok-style feed implementations (various GitHub repos) - Implementation approaches vary widely

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - react-swipeable is well-established, CSS scroll-snap is native
- Architecture: HIGH - Extends existing codebase patterns (useSwipeNavigation, QuickBetStrip, safe-area classes)
- Pitfalls: MEDIUM - Based on common mobile UX issues, some may not apply to this specific implementation

**Research date:** 2026-01-24
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
