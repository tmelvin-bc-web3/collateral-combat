# Frontend Library Worker Plan

> Worker focusing on frontend types, hooks, and client library.
> Files: `web/src/lib/`, `web/src/hooks/` only

---

## Story: Frontend Types & Client

- [ ] **T220** Fix frontend type definitions for round status
  - Update RoundStatus type to match contract (Betting/Locked/Settled)
  - Update status mapping and display logic
  - Files: `web/src/lib/prediction/types.ts`, `web/src/hooks/usePrediction.ts`
  - Verify: No TypeScript errors

- [ ] **T223** Remove dead code from prediction client
  - Delete: `initializeRound()` method - not a real contract instruction
  - Delete: `lockRound()` method - not a real contract instruction
  - Delete: `settleRound()` method - not a real contract instruction
  - Files: `web/src/lib/prediction/client.ts`
  - Verify: No dead code remains

---

## Story: Sound & Haptics Hooks

- [ ] **T120** Sound effects system setup
  - Create `useSound` hook, sounds preloaded
  - Volume control, mute toggle persists
  - Files: `web/src/hooks/useSound.ts`, `web/src/contexts/SoundContext.tsx`

- [ ] **T123** Haptic feedback for mobile
  - Vibration on bet placed, win/loss
  - Uses `navigator.vibrate` API, respects user preference
  - Files: `web/src/hooks/useHaptic.ts`

---

## Constraints

- Only modify files in `web/src/lib/` and `web/src/hooks/`
- Run `npm run build` in web to verify TypeScript compiles
- Do NOT modify page components
