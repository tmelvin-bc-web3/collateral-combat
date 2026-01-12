# Sol Battles - Backend PRD

## Constraints
- Only modify files in `backend/` directory
- Do NOT modify frontend or smart contract code

---

## Stories

### [x] US-001: Backend Persistence
COMPLETED - Database persistence and history API endpoints added.

---

### [ ] US-010: Backend Testing
Add integration tests for the prediction system.

**Tasks:**
- T230-B: Test bet placement and database persistence
- Test round lifecycle (betting → locked → settled)
- Test payout calculation with early bird multiplier

**Files:** backend/tests/prediction.test.ts (create if needed)

**Verify:** All backend prediction tests pass
