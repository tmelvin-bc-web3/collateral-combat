# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Blockchain & Oracles:**
- **Solana RPC** - Primary blockchain connection
  - Dev: https://api.devnet.solana.com (devnet testing)
  - Prod: https://api.mainnet-beta.solana.com (mainnet)
  - Also supports custom RPC (Helius, QuickNode, etc.)
  - Client: `@solana/web3.js` Connection instance in backend and frontend

- **Pyth Network** - Tamper-proof price oracle for Oracle predictions
  - Service: https://hermes.pyth.network/v2/updates/price/latest
  - Usage: Real-time price feeds for SOL, BTC, ETH, JUP, RAY, JTO, WIF, BONK, and 20+ memecoins
  - Feed IDs: Defined in `backend/src/services/priceService.ts` (PYTH_FEED_IDS map)
  - Integration: `backend/src/services/pythVerificationService.ts` handles on-chain price verification
  - Fallback: Enabled (switches to CMC if Pyth unavailable)

- **Jupiter Price API** - Token swap and price information
  - Service: Jupiter Protocol API endpoints
  - Usage: Alternative price source for trading battle assets
  - Integration: Used by `backend/src/services/priceService.ts`

**Price & Market Data:**
- **CoinMarketCap (CMC)** - Memecoin and token pricing (fallback)
  - API: https://pro-api.coinmarketcap.com/v1
  - Key: Stored in `CMC_API_KEY` environment variable
  - Usage: Fetches memecoin prices for Draft tournaments, price history
  - Service: `backend/src/services/coinMarketCapService.ts`
  - Endpoints:
    - `/cryptocurrency/listings/latest` - Latest memecoin listings
    - `/cryptocurrency/quotes/latest` - Current prices for specific coins

## Data Storage

**Databases:**

**PostgreSQL (Primary - User Data):**
- Connection: `DATABASE_URL` (production connection string)
- Location: `backend/src/db/database.ts` (Pool initialization)
- Client: `pg` (node-postgres) with connection pooling
- SSL: Enabled in production (`rejectUnauthorized: true`)
- Tables:
  - `user_profiles` - Usernames, PFPs, NFT metadata
  - User authentication/session data
  - User statistics and rankings
  - Waitlist and early access data
- Purpose: Persistent user identity and profile data

**SQLite (Secondary - Game State):**
- Location: `backend/data/` (multiple .db files)
- Client: `better-sqlite3` for synchronous access
- Files:
  - `progression.db` - XP, levels, perks, cosmetics, achievements
  - `draftDatabase.db` - Draft tournament entries and picks
  - `battleDatabase.db` - Completed battle records
  - `spectatorBets.db` - Spectator wagering history
  - `ldsDatabase.db` - Last Degen Standing game state
  - `tokenWarsDatabase.db` - Token Wars battle state
  - `userStats.db` - Win/loss records, statistics
  - `notifications.db` - User notifications
- Purpose: Fast, local game state without network latency

**File Storage:**
- Approach: Local filesystem only (no cloud storage)
- Profile pictures: User-provided NFT URLs or preset avatars
- Game replays/data: Not persisted to cloud storage

**Caching:**

**Redis (Optional):**
- Connection: Not mandatory; used if configured
- Client: `redis` npm package (v5.10.0)
- Usage (if enabled):
  - Session store (JWT tokens)
  - Rate-limit counters (per-wallet, per-IP)
  - Real-time game state cache
  - Price update batching
- Current: Not required for development (in-memory cache used instead)
- Fallback: In-memory Map and Set objects in `backend/src/index.ts` for rate limiting

**In-Memory Caching:**
- Price cache: `Map<string, number>` updated every 100ms
- Battle state: Ephemeral, stored in `battleManager` service
- Session tracking: `usedSignatures` Map for signature replay protection
- Rate limits: `Map<string, RateLimit>` for DDoS prevention

## Authentication & Identity

**Auth Provider:**
- Custom implementation (no third-party OAuth)
- Approach: Solana wallet signature verification
- Method: Ed25519 signature verification using `tweetnacl`

**Wallet Integration:**
- **Supported Wallets:** Phantom, Solflare, and all Solana Wallet Standard adapters
- SDK: `@solana/wallet-adapter-react` (frontend)
- Flow:
  1. User connects wallet via `WalletProvider` context
  2. Frontend creates JWT token via signed message
  3. Backend verifies signature with `tweetnacl.sign.detached.verify()`
  4. JWT token passed in Socket.IO auth headers and API calls
  5. Server validates token and associates socket with wallet

**JWT Implementation:**
- Location: `backend/src/utils/jwt.ts`
- Secret: `JWT_SECRET` environment variable (required in production)
- Payload: Contains wallet address and issued timestamp
- Verification: Synchronous verification in middleware (`verifyTokenSync`)
- Expiry: Not explicitly time-limited in current implementation (should add)

**Session Keys (On-Chain):**
- Purpose: Frictionless betting without wallet popups
- Implementation: Smart contract PDA accounts that can bet but NOT withdraw
- Time Limit: 24 hours per session key
- Validation: `backend/src/services/balanceService.ts` verifies on-chain PDA balance

