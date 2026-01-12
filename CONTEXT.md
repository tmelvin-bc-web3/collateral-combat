# DegenDome Coding Context

> This file defines the coding standards for all workers.

## Tech Stack

- **Frontend**: Next.js 15+, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Express.js, TypeScript, SQLite (better-sqlite3)
- **Blockchain**: Solana Web3.js, Anchor
- **Package Managers**: pnpm (web), npm (backend)

## Directory Structure

```
/backend        - Express API server
/web            - Next.js frontend
/battle_program - Solana program (DO NOT MODIFY)
/prediction_program - Prediction market program
```

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types - use proper typing
- Use type inference where obvious
- Prefer interfaces over type aliases for objects

### Naming Conventions
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Constants: SCREAMING_SNAKE_CASE
- CSS classes: kebab-case

### React Patterns
- Functional components only
- Custom hooks for shared logic
- Server components by default (Next.js App Router)
- Client components only when needed ('use client')

### API Routes
- RESTful conventions
- Consistent error responses: `{ error: string, code: string }`
- Auth middleware on protected routes

## Forbidden Patterns

- No `console.log` in production code (use proper logging)
- No hardcoded API URLs (use environment variables)
- No direct DOM manipulation in React
- No modifications to `battle_program/` directory
- No `any` types

## Testing

- Run `pnpm typecheck` before completing any task
- Run `pnpm build` to verify no build errors
- Backend: `npm run typecheck` in backend/

## Environment Variables

All secrets must be in `.env` files which are gitignored.
Never commit API keys, private keys, or tokens.
