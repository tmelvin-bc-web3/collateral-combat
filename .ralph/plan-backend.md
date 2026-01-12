# Backend Worker Plan

> Worker focusing on backend persistence and API endpoints.
> Files: `backend/` only

---

## Story: Oracle Backend Finalization

- [ ] **T200** Add database persistence for prediction bets
  - Save bets to database when placed (create prediction_bets table if needed)
  - Call `userStatsDb.recordWager()` when bet placed
  - Store round history with outcomes
  - Files: `backend/src/services/predictionService.ts`, `backend/src/database/userStats.ts`
  - Verify: Bets persist across server restart

- [ ] **T201** Add prediction bet history API endpoint
  - GET `/api/predictions/history/:wallet` - user's bet history
  - GET `/api/predictions/round/:roundId` - round details with all bets
  - Files: `backend/src/routes/predictions.ts` (create if needed)
  - Verify: Frontend can fetch historical bets

---

## Constraints

- Only modify files in `backend/` directory
- Run `npm run build` in backend to verify TypeScript compiles
- Test endpoints with curl or similar
