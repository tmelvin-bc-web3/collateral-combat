# Phase 17: Onboarding - Research

**Researched:** 2026-01-25
**Domain:** Wallet connection UX, first-time user onboarding, celebration micro-interactions
**Confidence:** HIGH

## Summary

Phase 17 creates a streamlined onboarding flow for new users: anonymous spectating, one-click wallet connection, guided first bet, and fighter identity creation. The codebase already has comprehensive foundations that this phase extends:

- `WalletProvider.tsx` with multiple wallet adapters (Phantom, Solflare, Coinbase, Ledger, Torus, Trust)
- `useSessionBetting.ts` hook for balance, session management, and betting
- `ProfileSetup.tsx` component for profile creation (username + avatar selection)
- `ProfileContext.tsx` with `needsSetup` detection and profile management
- `Confetti.tsx` component with `useConfetti()` hook for celebration animations
- Watch experience components from Phase 16 (`BattleFeed`, `BattleSlide`, `QuickBetStripV2`)

The existing infrastructure means this phase is primarily about **wiring together existing components** with new UX flows rather than building new technical capabilities. The key additions are: floating wallet connect pill, first-bet detection/celebration, and modified profile setup trigger timing.

**Primary recommendation:** Extend existing `WalletProvider` and `ProfileContext` with new state tracking for first-bet detection, create a floating connect pill component, and wire the existing `Confetti` component to first-bet success. Use the established `@solana/wallet-adapter-react-ui` modal for wallet selection.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @solana/wallet-adapter-react | ^0.15.39 | Wallet connection hooks | Already in project, Solana standard |
| @solana/wallet-adapter-react-ui | ^0.9.39 | Wallet modal UI | Already in project, handles multi-wallet selection |
| @solana/wallet-adapter-wallets | ^0.19.37 | Wallet adapters | Already in project, includes Phantom, Solflare, etc. |
| React 19 | ^19.2.3 | UI framework | Already in project |
| TailwindCSS | ^3.4.19 | Styling | Already in project |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Confetti component | local | Celebration animation | First bet success |
| ProfileSetup component | local | Name/avatar selection | After first bet |
| useSessionBetting hook | local | Balance and betting | Deposit flow, bet placement |
| ProfileContext | local | Profile state management | First-time user detection |

### No New Dependencies Required
This phase leverages existing infrastructure entirely. The wallet adapter UI already handles:
- Multi-wallet selection modal
- Auto-connect on return visits
- Wallet state management

**Installation:**
```bash
# No new packages required - use existing stack
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/
├── onboarding/
│   ├── FloatingConnectPill.tsx     # ONB-02: Floating wallet connect button
│   ├── FirstBetCelebration.tsx     # ONB-05: Celebration animation wrapper
│   └── DepositPrompt.tsx           # ONB-08: Post-connect deposit guidance
│
├── ProfileSetup.tsx                 # ONB-06: Existing, trigger after first bet
├── WalletProvider.tsx               # Existing, no changes needed
├── WalletBalance.tsx                # Existing, shows deposit flow
└── Confetti.tsx                     # ONB-05: Existing celebration component

src/contexts/
├── ProfileContext.tsx               # Extend with first-bet tracking
└── OnboardingContext.tsx            # New: Track onboarding state

src/hooks/
├── useSessionBetting.ts             # Existing, use for bet placement
└── useFirstBet.ts                   # New: Track first bet state
```

### Pattern 1: Anonymous Spectator Experience (ONB-01)
**What:** Full read access without wallet connection
**When to use:** Default state for all unauthenticated users
**Example:**
```typescript
// Components should check wallet connection and render appropriately
// Source: Existing pattern in BettingPanel.tsx lines 427-436

function BettingPanel({ battle, walletAddress }: BettingPanelProps) {
  // ...existing code...
  return (
    <button
      onClick={handlePlaceBet}
      disabled={!selectedPlayer || isPlacing || !walletAddress}
    >
      {!walletAddress ? (
        <>
          <WalletIcon />
          Connect Wallet
        </>
      ) : (
        'Place Wager'
      )}
    </button>
  );
}
```

