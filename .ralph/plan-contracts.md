# Smart Contract Worker Plan

> Worker focusing on Solana smart contract updates.
> Files: `prediction_program/` only
> REQUIRES: Solana MCP for building, testing, and deploying

---

## Story: Smart Contract Alignment

- [ ] **T210** Fix smart contract timing constants
  - Change: LOCK_PERIOD from 10s to 5s to match backend
  - Files: `prediction_program/programs/prediction_program/src/lib.rs`
  - Verify: On-chain round timing matches off-chain (25s betting, 5s locked)
  - Deploy to devnet first

- [ ] **T211** Add early bird multiplier to smart contract
  - Store `bet_timestamp` in PlayerPosition PDA
  - Calculate early bird multiplier in claim_winnings (20% max, linear decay)
  - Formula: `multiplier = 1 + (0.20 * (1 - timeIntoRound/bettingDuration))`
  - Files: `prediction_program/programs/prediction_program/src/state.rs`, `lib.rs`
  - Verify: Early bets receive bonus payout on-chain

- [ ] **T212** Add round status enum for locked state
  - Change: RoundStatus from `{Open, Settled}` to `{Betting, Locked, Settled}`
  - Update crank instruction to transition through Locked state
  - Update place_bet to only allow bets during Betting status
  - Files: `prediction_program/programs/prediction_program/src/state.rs`, `lib.rs`
  - Verify: Frontend type mismatch resolved

---

## Constraints

- Only modify files in `prediction_program/` directory
- Use Solana MCP for all operations
- Run `anchor build` to verify compilation
- Deploy to devnet before mainnet
