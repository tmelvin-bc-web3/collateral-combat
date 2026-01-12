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

## Live Development Servers

The dev servers are running - use them to verify your changes:

- **Frontend**: http://localhost:3000 (Next.js)
- **Backend**: http://localhost:3002 (Express API)
- **Oracle Page**: http://localhost:3000/predict

**Verification Tips:**
- Use `WebFetch` tool to fetch pages and check your changes rendered correctly
- For CSS/layout changes, fetch the page and verify classes/structure in HTML
- For API changes, use `curl http://localhost:3002/api/...` via Bash
- The frontend hot-reloads, so changes appear immediately

## Solana Development (MCP)

When working on smart contracts (`battle_program/`, `prediction_program/`), use the **Solana MCP** tools:

- `solana-mcp-server` is configured and available
- Use it for: Anchor framework help, Solana APIs, SDK questions, error debugging
- Query documentation directly for Solana/Anchor patterns

Example queries:
- "How do I create a PDA in Anchor?"
- "What's the correct way to handle CPI calls?"
- "Debug this Anchor error: ..."
