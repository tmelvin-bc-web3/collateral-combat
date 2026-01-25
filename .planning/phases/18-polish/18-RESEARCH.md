# Phase 18: Polish - Research

**Researched:** 2026-01-25
**Domain:** React UI/UX animations, micro-interactions, optimistic UI patterns
**Confidence:** HIGH

## Summary

Phase 18 focuses on implementing polish features that provide clear feedback for betting outcomes, smooth micro-interactions, and sub-500ms live data updates. The implementation will leverage existing project infrastructure (Next.js 16, React 19, Tailwind CSS, react-swipeable, Confetti.tsx) while adding minimal new dependencies for specific animation needs.

The standard approach for 2026 is to use CSS transforms for button press animations (GPU-accelerated, 60fps guaranteed), React's built-in `useOptimistic` hook for optimistic UI updates, and lightweight libraries like react-countup or custom implementations for number animations. Toast notifications are best handled by Sonner (the modern standard adopted by shadcn/ui), and haptic feedback can be implemented with the Web Vibration API where supported.

Key insights from the research:
- **GPU-accelerated animations**: Use `transform` and `opacity` exclusively for 60fps performance
- **Optimistic UI**: React 19's `useOptimistic` hook is now the standard pattern
- **Micro-interactions**: 200-500ms duration is ideal for responsiveness without disruption
- **Skeleton screens**: Better UX than spinners for loading states
- **Haptic feedback**: Limited browser support (not Safari), use as progressive enhancement

**Primary recommendation:** Implement all animations using CSS transforms and Tailwind utilities, leverage React 19's `useOptimistic` for balance updates, and use minimal JavaScript libraries only where necessary (number counting, toasts).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | UI framework | Already in project, `useOptimistic` hook built-in |
| Tailwind CSS | 3.4.19 | Styling + animations | Already in project, GPU-accelerated utilities |
| tailwindcss-animate | 1.0.7 | Animation utilities | Already in project, extends Tailwind with animation classes |
| react-swipeable | 7.0.2 | Gesture detection | Already in project for swipe interactions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | latest | Toast notifications | Modern, lightweight toast library (adopted by shadcn/ui) |
| react-countup | 6.5+ | Number counting animations | Smooth number transitions with easing |
| number-flow | latest | Advanced number animations | Continuous number flow with in-between values (optional) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner | react-hot-toast | Similar features but less modern API |
| sonner | react-toastify | More features but heavier bundle size |
| react-countup | Custom implementation | Full control but more code to maintain |
| CSS animations | Motion/Framer Motion | More features but 45kb+ bundle size, overkill for simple transforms |

**Installation:**
```bash
cd web
pnpm add sonner react-countup
```

## Architecture Patterns

### Recommended Component Structure
```
web/src/components/
├── feedback/                # Win/loss feedback components
│   ├── WinModal.tsx        # Celebration modal with confetti
│   ├── LossFlash.tsx       # Subtle loss indicator
│   └── PayoutBreakdown.tsx # Expandable payout details
├── animations/             # Reusable animation components
│   ├── CountingNumber.tsx  # Animated number component
│   └── DeltaBadge.tsx      # +/- change indicator
└── ui/                     # Existing UI components
    └── button.tsx          # Enhanced with press animations
```

### Pattern 1: GPU-Accelerated Button Press