### Pattern 2: Floating Connect Pill (ONB-02, ONB-03)
**What:** Persistent but dismissible wallet connect button
**When to use:** Shown when user is not connected, across all spectator views
**Example:**
```typescript
// FloatingConnectPill.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';

export function FloatingConnectPill() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if connected or dismissed
  if (connected || dismissed) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        onClick={() => setVisible(true)}
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-warning text-black font-semibold shadow-lg shadow-warning/30 hover:scale-105 transition-transform"
      >
        <WalletIcon className="w-5 h-5" />
        Connect to bet
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-secondary border border-border-primary text-text-tertiary hover:text-text-primary"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
```

### Pattern 3: Wallet Connect with Plain Language (ONB-03)
**What:** Reassuring copy during wallet connection flow
**When to use:** In the connect prompt and post-connect feedback
**Example:**
```typescript
// Use the built-in wallet modal, but add context around it
// The wallet modal from @solana/wallet-adapter-react-ui handles multi-wallet selection

function ConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="text-center p-4">
      <p className="text-text-secondary mb-4">
        Connect to bet. Your funds stay in your wallet until you wager.
      </p>
      <button onClick={onConnect} className="btn btn-primary">
        Connect Wallet
      </button>
    </div>
  );
}
```

### Pattern 4: First Bet Detection and Celebration (ONB-05)
**What:** Track first bet, trigger celebration animation
**When to use:** After successful first bet placement
**Example:**
```typescript
// useFirstBet.ts - New hook
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const FIRST_BET_KEY = 'sol_battles_first_bet_completed';

export function useFirstBet() {
  const { publicKey } = useWallet();
  const [hasPlacedFirstBet, setHasPlacedFirstBet] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (!publicKey) return;
    const key = `${FIRST_BET_KEY}_${publicKey.toBase58()}`;
    setHasPlacedFirstBet(localStorage.getItem(key) === 'true');
  }, [publicKey]);

  const recordFirstBet = useCallback(() => {
    if (!publicKey || hasPlacedFirstBet) return;

    const key = `${FIRST_BET_KEY}_${publicKey.toBase58()}`;
    localStorage.setItem(key, 'true');
    setHasPlacedFirstBet(true);
    setShowCelebration(true);
  }, [publicKey, hasPlacedFirstBet]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return {
    hasPlacedFirstBet,
    showCelebration,
    recordFirstBet,
    dismissCelebration,
  };
}
```

### Pattern 5: Post-Connect Balance Feedback (ONB-08)
**What:** Show balance + deposit prompt immediately after connection
**When to use:** On successful wallet connection
**Example:**
```typescript
// Extend existing WalletBalance modal behavior
// Source: Existing pattern in WalletBalance.tsx

function PostConnectPrompt({ balance, onDeposit }: PostConnectProps) {
  return (
    <div className="p-4 bg-success/10 border border-success/30 rounded-xl">
      <p className="text-success font-semibold">
        Connected! Balance: {balance.toFixed(2)} SOL
      </p>
      {balance === 0 && (
        <button onClick={onDeposit} className="btn btn-primary mt-2 w-full">
          Deposit to start betting
        </button>
      )}
    </div>
  );
}
```

### Pattern 6: Profile Setup After First Bet (ONB-06)
**What:** Trigger profile setup modal after first bet celebration
**When to use:** After first bet success, after celebration dismisses
**Example:**
```typescript
// Modify ProfileContext to check first bet instead of just connection
// Source: Existing ProfileContext.tsx pattern

// In ProfileContext.tsx, change needsSetup logic:
const needsSetup = !!(
  walletAddress &&
  !isLoading &&
  ownProfile &&
  !hasCustomProfile &&
  !setupCompleted &&
  hasPlacedFirstBet  // NEW: Only prompt after first bet
);
```

