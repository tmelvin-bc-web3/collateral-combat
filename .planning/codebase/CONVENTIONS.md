# Coding Conventions

**Analysis Date:** 2026-01-21

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `BattleArena.tsx`, `RealtimeChart.tsx`)
- Utilities/services: `camelCase.ts` (e.g., `priceService.ts`, `battleManager.ts`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useSessionBetting.ts`, `usePrices.ts`)
- Database: `camelCase.ts` with `Database` suffix (e.g., `progressionDatabase.ts`, `balanceDatabase.ts`)
- Tests: `{name}.test.ts` or `{name}.test.tsx` (e.g., `predict.test.ts`, `prediction.test.ts`)

**Functions:**
- Utility functions: `camelCase` (e.g., `calculatePayout`, `determineWinner`, `verifySignature`)
- Service methods: `camelCase` on class instances (e.g., `service.placeBet()`, `client.getUserBalance()`)
- Handler functions: `handle{Event}` pattern for event handlers (e.g., `handleLevelUp`, `handleWinToast`)
- Factory functions: `create{Type}` or `generate{Type}` (e.g., `createRound`, `generateId`)
- Getter functions: `get{Property}` (e.g., `getStatus`, `getTimeRemaining`, `getStats`)
- Verification/validation: `is{Check}` or `verify{Check}` (e.g., `isValidBetAmount`, `verifySignature`)

**Variables:**
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `LAMPORTS_PER_SOL`, `ROUND_DURATION_MS`, `PLATFORM_FEE_PERCENT`)
- State variables: `camelCase` (e.g., `currentRound`, `userBalance`, `sessionKeypair`)
- Boolean flags: `is{Property}` or `can{Action}` prefix (e.g., `isWinner`, `canPlaceBet`, `prefersReducedMotion`)
- React state: lowercase variable names from `useState` (e.g., `const [isLoading, setIsLoading]`)
- Temporal variables: descriptive names with unit suffix where applicable (e.g., `timeIntoRound`, `tokenExpiryMs`)

**Types:**
- Type/interface definitions: `PascalCase` (e.g., `PredictionRound`, `PlayerAccount`, `BattleConfig`)
- Enums: `PascalCase` values matching constant style (e.g., `BetStatus`, `RoundStatus`)
- Type unions: Literal string types preferred over enums (e.g., `type PredictionSide = 'long' | 'short'`)
- Generic parameters: Single capital letters or descriptive PascalCase (e.g., `T`, `ItemType`)

**React Components:**
- Component names: `PascalCase` matching filename (e.g., `BattleArena.tsx`)
- Event handler props: `on{Event}` pattern (e.g., `onBetPlaced`, `onRoundSettled`)
- Child components: Folder structure mirrors component name (e.g., `/BattleArena/PriceChart.tsx`)

## Code Style

**Formatting:**
- No linting/formatting tool configured (Eslint/Prettier not found in repo)
- Consistent indentation: 2 spaces (observed in all source files)
- Line length: No hard limit enforced, but code generally breaks around 100-120 characters
- Semicolons: Required at statement ends (present throughout codebase)
- String quotes: Double quotes `"` for strings, backticks for template literals with interpolation

**Linting:**
- No ESLint config detected
- No Prettier config detected
- TypeScript strict mode enabled in both `web/tsconfig.json` and `backend/tsconfig.json`
  - `strict: true` enforces no implicit `any`, strict null checks, strict function types
  - `forceConsistentCasingInFileNames: true` enforces case sensitivity
  - `skipLibCheck: true` skips type checking of declaration files
  - `resolveJsonModule: true` allows JSON imports

## Import Organization

**Order (web/frontend):**
1. React imports (useState, useEffect, etc.)
2. External packages from node_modules (@solana/*, @radix-ui/*, Socket.io, etc.)
3. Internal lib imports (@/lib/*)
4. Internal hook imports (@/hooks/*)
5. Internal component imports (@/components/*)
6. Internal type imports (@/types)
7. Internal config imports (@/config/*)

**Example:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getSocket } from '@/lib/socket';
import { BACKEND_URL } from '@/config/api';
import { useSessionBetting } from '@/hooks/useSessionBetting';
import { BattleArena } from '@/components/BattleArena';
import { PredictionRound } from '@/types';
```

**Order (backend/services):**
1. External packages (dotenv, express, socket.io, etc.)
2. Internal services and database modules (relative imports with paths)
3. Type imports (./types)
4. Constants/config

**Order (tests):**
1. Type imports from src
2. Test utilities and helpers
3. Classes/functions under test

**Path Aliases:**
- Frontend: `@/*` maps to `src/*` (configured in `web/tsconfig.json`)
- Backend: No path aliases configured (uses relative imports and rootDir setting)
- Benefits: Avoids `../../../` relative imports, makes refactoring easier

## Error Handling

**Patterns:**
- Try-catch blocks in async operations and API calls
- Graceful degradation: Fallback mechanisms when external services fail (e.g., CMC fallback for Pyth)
- Security error logging: Custom `logSecurityEvent()` function for suspicious activity (signature replay, invalid whitelist, etc.)
- Error messages: Descriptive and user-friendly where exposed to clients

**Examples:**
```typescript
// Backend signature verification with error tracking
function verifyWalletSignature(wallet: string, signature: string, timestamp: string): boolean {
  try {
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    if (!isValid) {
      logSecurityEvent('SIGNATURE_INVALID', { wallet });
      return false;
    }
  } catch (error) {
    console.error('[SignatureVerification] Error:', error);
    return false;
  }
}

// Frontend error handling with user feedback
const fetchBalance = useCallback(async () => {
  try {
    const balance = await client.getUserBalance();
    setUserBalance(balance);
  } catch (e) {
    console.error('Failed to fetch balance:', e);
    setError('Unable to load balance');
  }
}, [client]);
```

## Logging

**Framework:** `console` methods directly (no logging library imported)

**Patterns:**
- Production use: `console.error()` only for errors, security events, and important state changes
- Development use: Descriptive prefixes in bracket notation for categorization (e.g., `[SignatureVerification]`, `[RoundManager]`)
- No `console.log()` in production code paths (observed throughout)
- Security-sensitive operations: Use `logSecurityEvent()` utility function for audit trails

**Example:**
```typescript
console.error('[SignatureVerification] Error verifying signature:', error);
logSecurityEvent('SIGNATURE_REPLAY_BLOCKED', { wallet: walletAddress });
```

## Comments

**When to Comment:**
- Complex business logic that isn't self-explanatory (e.g., early bird multiplier calculation)
- Security-critical sections with explicit `SECURITY:` prefix
- Temporary workarounds with issue/ticket reference
- Algorithm explanations for non-obvious calculations

**Avoid:**
- Comments describing obvious code (e.g., `// set loading to true`)
- Outdated comments that don't match code
- Multi-line comments for single-line statements

**JSDoc/TSDoc:**
- Not widely used in this codebase
- Type hints preferred over JSDoc (using TypeScript strict mode)
- Comments on complex functions use inline explanation rather than JSDoc blocks

**Example:**
```typescript
/**
 * Verify a share signature with timestamp validation
 * @param walletAddress - The wallet address
 * @param signature - The signature to verify
 * @param maxAgeMs - Maximum age of the signature in milliseconds (default 5 minutes)
 * @returns Object with valid status and error message if invalid
 */
export function verifyShareSignature(
  walletAddress: string,
  signature: string,
  maxAgeMs: number = 5 * 60 * 1000
): { valid: boolean; error?: string } {
```

## Function Design

**Size:**
- Generally 20-50 lines for utility functions
- Service methods vary from 10 lines (getters) to 100+ lines (settlement logic)
- No strict line limit enforced, but functions are readable and focused

**Parameters:**
- Use object destructuring for functions with 3+ parameters
- Named parameters over positional arguments for clarity
- Optional parameters typically at end with default values

**Example:**
```typescript
// Simple signature verification
export function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  // Implementation
}

// More complex with destructuring
export function placeBet(
  { walletAddress, amount, side, asset }: BetPayload
): Promise<Bet> {
  // Implementation
}

// Optional parameters
export function calculatePayout(
  bet: Bet,
  round: Round,
  isWinner: boolean,
  earlyBirdMultiplier: number = 1.0
): number {
  // Implementation
}
```

**Return Values:**
- Explicit return types in TypeScript (required by strict mode)
- Void for operations with side effects (state mutations, database writes)
- Union types for success/error patterns: `{ valid: boolean; error?: string }`
- Nullable returns use explicit `| null` or `| undefined`

## Module Design

**Exports:**
- Named exports preferred over default exports
- Service modules export singleton instances or classes
- Utility modules export pure functions

**Example:**
```typescript
// Service exports singleton instance
export const predictionService = new PredictionService();

// Utility exports functions
export function calculatePayouts(round: Round): void {
  // Implementation
}
export function determineWinner(startPrice: number, endPrice: number): Winner {
  // Implementation
}

// Avoid: default exports for services
// export default new PredictionService();
```

**Barrel Files:**
- Not consistently used across project
- `src/types/index.ts` aggregates all type definitions in web frontend
- `src/` directory has both index files and direct imports

**Environment Variables:**
- Prefixed for context: `NEXT_PUBLIC_*` for frontend-accessible values (Next.js convention)
- Loaded via `dotenv` in backend (`import 'dotenv/config'`)
- Validation: Constants defined with defaults (e.g., `TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000`)

---

*Convention analysis: 2026-01-21*