**Whitelist:**
- Location: `web/src/config/whitelist.ts`
- Hardcoded wallet addresses for early access
- Bypass: Users in whitelist skip "coming-soon" mode
- Signature-based: Signed whitelist tokens verify membership
- Updated via: Environment variable `NEXT_PUBLIC_WHITELISTED_WALLETS` (comma-separated)

**Security Features:**
- Signature replay protection: `backend/src/utils/replayCache.ts` (5-minute window)
- Used signatures stored in Map with expiry timestamps
- Wallet signatures required for sensitive operations (deposits, withdrawals)
- CORS restricted to allowed origins (whitelist in backend)
- Rate limiting: Per-wallet and per-IP enforcement

## Monitoring & Observability

**Error Tracking:**
- Approach: Logging to console and event-based tracking
- Service: `backend/src/services/pythVerificationService.ts` records price audit logs
- Not integrated with third-party error tracking (Sentry, DataDog, etc.)
- In-process: Error events logged but not aggregated

**Logs:**
- Console-based: Backend logs to stdout (collected by hosting platform)
- Structured: Some logs include context (round ID, wallet address, amounts)
- Format: Prefix-based [ServiceName] pattern
- Examples:
  - `[PredictionServiceOnChain] Round started | startPrice: $X | startTime: $Y`
  - `[AdminService] Admin dashboard accessed by $wallet`
  - `[Socket] Connected/Disconnected events logged`
- Real-time: Logs visible during `npm run dev`
- Production: Captured by Render.com (backend) and Vercel (frontend) logging systems

**Monitoring:**
- Admin dashboard: `backend/src/routes/admin.ts` exposes metrics endpoint
- Metrics tracked:
  - Active socket connections
  - Total wagers and volume
  - Battle statistics
  - Prediction round statistics
  - User progression summaries
- Rate limiting: Monitored via in-memory counters

## CI/CD & Deployment

**Hosting:**
- **Frontend:** Vercel (automatic deployments on push to main/feature branches)
- **Backend:** Render.com or similar Node.js platform (manual deployment)
- **Smart Contracts:** Deployed via Anchor CLI to Solana Devnet or Mainnet

**CI Pipeline:**
- Build verification: TypeScript compilation (`tsc --noEmit`)
- Testing: Jest tests run locally before commit
- Linting: Next.js built-in ESLint checks
- Deployment: Manual via Vercel CLI (`vercel --prod --yes`)
- No automated GitHub Actions pipeline configured

**Deployment Process:**
- **Frontend:**
  ```bash
  cd web
  vercel --prod --yes  # Deploys to degendome.xyz
  ```
- **Backend:**
  - Render dashboard: Manual redeploy from git
  - Environment: Set `DATABASE_URL`, `SOLANA_RPC_URL`, API keys in Render
  - Port: 3001 exposed to production

- **Smart Contracts:**
  ```bash
  cd programs/session_betting
  anchor build
  anchor deploy --provider.cluster devnet  # or mainnet
  ```

**Environment Configuration:**
- Frontend: `.env.local` (dev), `.env.production` (prod)
- Backend: `.env` file (see `.env.example`)
- Smart contracts: Configured via `Anchor.toml` and RPC URL

## Webhooks & Callbacks

**Incoming:**
- None configured - system is pull-based (Socket.IO polling)
- Solana event listening: Can be added for on-chain account change subscriptions

**Outgoing:**
- None currently (would require external service registration)
- Notifications: Delivered via Socket.IO, not webhooks

**WebSocket Events (Real-Time Push):**

Location: `web/src/lib/socket.ts` defines all ServerToClientEvents

Major events:
- `battle_update` - Battle state changes
- `prediction_round` - New Oracle round started
- `prediction_settled` - Round result with payouts
- `price_update` - Price changes (batch update every 100ms)
- `progression_update` - User XP/level changes
- `draft_tournament_update` - Draft state changes
- `odds_update` - Spectator odds recalculation
- `xp_gained` - XP earned notification
- `level_up` - Level milestone achieved
- `chat_message` - Battle chat messages
- `lds_event` - Last Degen Standing game events
- `token_wars_event` - Token Wars betting events

**Event Subscriptions:**
```typescript
// Client subscribes to events
socket.emit('subscribe_prediction', 'SOL');
socket.emit('subscribe_live_battles');
socket.emit('subscribe_progression', walletAddress);

// Server broadcasts to subscribed clients
socket.on('prediction_round', (round) => {
  // Handle new Oracle round
});
```

## Rate Limiting

**Implementation:** `backend/src/middleware/rateLimiter.ts`

Strategies:
- **Global Limiter:** 100 requests per minute (all endpoints)
- **Standard Limiter:** 30 requests per minute (most endpoints)
- **Strict Limiter:** 10 requests per minute (sensitive endpoints like wallet operations)
- **Write Limiter:** 5 operations per minute (state-changing operations)
- **Burst Limiter:** 50 requests per 10 seconds (for traffic spikes)
- **Pyth Limiter:** 2 requests per second (oracle price fetching)
- **Socket Rate Limiting:** Per-wallet and per-socket enforcement

Rate limit keys:
- Global: IP address
- Per-wallet: Wallet address + operation type
- Per-socket: Socket ID

---

*Integration audit: 2026-01-21*
