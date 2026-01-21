# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- TypeScript 5.9.3 - Frontend (Next.js), Backend (Node.js), and configuration
- Rust - Smart contract programs (Anchor framework)

**Secondary:**
- JavaScript - Package scripts and configuration
- SQL - Database queries (PostgreSQL, SQLite)

## Runtime

**Environment:**
- Node.js 22.0.0+ (both web and backend require this minimum)

**Package Managers:**
- **Frontend (web/)**: pnpm - Strict dependency resolution for Next.js 16 monorepo
- **Backend (backend/)**: npm - Standard Node.js dependency management
- Lockfiles: pnpm-lock.yaml (web), package-lock.json (backend)

## Frameworks

**Frontend:**
- Next.js 16.1.1 - App Router, React 19, Server/Client components
- React 19.2.3 - UI library
- TailwindCSS 3.4.19 - Styling with custom "Wasteland" theme
- Radix UI - Accessible component primitives (dialog, dropdown, tabs, tooltip, label, slot)

**Backend:**
- Express.js 5.2.1 - HTTP API server
- Socket.IO 4.8.1 - Real-time WebSocket communication
- Anchor 0.32.1 - Solana smart contract framework (Rust)

**Testing:**
- Jest 30.2.0 - Test runner (both frontend and backend)
- ts-jest 29.4.6 - TypeScript support for Jest
- Supertest 7.2.2 - HTTP assertion library (backend only)

**Build/Dev:**
- TypeScript 5.9.3 - Type checking
- ts-node 10.9.2 - TypeScript execution (backend development)
- Nodemon 3.1.11 - File watching and auto-restart (backend dev)
- TailwindCSS PostCSS 4.1.18 - CSS processing
- Autoprefixer 10.4.22 - Browser prefix support
- Lightweight Charts 5.0.9 - Price visualization library

## Key Dependencies

**Critical (Core Functionality):**
- `@solana/web3.js` 1.98.4 - Solana blockchain interaction (wallet, transactions, RPC)
- `@solana/spl-token` 0.4.14 - Solana Token Program support
- `@coral-xyz/anchor` 0.32.1 - Anchor IDL client and program interactions
- `socket.io` 4.8.1 / `socket.io-client` 4.8.1 - Real-time game state and price updates
- `better-sqlite3` 12.5.0 - Fast SQLite database (backend persistence)
- `pg` 8.16.3 - PostgreSQL client (user profiles and waitlist)
- `redis` 5.10.0 - Redis client (caching and session store)

**Wallet & Authentication:**
- `@solana/wallet-adapter-base` 0.9.27 - Base wallet adapter interface
- `@solana/wallet-adapter-react` 0.15.39 - React hooks for wallet connection
- `@solana/wallet-adapter-react-ui` 0.9.39 - Pre-built wallet UI components
- `@solana/wallet-adapter-wallets` 0.19.37 - Phantom, Solflare, and other wallet implementations
- `jsonwebtoken` 9.0.3 - JWT token creation and verification
- `tweetnacl` 1.0.3 - Solana signature verification (Ed25519)
- `bs58` 6.0.0 - Base58 encoding/decoding (Solana addresses and keys)

**Utilities:**
- `dotenv` 17.2.3 - Environment variable loading
- `helmet` 8.1.0 - Security headers middleware
- `cors` 2.8.5 - Cross-Origin Resource Sharing
- `cookie-parser` 1.4.7 - Cookie parsing middleware
- `uuid` 13.0.0 - Unique identifier generation
- `lucide-react` 0.561.0 - Icon library (UI components)
- `clsx` 2.1.1 - Conditional className utility
- `class-variance-authority` 0.7.1 - Type-safe CSS variant management
- `tailwind-merge` 3.4.0 - Merge Tailwind class conflicts
- `tailwindcss-animate` 1.0.7 - Animation utilities

**Development:**
- `autoprefixer` 10.4.22 - Browser vendor prefixes
- `postcss` 8.5.6 - CSS transformation pipeline
- `eslint` (implied by Next.js) - Linting
- `@types/*` packages - TypeScript definitions for all dependencies

## Configuration

