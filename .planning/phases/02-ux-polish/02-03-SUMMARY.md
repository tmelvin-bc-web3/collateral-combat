---
phase: 02-ux-polish
plan: 03
subsystem: frontend-onboarding
tags: [onboarding, ux, wallet-adapter, first-time-user]

dependency-graph:
  requires: [02-01, 02-02]
  provides: [first-match-guide, onboarding-overlay, wallet-prompt-flow]
  affects: [02-05]

tech-stack:
  added: []
  patterns: [conditional-render-onboarding, localStorage-persistence, wallet-adapter-integration]

key-files:
  created:
    - web/src/components/FirstMatchGuide.tsx
    - web/src/components/OnboardingOverlay.tsx
  modified:
    - web/src/app/predict/page.tsx

decisions:
  - id: guide-collapsible
    choice: Collapsible guide card with dismiss
    rationale: Users can minimize without fully dismissing, reducing cognitive load
  - id: localStorage-persistence
    choice: Store dismissal in localStorage under degendome_guide_dismissed
    rationale: Persists across sessions, guide only shown once to new users
  - id: soft-overlay-for-wallet
    choice: Semi-transparent overlay instead of blocking modal
    rationale: Does not feel intrusive, user can dismiss by clicking outside or Escape
  - id: 0.01-sol-prominent
    choice: 0.01 SOL is first in BET_AMOUNTS_SOL array
    rationale: Existing design already makes minimum bet prominent for first-timers

metrics:
  duration: 2min
  completed: 2026-01-21
---

# Phase 02 Plan 03: First Match Experience Optimization Summary

**One-liner:** Collapsible 4-step FirstMatchGuide and OnboardingOverlay wallet prompt for first-time Oracle bettors

## What Was Built

### FirstMatchGuide Component
A collapsible, dismissible guide card for first-time users with:
- 4-step quick guide: Connect wallet, Deposit SOL (0.01 min highlighted), Pick UP/DOWN, Win and get share
- Collapsible header with collapse/dismiss buttons (touch-friendly 32px targets)
- "Tip: Start small with 0.01 SOL" call-out
- localStorage persistence (`degendome_guide_dismissed` key)
- DegenDome wasteland theme styling (bg-black/60 backdrop-blur border-white/10)
- Helper function `shouldShowGuide()` for easy conditional rendering

### OnboardingOverlay Component
A soft overlay for wallet connection prompts with:
- Triggered when user clicks bet button without wallet connected
- Uses WalletMultiButton from @solana/wallet-adapter-react-ui
- Semi-transparent overlay (bg-black/60 backdrop-blur-sm)
- Click outside or Escape key to dismiss
- Feature highlights: 0.01 SOL minimum, withdraw anytime, earn XP
- Link to /docs for more information

### Predict Page Integration
- Imports both new components
- Adds `showGuide` and `showWalletPrompt` state
- Checks localStorage on mount via `shouldShowGuide()`
- Shows wallet prompt overlay (not error) when user tries to bet without wallet
- FirstMatchGuide rendered after header, centered with max-w-xl
- OnboardingOverlay rendered before Deposit Modal

## Technical Details

### Component Props

**FirstMatchGuide:**
```typescript
interface FirstMatchGuideProps {
  onDismiss?: () => void;
  className?: string;
}
```

**OnboardingOverlay:**
```typescript
interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### New User Flow
1. User visits /predict for first time
2. FirstMatchGuide appears at top showing 4-step instructions
3. User can collapse, dismiss, or leave guide visible
4. User clicks UP or DOWN without wallet connected
5. OnboardingOverlay appears with WalletMultiButton
6. User connects wallet
7. User can now place bets (after depositing)

### Key Patterns Used
- Conditional rendering based on state (`showGuide && <FirstMatchGuide />`)
- localStorage for cross-session persistence
- Click outside to close (overlayRef pattern)
- Escape key handler with cleanup
- Body scroll lock when overlay open

## Verification

- Build passes: `pnpm build` completed successfully
- Files exist: Both components created at expected paths
- Integration verified: 8 matches for component/state names in predict page
- 0.01 SOL minimum: Already first option in BET_AMOUNTS_SOL array

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 8e044ee | Add FirstMatchGuide and OnboardingOverlay components |
| 2 | 5abc61b | Integrate onboarding into predict page |

## Next Phase Readiness

**Ready for 02-05 (Animation polish):**
- FirstMatchGuide uses `animate-slideUp` class that may need definition
- OnboardingOverlay uses `animate-fadeIn` and `animate-slideUp`
- These animations should be verified/added in the animation polish phase

**No blockers.** First match experience optimization complete.
