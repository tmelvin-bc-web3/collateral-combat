# Testing Patterns

**Analysis Date:** 2026-01-21

## Test Framework

**Runner:**
- `jest` v30.2.0 (configured in both web and backend)
- Config: `web/jest.config.js` and `backend/jest.config.js`

**Assertion Library:**
- Jest built-in matchers (expect, toBe, toEqual, etc.)
- Extended matchers: `toBeCloseTo()` for floating-point assertions

**Run Commands:**
```bash
# Frontend
cd web
pnpm test              # Run all tests
pnpm test --watch     # Watch mode
pnpm test:coverage    # Coverage report

# Backend
cd backend
npm test              # Run all tests
npm test -- --watch  # Watch mode
```

## Test File Organization

**Location:**
- Frontend: `web/src/__tests__/` directory (co-located pattern)
- Backend: `backend/tests/` directory (separate from source)

**Naming:**
- Frontend: `{feature}.test.ts` or `{feature}.test.tsx`
- Backend: `{feature}.test.ts`
- Example paths:
  - `web/src/__tests__/predict.test.ts` - Oracle prediction tests
  - `backend/tests/prediction.test.ts` - Backend prediction service tests

**Structure:**
```
web/src/
├── __tests__/
│   └── predict.test.ts         # Tests for predict feature

backend/
├── tests/
│   └── prediction.test.ts      # Tests for prediction service
├── src/
│   ├── services/
│   │   └── priceService.ts
│   └── types.ts
```

## Test Structure

**Suite Organization:**
```typescript
// Test suite pattern
describe('Feature Name', () => {
  // Optional setup
  let service: TestPredictionService;
  let component: Component;

  // Run before each test
  beforeEach(() => {
    service = new TestPredictionService();
    service.setMockPrice(100);
  });

  // Individual test
  test('should perform expected action', () => {
    // Arrange
    const input = setupTestData();

    // Act
    const result = service.placeBet(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.side).toBe('long');
  });

  describe('nested feature', () => {
    test('should handle edge case', () => {
      // Test implementation
    });
  });
});
```

**Patterns:**
- Setup: `beforeEach()` hook initializes state/mocks before each test
- Teardown: Not explicitly used; Jest cleans up between tests
- Assertion: Fluent expect() chains with clear matcher names
- Naming: Tests written in `should...` style for clarity

## Mocking

**Framework:** No explicit mocking library (jest.mock not used)

**Patterns:**
```typescript
// Manual mock implementation for isolated testing
class TestPredictionService {
  private rounds: Map<string, PredictionRound[]> = new Map();
  private currentRounds: Map<string, PredictionRound> = new Map();
  private userBets: Map<string, PredictionBet[]> = new Map();

  startRound(asset: string = 'SOL'): PredictionRound {
    const round: PredictionRound = {
      id: generateId(),
      asset,
      status: 'betting',
      startPrice: this.mockPrice,
      // ... other properties
    };
    this.currentRounds.set(asset, round);
    return round;
  }

  setMockPrice(price: number): void {
    this.mockPrice = price;
  }
}
```

**What to Mock:**
- External services (price feeds, blockchain calls)
- Database operations
- Time-dependent behavior (timestamps, timers)
- Random number generation

**What NOT to Mock:**
- Core business logic (calculations, state management)
- Pure utility functions (formatters, converters)
- Validation logic

**Example from codebase:**
```typescript
// Tests implement testable service with in-memory storage
// avoiding external dependencies
const service = new TestPredictionService();
service.setMockPrice(100);
const bet = service.placeBet('SOL', 'long', 25, 'wallet123');
```

## Fixtures and Factories

**Test Data:**
```typescript
// ID generation for tests (avoids uuid ESM issues)
let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `test-${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 9)}`;
};

// Round creation factory
const createRound = (startTime: number): Round => ({
  startTime,
  lockTime: startTime + ROUND_DURATION_MS - LOCK_BEFORE_END_MS,
  endTime: startTime + ROUND_DURATION_MS,
  status: 'betting',
});

// Bet creation
interface Bet {
  amount: number;
  placedAt: number;
}

interface Round {
  startTime: number;
  lockTime: number;
  longPool: number;
  shortPool: number;
  longBets: Bet[];
  shortBets: Bet[];
}
```

**Location:**
- Inline within test files (no separate fixture directory)
- Constants defined at test module scope (shared across describe blocks)
- Example: `web/src/__tests__/predict.test.ts` contains all test utilities and factories

## Coverage

**Requirements:**
- No coverage threshold enforced
- Coverage reports available via `jest --coverage`

**View Coverage:**
```bash
# Frontend
cd web && pnpm test:coverage

# Backend
cd backend && npm test -- --coverage
```

**Target:**
- Focus on core business logic (calculations, validation, state management)
- Core prediction service extensively tested (round lifecycle, payouts, winner determination)
- Edge cases covered (empty pools, price boundaries, multiple winners)