### Anti-Patterns to Avoid
- **Don't block spectating with wallet prompts:** Users must be able to watch without interruption
- **Don't auto-open wallet modal:** Let users choose when to connect via floating pill
- **Don't use complex wallet selection UI:** The standard wallet adapter modal is sufficient
- **Don't celebrate every bet:** Only first bet gets celebration animation
- **Don't require profile setup before betting:** Profile comes AFTER first bet

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wallet selection UI | Custom wallet picker | @solana/wallet-adapter-react-ui WalletModalProvider | Already handles all edge cases, accessibility |
| Wallet state management | Custom wallet hooks | useWallet() from wallet-adapter-react | Handles connection, disconnection, autoConnect |
| Celebration animation | Custom particle system | Existing Confetti.tsx component | Already themed, tested, performant |
| Profile creation UI | New profile modal | Existing ProfileSetup.tsx | Already handles username validation, avatar selection |
| Session key creation | User-facing flow | useSessionBetting createSession() | ONB-07 specifies this should be silent |
| Balance display | Custom balance fetcher | useSessionBetting balanceInSol | Already polls and updates |

**Key insight:** The codebase has nearly all the pieces needed. This phase is about orchestration and UX polish, not new technical capabilities.

## Common Pitfalls

### Pitfall 1: Wallet Modal Not Showing on Mobile
**What goes wrong:** Wallet modal shows on desktop but empty or broken on mobile
**Why it happens:** iOS doesn't auto-detect wallets like desktop browser extensions
**How to avoid:** Include explicit wallet adapters (Phantom, Solflare) in WalletProvider - already done in codebase
**Warning signs:** Empty wallet list on iOS Safari

### Pitfall 2: First Bet Flag Lost on Clear
**What goes wrong:** User sees first-bet celebration again after clearing localStorage
**Why it happens:** localStorage-only persistence
**How to avoid:** Also check backend for bet history as fallback; accept that repeat celebration is minor UX issue
**Warning signs:** Returning users see celebration again

### Pitfall 3: Profile Setup Blocks Betting
**What goes wrong:** User can't bet because profile modal blocks them
**Why it happens:** ProfileSetupWrapper in wrong position in component tree
**How to avoid:** Only show profile setup AFTER first bet, not on connection
**Warning signs:** New users stuck in profile setup before betting

### Pitfall 4: Zero Balance Users Confused
**What goes wrong:** User connects but doesn't understand they need to deposit
**Why it happens:** Balance display not prominent enough, no deposit prompt
**How to avoid:** Show explicit "Deposit to start betting" message when balance is 0
**Warning signs:** Users connect but never place bets

### Pitfall 5: Celebration Interrupts Live Battle
**What goes wrong:** Confetti animation covers important battle UI
**Why it happens:** Celebration z-index too high, duration too long
**How to avoid:** Keep celebration brief (2-3 seconds), ensure battle info still visible
**Warning signs:** Users miss battle outcome during celebration

### Pitfall 6: Session Key Creation Fails Silently
**What goes wrong:** User connected but bets fail without clear error
**Why it happens:** Session key creation failed but no feedback given
**How to avoid:** Retry session creation automatically; fall back to wallet signature if needed
**Warning signs:** "Failed to place bet" errors after successful connection

## Code Examples

Verified patterns from existing codebase:

### Wallet Connection Hook Pattern (Existing)
```typescript
// Source: /web/src/hooks/useSessionBetting.ts lines 28-44
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export function useSessionBetting() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // ... client setup and state management

  // Auto-fetch balance on wallet connect
  useEffect(() => {
    if (wallet.publicKey && client) {
      fetchBalance();
    }
  }, [wallet.publicKey, client, fetchBalance]);
}
```

