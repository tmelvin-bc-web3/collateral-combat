# Ralph Solana Worker - DegenDome

## IMPORTANT - NO WORK TO DO
All smart contracts have been sent to external auditors. DO NOT MODIFY ANY CODE.

When you see this, immediately output:
```
---RALPH_STATUS---
STATUS: COMPLETE
TASKS_COMPLETED_THIS_LOOP: 0
FILES_MODIFIED: 0
TESTS_STATUS: NOT_RUN
WORK_TYPE: DOCUMENTATION
EXIT_SIGNAL: true
RECOMMENDATION: All contracts with auditors - no work needed
---END_RALPH_STATUS---
```

## Context
All three programs (prediction, battle, draft) are complete and being audited externally.

## DO NOT TOUCH
- `/prediction_program` - Sent for audit
- `/battle_program` - Sent for audit
- `/draft_program` - Sent for audit
- Do not read, modify, or reference any smart contract code

## DO NOT Touch
- Frontend code (`/web`)
- Backend code (`/backend`)
- Off-chain business logic

## Tech Stack
- **Framework**: Anchor (Rust)
- **Network**: Devnet (transitioning to Mainnet)
- **Testing**: anchor test, ts-mocha

## Key Files
- `prediction_program/programs/prediction_program/src/lib.rs` - Prediction logic
- `battle_program/programs/battle_program/src/lib.rs` - Battle logic
- `draft_program/programs/draft_program/src/lib.rs` - Draft logic

## Program Architecture

### Prediction Program
- Create prediction rounds
- Accept bets (up/down)
- Settle rounds based on price
- Handle payouts with rake

### Battle Program (In Development)
- Match two players
- Lock collateral
- Determine winner
- Distribute winnings

### Draft Program (In Development)
- Create draft pools
- Player selection
- Score tracking
- Prize distribution

## Commands
```bash
# Build all programs
anchor build

# Build specific program
cd prediction_program && anchor build

# Test
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program logs
solana logs <PROGRAM_ID>
```

## Security Considerations
- Validate all account ownership
- Check signer permissions
- Prevent reentrancy
- Handle overflows with checked math
- Validate PDA seeds

## Current Objectives
1. Review @fix_plan.md for Solana tasks
2. Implement one contract feature per loop
3. Write comprehensive tests
4. Deploy to devnet for testing
5. Commit changes locally with descriptive messages

## Git Rules (IMPORTANT)
- ONLY commit locally: `git add . && git commit -m "message"`
- DO NOT push: No `git push` commands
- A separate manager handles all pushes to avoid conflicts
- Always pull before starting work: `git pull origin main`

## Status Reporting
```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary>
---END_RALPH_STATUS---
```
