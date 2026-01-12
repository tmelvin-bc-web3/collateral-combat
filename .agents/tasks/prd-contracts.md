# Sol Battles - Smart Contract PRD

## Constraints
- **Requires Solana MCP** for building, testing, and deploying
- Only modify files in `prediction_program/` directory

---

## Stories

### [ ] US-002: Smart Contract Alignment
Fix timing, add early bird multiplier, and add locked status to smart contract.

**Tasks:**
- T210: Change LOCK_PERIOD from 10s to 5s
- T211: Add bet_timestamp to PlayerPosition, calculate early bird multiplier in claim_winnings (20% max, linear decay)
- T212: Change RoundStatus from {Open, Settled} to {Betting, Locked, Settled}

**Files:** prediction_program/programs/prediction_program/src/lib.rs, state.rs

**Verify:** On-chain timing matches backend (25s betting, 5s locked), early bets get bonus payout