**Environment Variables:**

Frontend (`web/`):
- `NEXT_PUBLIC_BACKEND_URL` - Backend API endpoint (http://localhost:3001 dev, production URL for prod)
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Solana RPC endpoint (devnet or mainnet)
- `NEXT_PUBLIC_COMING_SOON` - Feature flag for coming-soon mode
- `NEXT_PUBLIC_USE_ON_CHAIN` - Enable on-chain smart contract calls
- `NEXT_PUBLIC_WHITELISTED_WALLETS` - Comma-separated whitelist for early access
- `WHITELIST_SECRET` - Signing secret for whitelist tokens

Backend (`backend/`):
- `PORT` - Server port (default 3001)
- `NODE_ENV` - Environment (development, production)
- `DATABASE_URL` - PostgreSQL connection string (for user profiles)
- `SOLANA_RPC_URL` - Solana RPC endpoint for on-chain calls
- `SESSION_BETTING_AUTHORITY_PRIVATE_KEY` - Base58 private key (controls smart contract state)
- `ESCROW_WALLET_PRIVATE_KEY` - Base58 private key (holds user deposits)
- `REBATE_WALLET_PRIVATE_KEY` - Base58 private key (pays out rebates)
- `BATTLE_AUTHORITY_PRIVATE_KEY` - Base58 private key (battle program authority)
- `CMC_API_KEY` - CoinMarketCap API key (memecoin price fallback)
- `HELIUS_API_KEY` - Helius RPC API key (enhanced Solana indexing)
- `FRONTEND_URL` - Frontend origin for CORS and redirects
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `JWT_SECRET` - Signing secret for JWT tokens
- `REQUIRE_WALLET_SIGNATURES` - Boolean: require wallet signatures on authenticated endpoints
- `DISABLE_SIMULATOR` - Boolean: disable battle simulator for testing

Shared:
- `.env.local` - Local development overrides
- `.env.production` - Production values
- `.env.example` - Template for required variables

**Build Configuration:**
- `web/tsconfig.json` - Next.js TypeScript config (target ES2017, strict mode)
- `backend/tsconfig.json` - Node.js TypeScript config (target ES2020, CommonJS modules)
- `web/next.config.js` - Next.js configuration (App Router, Turbopack)
- `postcss.config.js` - PostCSS configuration for Tailwind
- `tailwind.config.js` - Custom theme (Wasteland palette, custom colors)
- `jest.config.js` - Jest test runner configuration (both projects)
- `programs/session_betting/Cargo.toml` - Rust workspace configuration

## Platform Requirements

**Development:**
- Node.js 22.0.0+ (specified in `package.json` `engines` field)
- Rust toolchain (for smart contract development)
- Anchor CLI 0.32.1 (for Solana program deployment)
- Solana CLI (for wallet management and RPC interaction)
- Git (version control)
- Docker (optional, for PostgreSQL/Redis in development)

**Production:**
- **Frontend Deployment:** Vercel (Next.js hosting with automatic deployments)
- **Backend Deployment:** Render.com or similar Node.js host (backend runs on port 3001)
- **Database:** PostgreSQL (for user profiles, waitlist, user stats)
- **Cache:** Redis (optional, for session and rate-limit caching)
- **Blockchain:** Solana Devnet or Mainnet RPC endpoint
- **Smart Contracts:** Deployed to Solana (Session Betting: `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`)

## Smart Contract Environment

**Anchor Framework:**
- Version: 0.32.1
- Target: Solana Devnet (development)
- Programs:
  - `programs/session_betting/` - Main PDA balance and Oracle round management
  - `programs/prediction_program/` - Legacy Oracle betting program
  - `programs/battle_program/` - Legacy PvP battle program
  - `programs/draft_program/` - Draft tournament program

**Rust Dependencies:**
- `anchor-lang` 0.32.1 - Anchor framework macros and types
- `pyth-sdk-solana` - Pyth Network oracle verification (on-chain)
- `spl-token` - Token program interactions

**Build Output:**
- WASM binaries in `.so` format
- IDLs for program ABIs (used by frontend and backend clients)

---

*Stack analysis: 2026-01-21*