**Coverage configuration:**
```javascript
// web/jest.config.js
collectCoverageFrom: [
  'src/lib/**/*.ts',
  '!src/**/*.d.ts',
],

// backend/jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
],
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and services in isolation
- Approach: Mock external dependencies, test pure logic
- Example: `backend/tests/prediction.test.ts` tests bet placement, payout calculations, round lifecycle
- Heavy focus on: calculations, state transitions, winner determination

**Integration Tests:**
```typescript
// Example: TestPredictionService tests full workflow
describe('Prediction Service - Round Lifecycle', () => {
  test('should settle a round and determine long winner', () => {
    service.setMockPrice(100);
    service.startRound('SOL');
    service.placeBet('SOL', 'long', 50, 'winner');
    service.placeBet('SOL', 'short', 50, 'loser');
    service.lockRound('SOL');
    const settledRound = service.settleRound('SOL', 105);

    expect(settledRound?.status).toBe('settled');
    expect(settledRound?.winner).toBe('long');
  });
});
```

**E2E Tests:**
- Not used in codebase
- Manual testing referenced in CLAUDE.md: "Run with `npm run dev`, check for errors"
- Manual flow: Connect wallet → place bet → watch round settle

## Common Patterns

**Async Testing:**
```typescript
// Frontend hook testing pattern
test('should fetch balance', async () => {
  const { result } = renderHook(() => useSessionBetting());

  await waitFor(() => {
    expect(result.current.userBalance).toBeDefined();
  });
});

// Backend service testing (no async needed, services synchronous)
test('should place a valid long bet', () => {
  service.startRound('SOL');
  const bet = service.placeBet('SOL', 'long', 25, 'wallet123');
  expect(bet.side).toBe('long');
});
```

**Error Testing:**
```typescript
// Validation testing
test('should reject invalid bet amounts', () => {
  service.startRound('SOL');

  expect(() => service.placeBet('SOL', 'long', 10, 'wallet123'))
    .toThrow('Invalid bet amount');

  expect(() => service.placeBet('SOL', 'long', 30, 'wallet123'))
    .toThrow('Invalid bet amount');
});

// State validation
test('should reject bet when betting is closed (round locked)', () => {
  service.startRound('SOL');
  service.lockRound('SOL');

  expect(() => service.placeBet('SOL', 'long', 25, 'wallet123'))
    .toThrow('Betting is closed for this round');
});
```

**Floating-point Math Testing:**
```typescript
// Critical for financial calculations
test('should calculate correct payout for single winner', () => {
  const payout = calculatePayout(
    { amount: 50, placedAt: startTime },
    round,
    true // isWinner
  );

  // Use toBeCloseTo for decimal comparison (default 2 decimal places)
  expect(payout).toBeCloseTo(117, 1); // Allows margin of error
});

// Round-trip conversion testing
test('SOL should round-trip correctly', () => {
  const values = [1, 0.5, 0.01, 100, 0.001];
  values.forEach((sol) => {
    const lamports = solToLamports(sol);
    const result = lamportsToSol(lamports);
    expect(result).toBeCloseTo(sol, 9); // High precision for crypto math
  });
});
```

**Time-based Testing:**
```typescript
// Round lifecycle testing without real timers
const getStatus = (round: Round, now: number): string => {
  if (now < round.lockTime) return 'betting';
  if (now < round.endTime) return 'locked';
  return 'settled';
};

test('should transition to locked after betting period', () => {
  const startTime = 0;
  const round = createRound(startTime);

  expect(getStatus(round, 24999)).toBe('betting');
  expect(getStatus(round, 25000)).toBe('locked');  // At lock time
  expect(getStatus(round, 29999)).toBe('locked');
  expect(getStatus(round, 30000)).toBe('settled');  // After end
});

// Time remaining calculation
test('should calculate time remaining correctly during betting', () => {
  const round = createRound(0);

  expect(getTimeRemaining(round, 0)).toBe(25);        // 25 seconds left
  expect(getTimeRemaining(round, 10000)).toBe(15);    // 15 seconds left
  expect(getTimeRemaining(round, 24000)).toBe(1);     // 1 second left
});
```

**Proportional Distribution Testing:**
```typescript
// Multiple winners get fair share of pool
test('should distribute proportional payouts to multiple winners', () => {
  service.startRound('SOL');
  const round = service.getCurrentRound('SOL')!;
  const placedAt = round.startTime;

  service.placeBet('SOL', 'long', 100, 'bigWinner', placedAt);
  service.placeBet('SOL', 'long', 50, 'smallWinner', placedAt);
  service.placeBet('SOL', 'short', 150, 'losers', placedAt);

  service.lockRound('SOL');
  const settledRound = service.settleRound('SOL', 110);

  const bigWinnerBet = settledRound!.longBets[0];
  const smallWinnerBet = settledRound!.longBets[1];

  // Big winner gets 2x the payout of small winner (2:1 bet ratio)
  expect(bigWinnerBet.payout! / smallWinnerBet.payout!)
    .toBeCloseTo(2, 1);
});
```

## Test Execution

**Watching Tests:**
```bash
# Frontend - interactive watch mode
cd web && pnpm test --watch

# Backend
cd backend && npm test -- --watch
```

**Single Test File:**
```bash
# Run specific test
pnpm test predict.test.ts   # Frontend
npm test prediction.test.ts  # Backend
```

**Coverage Report:**
```bash
# Generate and view coverage
pnpm test:coverage          # Frontend
npm test -- --coverage      # Backend
# Opens coverage/index.html
```

---

*Testing analysis: 2026-01-21*
