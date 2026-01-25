---
phase: 16-watch-experience
plan: 02
subsystem: ui
tags: [react, mobile, swipe-gestures, betting, chat, state-machine]

# Dependency graph
requires:
  - phase: 15-core-structure
    provides: Navigation structure and homepage layout
  - phase: 16-watch-experience-01
    provides: BattleSlide, BattleFeed components for battle viewing
provides:
  - QuickBetStripV2 with swipe-to-bet interaction
  - FloatingChat overlay for Twitch-style messaging
  - BetConfirmOverlay for two-tap bet confirmation
  - useBetState hook for bet flow state machine
affects:
  - 17-onboarding (betting tutorial integration)
  - 18-polish (animations and transitions)

# Tech tracking
tech-stack:
  added:
    - react-swipeable (already installed, used for swipe gestures)
  patterns:
    - State machine pattern for bet flow (idle -> amount_selected -> confirming -> placing -> success/error)
    - Swipe gesture detection with visual feedback
    - Floating overlay pattern for non-intrusive chat
    - Two-tap confirmation for mobile betting

key-files:
  created:
    - web/src/hooks/useBetState.ts
    - web/src/components/watch/QuickBetStripV2.tsx
    - web/src/components/watch/FloatingChat.tsx
    - web/src/components/watch/BetConfirmOverlay.tsx
  modified:
    - web/src/components/watch/index.ts
    - web/src/components/watch/BattleFeed.tsx
    - web/tailwind.config.ts

key-decisions:
  - "Preset amounts: [0.01, 0.05, 0.1, 0.5] SOL per MOB-07"
  - "Swipe left = Fighter 1, swipe right = Fighter 2"
  - "Default bet amount: 0.1 SOL (middle of range)"
  - "Messages fade after 8 seconds in floating chat"
  - "5 messages visible in floating overlay"

patterns-established:
  - "State machine hook pattern: typed states with transition functions"
  - "Swipe gesture with visual feedback: translateX offset during swipe"
  - "Floating overlay pattern: positioned above fixed bottom elements"
  - "Two-tap confirmation: action triggers overlay, confirm button executes"

# Metrics
duration: 6min
completed: 2026-01-25
---

# Phase 16 Plan 02: Swipe-to-Bet and Floating Chat Summary

**Thumb-zone QuickBetStripV2 with swipe-to-bet gestures, floating chat overlay, and two-tap bet confirmation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-25T00:00:28Z
- **Completed:** 2026-01-25T00:06:50Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Created useBetState hook implementing bet flow state machine with socket integration
- Built QuickBetStripV2 with swipe-to-bet interaction (swipe left = Fighter 1, swipe right = Fighter 2)
- Implemented BetConfirmOverlay for two-tap bet confirmation with loading states
- Created FloatingChat with Twitch-style message overlay and 8-second fade
- Added slideUp/fadeIn animations to tailwind.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useBetState hook** - `589ce05` (feat)
2. **Task 2: Create QuickBetStripV2** - `3d84f25` (feat)
3. **Task 3: Create FloatingChat and exports** - `dad3d88` (feat)

## Files Created/Modified
- `web/src/hooks/useBetState.ts` - Bet flow state machine hook with socket integration
- `web/src/components/watch/QuickBetStripV2.tsx` - Thumb-zone betting strip with swipe gestures
- `web/src/components/watch/BetConfirmOverlay.tsx` - Two-tap confirmation overlay
- `web/src/components/watch/FloatingChat.tsx` - Twitch-style floating chat messages
- `web/src/components/watch/index.ts` - Added exports for new components
- `web/src/components/watch/BattleFeed.tsx` - Fixed react-swipeable ref merging issue
- `web/tailwind.config.ts` - Added slideUp/fadeIn animation keyframes

## Decisions Made
1. **Preset amounts [0.01, 0.05, 0.1, 0.5] SOL** - Per MOB-07 specification
2. **Default 0.1 SOL** - Middle of preset range for reasonable starting bet
3. **Swipe direction mapping** - Left = Fighter 1 (green/success), Right = Fighter 2 (red/danger)
4. **8-second message fade** - Balances visibility with non-intrusiveness
5. **5 visible messages** - Keeps overlay compact, older messages more transparent

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed react-swipeable ref conflict in BattleFeed.tsx**
- **Found during:** Task 2 (QuickBetStripV2 typecheck)
- **Issue:** BattleFeed.tsx was spreading `handlers` from useSwipeable while also passing `ref={containerRef}`, causing TypeScript error "ref is specified more than once"
- **Fix:** Created `mergeRefs` utility function to combine containerRef with handlers.ref, and explicitly passed onMouseDown handler
- **Files modified:** web/src/components/watch/BattleFeed.tsx
- **Verification:** TypeScript check passes
- **Committed in:** 3d84f25 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered
None - plan executed smoothly after fixing the pre-existing BattleFeed ref issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- QuickBetStripV2, FloatingChat, and BetConfirmOverlay ready for integration
- Components export via index.ts for clean imports
- State machine pattern established for other bet flows
- Ready for Phase 17 (Onboarding) betting tutorial integration

---
*Phase: 16-watch-experience*
*Completed: 2026-01-25*