### Profile Setup Trigger (Existing, to be modified)
```typescript
// Source: /web/src/contexts/ProfileContext.tsx lines 66-79
// Current logic triggers on connection - modify to trigger after first bet

const hasCustomProfile = ownProfile && (
  ownProfile.username ||
  ownProfile.presetId ||
  ownProfile.nftMint ||
  ownProfile.updatedAt > 0
);

// CURRENT (will be modified):
const needsSetup = !!(
  walletAddress &&
  !isLoading &&
  ownProfile &&
  !hasCustomProfile &&
  !setupCompleted
);

// NEW (after modification):
const needsSetup = !!(
  walletAddress &&
  !isLoading &&
  ownProfile &&
  !hasCustomProfile &&
  !setupCompleted &&
  hasPlacedFirstBet  // Add this condition
);
```

### Confetti Celebration (Existing)
```typescript
// Source: /web/src/components/Confetti.tsx lines 174-198
// Already has useConfetti() hook that can be used directly

import { useConfetti } from '@/components/Confetti';

function BetSuccessHandler() {
  const { triggerConfetti, ConfettiComponent } = useConfetti();
  const { recordFirstBet, hasPlacedFirstBet } = useFirstBet();

  const handleBetSuccess = () => {
    if (!hasPlacedFirstBet) {
      triggerConfetti();
      recordFirstBet();
    }
  };

  return (
    <>
      {ConfettiComponent}
      {/* Rest of component */}
    </>
  );
}
```

### Wallet Modal Trigger (Existing)
```typescript
// Source: /web/src/components/WalletProvider.tsx pattern
// The WalletModalProvider is already set up

import { useWalletModal } from '@solana/wallet-adapter-react-ui';

function ConnectButton() {
  const { setVisible } = useWalletModal();
  const { connected } = useWallet();

  if (connected) return null;

  return (
    <button onClick={() => setVisible(true)}>
      Connect Wallet
    </button>
  );
}
```