**What:** Use CSS `transform: scale()` for button press animations
**When to use:** All interactive buttons (bet buttons, confirm, cancel)
**Example:**
```tsx
// Use Tailwind utilities (GPU-accelerated)
<button className="
  active:scale-95
  transition-transform
  duration-150
  ease-out
">
  Bet
</button>

// Or with custom class
// tailwind.config.ts
keyframes: {
  buttonPress: {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(0.95)' },
    '100%': { transform: 'scale(1)' },
  }
}
```
**Source:** [CSS Transforms for Smooth Animations](https://openclassrooms.com/en/courses/5625816-create-modern-css-animations/5973616-use-the-transform-css-property-to-ensure-smooth-animations)

### Pattern 2: Optimistic UI with useOptimistic

**What:** Update UI immediately before server confirmation
**When to use:** Balance updates, bet placement confirmation
**Example:**
```tsx
// Source: https://react.dev/reference/react/useOptimistic
import { useOptimistic } from 'react';

function BalanceDisplay({ serverBalance }: { serverBalance: number }) {
  const [optimisticBalance, setOptimisticBalance] = useOptimistic(
    serverBalance,
    (currentBalance, delta: number) => currentBalance + delta
  );

  async function handleBet(amount: number) {
    // Update UI immediately
    setOptimisticBalance(-amount);

    // Send to server
    await placeBet(amount);
    // React auto-reverts to serverBalance on next render
  }

  return (
    <div>
      <span>{optimisticBalance.toFixed(2)} SOL</span>
      {optimisticBalance !== serverBalance && (
        <DeltaBadge delta={optimisticBalance - serverBalance} />
      )}
    </div>
  );
}
```
**Source:** [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic)

### Pattern 3: Number Counting Animation

**What:** Animate number changes from old to new value
**When to use:** Balance updates, payout displays, odds changes
**Example:**
```tsx
import CountUp from 'react-countup';

function AnimatedBalance({ value }: { value: number }) {
  return (
    <CountUp
      start={0}
      end={value}
      duration={0.5}
      decimals={2}
      separator=","
      prefix=""
      suffix=" SOL"
    />
  );
}
```
**Source:** [react-countup npm](https://www.npmjs.com/package/react-countup)

### Pattern 4: Toast Notifications with Sonner

**What:** Non-intrusive notifications for wins/losses
**When to use:** Quick feedback that doesn't block navigation
**Example:**
```tsx
import { toast } from 'sonner';

// Win notification
toast.success('You won!', {
  description: '+0.45 SOL',
  duration: 3000,
});

// Loss notification (quiet)
toast.error('Better luck next time', {
  duration: 2000,
  style: { opacity: 0.9 },
});
```
**Source:** [Sonner - Top React Notification Libraries](https://knock.app/blog/the-top-notification-libraries-for-react)

### Pattern 5: Skeleton Loading States

**What:** Show content placeholders during data loading
**When to use:** Battle feed, odds updates, any async data
**Example:**
```tsx
function BattleCard({ battle }: { battle?: LiveBattle }) {
  if (!battle) {
    return (
      <div className="space-y-2">
        <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  return <div>{/* actual content */}</div>;
}
```
**Source:** [Best Practices for Loading States in Next.js](https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs)

### Pattern 6: Progressive Timer Urgency

**What:** Change timer color/animation as deadline approaches
**When to use:** Battle countdown, bet window countdown
**Example:**
```tsx
function UrgentTimer({ secondsLeft }: { secondsLeft: number }) {
  const colorClass =
    secondsLeft > 60 ? 'text-text-primary' :
    secondsLeft > 30 ? 'text-warning' :
    'text-danger';

  const shouldPulse = secondsLeft <= 10;

  return (
    <div className={cn(
      colorClass,
      shouldPulse && 'animate-pulse'
    )}>
      {formatTime(secondsLeft)}
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Heavy animation libraries for simple effects:** Don't add Motion/Framer Motion (45kb+) just for scale transforms. Use CSS.
- **Animating non-GPU properties:** Never animate `width`, `height`, `left`, `top` - causes layout thrashing. Use `transform` and `opacity` only.
- **Long animation durations:** Keep micro-interactions under 500ms. Longer feels sluggish.
- **Missing reduced-motion support:** Always respect `prefers-reduced-motion` for accessibility.
- **Vibration without user interaction:** Vibration API requires user activation, will fail silently otherwise.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number counting animation | Custom requestAnimationFrame loop | react-countup | Handles easing, decimals, formatting, locale |
| Toast notifications | Custom positioned divs + timers | sonner | Stack management, animations, accessibility built-in |
| Optimistic updates | Manual state tracking + rollback | React's useOptimistic | Auto-reverts on next render, simpler API |
| Skeleton screens | Custom loading placeholders | Tailwind pulse utility | One line: `animate-pulse`, works everywhere |
| Haptic feedback | Custom mobile detection | Vibration API | Browser-native, progressive enhancement |

**Key insight:** Modern React (v19) and Tailwind CSS (v3) provide 80% of polish features out of the box. Only add libraries for complex number animations and toast notifications.

## Common Pitfalls

### Pitfall 1: Animation Performance Regression

**What goes wrong:** Animating properties that trigger layout/paint causes janky 30fps animations instead of smooth 60fps.

**Why it happens:** Not all CSS properties are GPU-accelerated. Properties like `width`, `height`, `margin`, `padding`, `left`, `top` force browser to recalculate layout.

**How to avoid:**
- Only animate `transform` and `opacity` for micro-interactions
- Use `will-change: transform` sparingly (only during animation)
- Test on low-end mobile devices
- Use Chrome DevTools Performance tab to detect jank

**Warning signs:**
- Animations feel choppy on mobile
- CPU usage spikes during animations
- DevTools shows purple "Layout" bars during animation

**Source:** [Animation Performance Guide - Motion](https://motion.dev/docs/performance)

### Pitfall 2: Optimistic UI Not Reverting on Error

**What goes wrong:** User sees updated balance, but server rejects the bet. UI stays in optimistic state instead of reverting.

**Why it happens:** Not properly handling server errors or forgetting to re-fetch server state after failed mutation.

**How to avoid:**
- Use `useOptimistic` which auto-reverts on next server render
- Or manually revert state in error handler
- Show error toast when optimistic update fails
- Re-fetch server balance after any mutation

**Warning signs:**
- User balance shows incorrect value after failed bet
- UI doesn't match server state after errors
- Refresh is required to see correct balance

**Source:** [useOptimistic - React Docs](https://react.dev/reference/react/useOptimistic)

### Pitfall 3: Vibration API Silent Failures

**What goes wrong:** Calling `navigator.vibrate()` does nothing on Safari, iOS, or when user hasn't interacted with page yet.

**Why it happens:** Safari doesn't support Vibration API. Chrome requires "sticky user activation" (user has interacted with page).

**How to avoid:**
- Feature detect: `if ('vibrate' in navigator) { ... }`
- Only call after user interaction (button press)
- Don't rely solely on haptics - always pair with visual/audio feedback
- Treat as progressive enhancement, not core feature

**Warning signs:**
- Vibration works on some devices but not others
- Console shows no errors but no vibration happens
- Works in development but not production

**Source:** [Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)

### Pitfall 4: Accessibility - Animations Triggering Migraines

**What goes wrong:** Scaling/zooming animations, flashing effects, or excessive motion can trigger vestibular disorders and migraines.

**Why it happens:** Not respecting user's motion preferences or using motion that's too intense.

**How to avoid:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Warning signs:**
- No reduced-motion media query in CSS
- Animations can't be disabled
- Using `flash` or `spin` animations without user trigger

**Source:** [CSS Transitions Best Practices](https://thoughtbot.com/blog/transitions-and-transforms)

### Pitfall 5: Toast Notification Stack Overflow

**What goes wrong:** Multiple rapid events (like rapid betting) create dozens of stacked toasts that cover the screen.

**Why it happens:** Not limiting concurrent toasts or dismissing previous toasts before showing new ones.

**How to avoid:**
- Use library like Sonner that manages toast stacking
- Limit concurrent toasts to 3-5
- Auto-dismiss old toasts when new ones appear
- Use `toast.dismiss()` before showing duplicate messages

**Warning signs:**
- Screen fills with notifications during rapid actions
- Users can't see content behind toasts
- Notifications don't auto-dismiss

## Code Examples

Verified patterns from official sources:

### Bet Confirmation with Haptics
```tsx
'use client';

import { toast } from 'sonner';

function BetButton({ onBet }: { onBet: () => Promise<void> }) {
  async function handleBet() {
    // Haptic feedback (progressive enhancement)
    if ('vibrate' in navigator) {
      navigator.vibrate(50); // Short 50ms buzz
    }

    // Visual feedback - button press animation via Tailwind
    // (handled by active:scale-95 class)

    try {
      await onBet();
      toast.success('Bet placed!');
    } catch (error) {
      toast.error('Bet failed');
    }
  }

  return (
    <button
      onClick={handleBet}
      className="
        px-6 py-3
        bg-warning text-white
        rounded
        active:scale-95
        transition-transform duration-150
        disabled:opacity-50 disabled:scale-100
      "
    >
      Confirm Bet
    </button>
  );
}
```
**Source:** [Web Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate)

### Win/Loss Feedback Modal
```tsx
'use client';

import { useConfetti } from '@/components/Confetti';
import { toast } from 'sonner';

interface BetResult {
  won: boolean;
  bet: number;
  payout?: number;
  newBalance: number;
}

function useBetFeedback() {
  const { triggerConfetti } = useConfetti();

  function showWinFeedback(result: BetResult) {
    // Contained celebration - confetti + toast
    triggerConfetti();

    toast.success('You won!', {
      description: `+${result.payout?.toFixed(2)} SOL`,
      duration: 4000,
      action: {
        label: 'Details',
        onClick: () => {/* show breakdown modal */},
      },
    });
  }

  function showLossFeedback(result: BetResult) {
    // Quick and quiet - just red flash on balance
    // No toast needed, let user move on
    const balanceEl = document.querySelector('[data-balance]');
    balanceEl?.classList.add('text-danger', 'animate-pulse');
    setTimeout(() => {
      balanceEl?.classList.remove('text-danger', 'animate-pulse');
    }, 1000);
  }

  return { showWinFeedback, showLossFeedback };
}
```
**Source:** Existing `/web/src/components/Confetti.tsx`

### Live Data Number Animation with Direction Colors
```tsx
'use client';

import { useState, useEffect } from 'react';
import CountUp from 'react-countup';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
  showDelta?: boolean;
}

function AnimatedNumber({
  value,
  decimals = 2,
  suffix = '',
  showDelta = false
}: AnimatedNumberProps) {
  const [prevValue, setPrevValue] = useState(value);
  const delta = value - prevValue;
  const isIncrease = delta > 0;

  useEffect(() => {
    setPrevValue(value);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <CountUp
        start={prevValue}
        end={value}
        duration={0.4}
        decimals={decimals}
        suffix={suffix}
        preserveValue
      />

      {showDelta && delta !== 0 && (
        <span className={cn(
          'text-xs',
          isIncrease ? 'text-success' : 'text-danger',
          'animate-fadeIn'
        )}>
          {isIncrease ? '+' : ''}{delta.toFixed(decimals)}
        </span>
      )}
    </div>
  );
}
```
**Source:** [react-countup Documentation](https://www.npmjs.com/package/react-countup)

### Payout Breakdown Expandable
```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface PayoutDetails {
  bet: number;
  winnings: number;
  fees: number;
  net: number;
  newBalance: number;
}

function PayoutBreakdown({ details }: { details: PayoutDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* Simple net result by default */}
      <div className="flex items-center justify-between">
        <span className="text-text-secondary">You won</span>
        <span className="text-2xl text-success font-bold">
          +{details.net.toFixed(2)} SOL
        </span>
      </div>

      {/* Expandable breakdown */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          flex items-center gap-1
          text-sm text-text-tertiary
          hover:text-text-secondary
          transition-colors
        "
      >
        <span>Details</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {isExpanded && (
        <div className="
          space-y-1 text-sm
          pt-2 border-t border-white/10
          animate-slideDown
        ">
          <div className="flex justify-between">
            <span className="text-text-tertiary">Bet</span>
            <span className="text-text-secondary">{details.bet.toFixed(2)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Winnings</span>
            <span className="text-success">+{details.winnings.toFixed(2)} SOL</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-tertiary">Fees (5%)</span>
            <span className="text-danger">-{details.fees.toFixed(2)} SOL</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-white/10">
            <span>New Balance</span>
            <span>{details.newBalance.toFixed(2)} SOL</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Progressive Timer with Color Urgency
```tsx
'use client';

import { useEffect, useState } from 'react';

interface UrgentTimerProps {
  endTime: number; // Unix timestamp in ms
}

function UrgentTimer({ endTime }: UrgentTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) clearInterval(interval);
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [endTime]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Progressive urgency
  const colorClass =
    secondsLeft > 60 ? 'text-text-primary' :  // Normal (>1min)
    secondsLeft > 30 ? 'text-warning' :        // Yellow (30s-1min)
    'text-danger';                              // Red (<30s)

  const shouldPulse = secondsLeft <= 10;

  return (
    <div className={cn(
      'text-2xl font-mono font-bold',
      colorClass,
      shouldPulse && 'animate-pulse'
    )}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual optimistic state | React `useOptimistic` hook | React 19 (2024) | Simpler API, auto-revert on error |
| Framer Motion for all animations | CSS transforms + selective libraries | 2025-2026 | Smaller bundles, better performance |
| react-toastify | Sonner | 2024-2025 | Modern API, shadcn/ui adoption |
| Custom skeleton loaders | Tailwind `animate-pulse` | Tailwind v3 | Built-in, no extra code |
| jQuery animations | CSS transitions + transforms | 2015+ | GPU-accelerated, 60fps guaranteed |

**Deprecated/outdated:**
- **Framer Motion for micro-interactions:** Still good for complex animations, but overkill for simple scale/fade. Use CSS.
- **react-toastify:** Still maintained but Sonner is the modern choice (lighter, better DX).
- **Custom useOptimistic implementations:** React 19 has this built-in now.
- **Spinner-only loading states:** Skeleton screens are now standard UX (better perceived performance).

## Open Questions

Things that couldn't be fully resolved:

1. **Delta badge duration**
   - What we know: Should be brief (2-3s) to avoid clutter
   - What's unclear: Exact timing for this app's use case
   - Recommendation: Start with 2s, A/B test if needed. Use `setTimeout` to fade out.

2. **Sound effects for win/loss**
   - What we know: Users often have sound off on mobile, requires user activation
   - What's unclear: Whether to implement at all given context (mobile, public spaces)
   - Recommendation: Skip for MVP. Add as opt-in setting later if user feedback requests it.

3. **Confetti intensity for different win amounts**
   - What we know: Existing Confetti.tsx has `pieceCount` prop
   - What's unclear: Should small wins (<0.1 SOL) have less confetti than big wins?
   - Recommendation: Use same confetti for all wins (consistent dopamine hit). Differentiate with payout message instead.

4. **Loading state preference (skeleton vs spinner vs inline)**
   - What we know: Skeleton screens are best for known layouts, spinners for unknown content
   - What's unclear: What works best for each specific component in this app
   - Recommendation: Use skeleton for battle cards (known layout), inline spinners for bet buttons (action feedback), no spinner for optimistic balance (use delta badge).

## Sources

### Primary (HIGH confidence)
- [React useOptimistic Hook](https://react.dev/reference/react/useOptimistic) - Official React 19 docs
- [Web Vibration API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) - Browser API documentation
- [CSS Transform Scale - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/scale) - CSS documentation
- [react-countup npm](https://www.npmjs.com/package/react-countup) - Package documentation
- Existing codebase: `/web/src/components/Confetti.tsx`, `/web/src/hooks/useBetState.ts`

### Secondary (MEDIUM confidence)
- [Motion Animation Performance Guide](https://motion.dev/docs/performance) - GPU-accelerated animation best practices
- [Top React Notification Libraries 2026](https://knock.app/blog/the-top-notification-libraries-for-react) - Sonner recommended
- [Best Practices for Loading States in Next.js](https://www.getfishtank.com/insights/best-practices-for-loading-states-in-nextjs) - Skeleton screens
- [Implementing Optimistic UI in Next.js](https://dev.to/olaleyeblessing/implementing-optimistic-ui-in-reactjsnextjs-4nkk) - Patterns and examples
- [CSS Transitions and Transforms Best Practices](https://thoughtbot.com/blog/transitions-and-transforms) - Accessibility considerations

### Tertiary (LOW confidence)
- [Micro-Interactions That Boost Engagement](https://medium.com/better-dev-nextjs-react/micro-interactions-and-micro-animations-that-actually-boost-engagement-not-just-eye-candy-26322653898a) - UX principles (not technical)
- [React Animation Libraries Comparison 2025](https://dev.to/raajaryan/react-animation-libraries-in-2025-what-companies-are-actually-using-3lik) - Industry trends (WebSearch only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All recommendations verified against official docs and current project dependencies
- Architecture: HIGH - Patterns sourced from React docs, MDN, and verified libraries
- Pitfalls: HIGH - Common issues documented in MDN, React docs, and performance guides

**Research date:** 2026-01-25
**Valid until:** ~60 days (stable ecosystem, unlikely to change rapidly)

**Codebase context validated:**
- ✅ Confetti.tsx already exists (Phase 17)
- ✅ react-swipeable already in use for gestures
- ✅ tailwindcss-animate already installed
- ✅ useBetState.ts already implements bet flow state machine
- ✅ BattleFeed.tsx uses CSS scroll-snap for TikTok-style navigation
- ✅ React 19.2.3 includes useOptimistic hook