### Preset Amount Buttons (Existing Pattern)
```typescript
// Source: /web/src/components/WalletBalance.tsx lines 25, 270-285
// Shows quick amount selection pattern for deposits/bets

const QUICK_AMOUNTS = [0.1, 0.25, 0.5, 1, 2, 5];

// For first bet, use preset with 0.05 pre-selected (ONB-04)
const FIRST_BET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5];
const DEFAULT_FIRST_BET = 0.05; // Second preset pre-selected

<div className="grid grid-cols-3 gap-1.5 sm:gap-2">
  {FIRST_BET_AMOUNTS.map((amount) => (
    <button
      key={amount}
      onClick={() => setAmount(amount.toString())}
      className={`py-2 rounded-lg text-sm font-medium ${
        parseFloat(selectedAmount) === amount
          ? 'bg-warning text-black'
          : 'bg-white/10 text-white'
      }`}
    >
      {amount} SOL
    </button>
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom wallet connection | @solana/wallet-adapter-react | 2023 | Standard across Solana ecosystem |
| Seed phrase onboarding | Embedded wallets / passkeys | 2024-2025 | 40%+ retention improvement |
| Wallet pop-up per action | Session keys | 2024 | Frictionless betting |
| Tutorial overlays | Progressive disclosure | 2025 | Better completion rates |

**Deprecated/outdated:**
- **Explicit wallet adapter imports:** Modern apps use Wallet Standard auto-detection, but adapters still needed for iOS
- **Mandatory profile before action:** Current best practice is let users act first, then personalize
- **Comprehensive tutorials:** Replace with good default values and progressive disclosure

## Open Questions

Things that couldn't be fully resolved:

1. **Celebration Duration**
   - What we know: 2-3 seconds is standard for micro-interactions
   - What's unclear: Optimal balance between rewarding and not blocking battle view
   - Recommendation: Use existing Confetti component with 3000ms duration, can be tuned later

2. **Floating Pill Position on Different Screens**
   - What we know: Needs to avoid thumb zone conflicts with betting UI
   - What's unclear: Exact position that works across all screen sizes
   - Recommendation: Position above QuickBetStrip (bottom-24), test on multiple devices

3. **Session Key Silent Creation Timing**
   - What we know: ONB-07 requires silent session creation
   - What's unclear: Whether to create on connect or on first bet attempt
   - Recommendation: Create on first bet attempt, background retry on failure

4. **Profile Skip Behavior**
   - What we know: Skip allowed, shows truncated wallet address
   - What's unclear: Whether to prompt again later or consider permanently skipped
   - Recommendation: Don't prompt again in same session; can prompt after next milestone

## Sources

### Primary (HIGH confidence)
- `/web/src/components/WalletProvider.tsx` - Existing wallet adapter setup
- `/web/src/hooks/useSessionBetting.ts` - Session and balance management
- `/web/src/contexts/ProfileContext.tsx` - Profile state and setup detection
- `/web/src/components/ProfileSetup.tsx` - Profile creation UI
- `/web/src/components/Confetti.tsx` - Celebration animation component
- `/web/src/components/WalletBalance.tsx` - Deposit/withdraw modal patterns
- [Solana Wallet Adapter React](https://www.npmjs.com/package/@solana/wallet-adapter-react) - Official npm package
- [Mobile Wallet Adapter UX Guidelines](https://docs.solanamobile.com/mobile-wallet-adapter/ux-guidelines) - Official Solana Mobile docs

### Secondary (MEDIUM confidence)
- [Helius: Frictionless Web3 UX](https://www.helius.dev/blog/web3-ux) - Onboarding best practices
- [Helius: Embedded Wallets](https://www.helius.dev/blog/solana-embedded-wallets) - Alternative wallet approaches
- [Micro-interactions UX 2026](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/) - Celebration animation patterns
- [Userpilot Micro-interaction Examples](https://userpilot.com/blog/micro-interaction-examples/) - Onboarding UI patterns
- [Fireblocks Web3 Onboarding](https://www.fireblocks.com/blog/create-a-seamless-web3-onboarding-experience-for-web2-users) - Reducing friction patterns

### Tertiary (LOW confidence)
- General web search results on celebration animations and first-time user flows

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All infrastructure exists, wallet adapter is well-documented
- Architecture: HIGH - Extends existing patterns directly, minimal new code
- Pitfalls: MEDIUM - Based on common Web3 UX issues and codebase analysis
- First-bet detection: HIGH - Simple localStorage pattern, fallback to backend available

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable feature area, wallet adapter ecosystem mature)

---

## Appendix: Existing Infrastructure Summary

### WalletProvider Configuration
```typescript
// Source: /web/src/components/WalletProvider.tsx
// Already configured with multiple wallets:
const wallets = useMemo(() => [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new CoinbaseWalletAdapter(),
  new LedgerWalletAdapter(),
  new TorusWalletAdapter(),
  new TrustWalletAdapter(),
], []);
```

### Profile Types
```typescript
// Source: /web/src/types/index.ts
export type ProfilePictureType = 'preset' | 'nft' | 'default';

export interface UserProfile {
  walletAddress: string;
  username?: string;
  pfpType: ProfilePictureType;
  presetId?: string;
  nftMint?: string;
  nftImageUrl?: string;
  updatedAt: number;
}
```

### Session Betting Hook Interface
```typescript
// Source: /web/src/hooks/useSessionBetting.ts
// Available methods:
return {
  isLoading,
  error,
  userBalance,
  balanceInSol,
  hasValidSession,
  sessionValidUntil,
  deposit,
  withdraw,
  createSession,
  revokeSession,
  placeBet,
  claimWinnings,
  fetchBalance,
  getCurrentRound,
  getPool,
  getPosition,
};
```

### Confetti Hook Interface
```typescript
// Source: /web/src/components/Confetti.tsx
// useConfetti() returns:
return {
  isActive,
  triggerConfetti,
  handleComplete,
  ConfettiComponent,
};
```
