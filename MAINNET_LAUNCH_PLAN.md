# DegenDome Mainnet Launch Plan

> Comprehensive checklist for transitioning from Solana Devnet to Mainnet

---

## Table of Contents

1. [Pre-Launch Checklist](#pre-launch-checklist)
2. [Smart Contract Deployment](#smart-contract-deployment)
3. [Backend Changes](#backend-changes)
4. [Frontend Changes](#frontend-changes)
5. [Infrastructure & Services](#infrastructure--services)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Observability](#monitoring--observability)
8. [Launch Day Procedure](#launch-day-procedure)
9. [Rollback Plan](#rollback-plan)
10. [Cost Estimates](#cost-estimates)

---

## Pre-Launch Checklist

### Code Freeze & Review
- [ ] Internal security review of smart contract
- [ ] Code freeze 1 week before launch
- [ ] Final internal review of all changes
- [ ] **Note**: Third-party audit deferred until post-revenue (see Post-Launch section)

### Testing
- [ ] Full end-to-end testing on devnet
- [ ] Load testing (simulate 100+ concurrent users)
- [ ] Test all game modes: Oracle, Battle, Draft, Spectate, LDS, Token Wars
- [ ] Test deposit/withdraw flow thoroughly
- [ ] Test session key creation and expiry
- [ ] Test edge cases (insufficient funds, network errors, etc.)

### Legal & Compliance
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized
- [ ] Geo-blocking for restricted regions (if applicable)
- [ ] Age verification (if required)

---

## Smart Contract Deployment

### 1. Deploy Session Betting Program to Mainnet

```bash
cd programs/session_betting

# Build for mainnet
anchor build

# Deploy to mainnet (requires SOL in deployer wallet)
anchor deploy --provider.cluster mainnet-beta

# Note the new Program ID!
```

**New Program ID**: `___________________` (fill in after deployment)

### 2. Initialize Game State

```bash
# Initialize with mainnet Pyth SOL/USD price feed
# SOL/USD Pyth Price Feed ID (mainnet): H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG
```

### 3. Update Program ID References

**Files to update with new mainnet Program ID:**

| File | Line | Current |
|------|------|---------|
| `backend/src/services/onChainRoundManager.ts` | 27 | `SESSION_BETTING_PROGRAM_ID` |
| `backend/src/services/predictionServiceOnChain.ts` | 31 | `SESSION_BETTING_PROGRAM_ID` |
| `backend/src/services/balanceService.ts` | ~20 | Program ID constant |
| `web/src/lib/session-betting/client.ts` | ~15 | Program ID constant |
| `web/src/lib/session-betting/types.ts` | ~5 | `PROGRAM_ID` export |
| `README.md` | 239 | Documentation |
| `CLAUDE.md` | ~10 | Documentation |

### 4. Authority Setup (CRITICAL)

**Current**: Single authority wallet

**Recommended for Mainnet**: Multi-sig (Squads Protocol)

```
Squads Multi-sig Setup:
- Create 3-of-5 multi-sig (recommended)
- Members: Core team members with hardware wallets
- Transfer program authority to multi-sig
- Test multi-sig signing flow before launch
```

**Authority Transfer Procedure:**
```rust
// 1. Propose new authority (from current authority)
propose_authority(new_authority: multisig_address)

// 2. Accept from new authority (requires multi-sig signing)
accept_authority()
```

### 5. Pyth Price Feeds (Mainnet)

Update price feed IDs from devnet to mainnet:

| Asset | Devnet Price Feed | Mainnet Price Feed |
|-------|-------------------|-------------------|
| SOL/USD | `J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix` | `H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG` |
| BTC/USD | `HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J` | `GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU` |
| ETH/USD | `EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw` | `JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB` |

**Files to update:**
- `backend/src/services/onChainRoundManager.ts` (lines 36-42)
- `backend/src/services/predictionServiceOnChain.ts` (lines 46-53)
- `backend/src/services/pythVerificationService.ts` (lines 31+)

---

## Backend Changes

### 1. Environment Variables

Update `.env.production`:

```bash
# ===================
# MAINNET CONFIGURATION
# ===================

# Server
NODE_ENV=production
PORT=3001

# Solana RPC (Carbium - already have access)
SOLANA_RPC_URL=https://your-carbium-mainnet-rpc-url

# Program ID (update after mainnet deployment)
SESSION_BETTING_PROGRAM_ID=NEW_MAINNET_PROGRAM_ID

# Authority Keys (SECURE THESE!)
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=your_mainnet_authority_key
ESCROW_WALLET_PRIVATE_KEY=your_mainnet_escrow_key
REBATE_WALLET_PRIVATE_KEY=your_mainnet_rebate_key

# Database (PostgreSQL for production)
DATABASE_URL=postgresql://user:password@host:5432/degendome_prod

# API Keys
CMC_API_KEY=your_key
HELIUS_API_KEY=your_helius_key

# CORS
ALLOWED_ORIGINS=https://www.degendome.xyz,https://degendome.xyz

# Security
JWT_SECRET=generate_new_64_byte_hex_secret
REQUIRE_WALLET_SIGNATURES=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Code Changes

**Remove devnet fallbacks:**

```typescript
// BEFORE (bad for mainnet)
const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// AFTER (fail loudly if not configured)
const rpcUrl = process.env.SOLANA_RPC_URL;
if (!rpcUrl) throw new Error('SOLANA_RPC_URL not configured');
```

**Files to update:**
- `src/services/balanceService.ts` (line 60)
- `src/services/predictionServiceOnChain.ts` (line 100)
- `src/services/onChainRoundManager.ts` (line 36)
- `src/services/rakeRebateService.ts` (line 80)
- `src/services/freeBetEscrowService.ts` (line 202)
- `src/services/battleSettlementService.ts` (line 36)
- `src/services/pythVerificationService.ts` (line 104)

### 3. Database Migration

**Current**: SQLite (fine for devnet)
**Mainnet**: PostgreSQL (required for production)

Migration steps:
1. Set up PostgreSQL on Render or Supabase
2. Update database connection code
3. Run migration scripts
4. Verify data integrity

---

## Frontend Changes

### 1. Environment Variables

Update Vercel environment variables:

```bash
# Production Environment Variables (Vercel Dashboard)
NEXT_PUBLIC_BACKEND_URL=https://api.degendome.xyz
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-carbium-mainnet-rpc-url
NEXT_PUBLIC_PROGRAM_ID=NEW_MAINNET_PROGRAM_ID
NEXT_PUBLIC_COMING_SOON=false
NEXT_PUBLIC_USE_ON_CHAIN=true
```

### 2. Code Changes

**Fix hardcoded devnet explorer links:**

```typescript
// File: web/src/components/BattleArena.tsx

// BEFORE (lines 693, 744)
href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}

// AFTER (use environment-aware helper)
href={`https://explorer.solana.com/tx/${txSignature}`}
// OR create helper:
const getExplorerUrl = (tx: string) => {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
    ? '?cluster=devnet'
    : '';
  return `https://explorer.solana.com/tx/${tx}${cluster}`;
};
```

**Update WalletProvider.tsx:**
```typescript
// Remove devnet fallback
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
if (!rpcUrl) throw new Error('RPC URL not configured');
```

### 3. Program ID Update

**Files to update:**
- `web/src/lib/session-betting/types.ts`
- `web/src/lib/session-betting/client.ts`
- Any hardcoded references

---

## Infrastructure & Services

### 1. RPC Provider (CRITICAL)

**Do NOT use public RPC for mainnet!** You will get rate limited.

**Current Setup**: Carbium RPC (already have access)

| Provider | Status | Cost/Month |
|----------|--------|------------|
| **Carbium** | Already have | $0 (existing) |

**Action Items:**
- [ ] Get mainnet RPC URL from Carbium
- [ ] Test rate limits are sufficient for expected traffic
- [ ] Set up monitoring for RPC errors/rate limits

### 2. Vercel (Frontend Hosting)

**Current**: Free tier (likely)

**Mainnet Requirements:**
- Custom domain SSL
- More serverless function invocations
- Better analytics

| Plan | Cost/Month | Features |
|------|------------|----------|
| **Pro** | $20 | 1TB bandwidth, preview deployments, analytics |
| **Team** | $20/user | Collaboration, audit logs |

**Recommendation**: Pro plan ($20/mo)

### 3. Render (Backend Hosting)

**Current**: Free or Starter tier (likely)

**Mainnet Requirements:**
- Zero cold starts (users can't wait 30s for server to wake)
- More RAM for concurrent connections
- Health checks

| Plan | Cost/Month | Features |
|------|------------|----------|
| **Starter** | $7 | 512MB RAM, always on |
| **Standard** | $25 | 2GB RAM, better CPU |
| **Pro** | $85 | 4GB RAM, priority support |

**Recommendation**: Standard ($25/mo) - upgrade to Pro if seeing memory issues

### 4. Database (PostgreSQL)

**Options:**

| Provider | Plan | Cost/Month | Storage |
|----------|------|------------|---------|
| **Render PostgreSQL** | Starter | $7 | 1GB |
| **Supabase** | Pro | $25 | 8GB |
| **Neon** | Launch | $19 | 10GB |

**Recommendation**: Render PostgreSQL Starter ($7/mo) - same provider as backend

### 5. Domain & CDN

**Current**: Vercel handles this

**Optional Upgrades:**
- Cloudflare Pro ($20/mo) - DDoS protection, better caching
- Custom email (Google Workspace $6/user/mo)

### 6. Monitoring & Alerts

| Service | Plan | Cost/Month | Purpose |
|---------|------|------------|---------|
| **Sentry** | Team | $26 | Error tracking |
| **Datadog** | Free | $0 | Basic APM |
| **Better Uptime** | Free | $0 | Uptime monitoring |

**Recommendation**: Sentry Team ($26/mo) + Better Uptime (free)

---

## Security Hardening

### 1. Smart Contract Security
- [ ] Internal security review (third-party audit deferred to post-revenue)
- [ ] Transfer authority to multi-sig
- [ ] Set up monitoring for unusual activity
- [ ] Document emergency procedures
- [ ] Start with conservative bet limits, increase gradually

### 2. Backend Security
- [ ] Enable `REQUIRE_WALLET_SIGNATURES=true`
- [ ] Review rate limiting configuration
- [ ] Set up WAF rules (Cloudflare)
- [ ] Rotate all API keys and secrets
- [ ] Enable database encryption at rest

### 3. Key Management
- [ ] Store authority keys in hardware wallets
- [ ] Use environment secrets (not .env files in production)
- [ ] Set up key rotation procedure
- [ ] Document key recovery process

### 4. Operational Security
- [ ] Enable 2FA on all service accounts
- [ ] Restrict admin access to production
- [ ] Set up audit logging
- [ ] Create incident response playbook

---

## Monitoring & Observability

### 1. Application Monitoring

**Sentry Setup:**
```bash
# Backend
npm install @sentry/node

# Frontend
npm install @sentry/nextjs
```

### 2. Uptime Monitoring

**Better Uptime (free):**
- Monitor: `https://www.degendome.xyz`
- Monitor: `https://api.degendome.xyz/api/health`
- Alert via: Email, Slack, SMS

### 3. On-Chain Monitoring

**Helius Webhooks:**
- Monitor program account changes
- Alert on large withdrawals
- Track transaction failures

### 4. Alerts to Set Up

| Alert | Threshold | Action |
|-------|-----------|--------|
| API Error Rate | >5% | Page on-call |
| Response Time | >2s avg | Investigate |
| Failed Transactions | >10/hour | Investigate |
| Low Authority Balance | <1 SOL | Fund immediately |
| Uptime | <99.5% | Incident response |

---

## Launch Day Procedure

### T-7 Days: Final Prep
- [ ] Freeze all code changes
- [ ] Complete final testing on devnet
- [ ] Prepare all mainnet environment variables
- [ ] Fund mainnet wallets (authority, escrow, etc.)
- [ ] Notify users of upcoming maintenance

### T-1 Day: Pre-Launch
- [ ] Deploy smart contract to mainnet
- [ ] Initialize game state with correct Pyth feeds
- [ ] Verify contract on explorer
- [ ] Test deposit/withdraw with small amounts
- [ ] Prepare rollback scripts

### Launch Day (T-0)
```
08:00 - Put site in maintenance mode
08:15 - Deploy backend with mainnet config
08:30 - Verify backend health
08:45 - Deploy frontend with mainnet config
09:00 - Internal team testing
09:30 - Gradual rollout (whitelist first)
10:00 - Full public launch
10:00+ - Monitor closely for 24 hours
```

### Post-Launch
- [ ] Monitor error rates and performance
- [ ] Watch for unusual transaction patterns
- [ ] Be ready to pause if issues found
- [ ] Collect user feedback
- [ ] Plan post-launch improvements

---

## Rollback Plan

### Scenario 1: Smart Contract Issue

**If critical bug found in contract:**
1. Pause the program immediately
2. Communicate to users (Twitter, Discord, in-app banner)
3. Assess damage and recovery options
4. Deploy patched contract if possible
5. Migrate user funds if necessary

**Pause Command:**
```rust
set_paused(true)  // Requires authority signature
```

### Scenario 2: Backend Issue

**If backend is failing:**
1. Roll back to previous Render deployment
2. Verify health endpoints
3. Investigate logs
4. Deploy fix when ready

**Render Rollback:**
```
Dashboard > Service > Deploys > Previous > "Rollback to this deploy"
```

### Scenario 3: Frontend Issue

**If frontend is broken:**
1. Roll back in Vercel dashboard
2. Verify site loads
3. Investigate and fix
4. Redeploy

**Vercel Rollback:**
```
Dashboard > Project > Deployments > Previous > "Instant Rollback"
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| Smart Contract | [Your name] |
| Backend | [Your name] |
| Frontend | [Your name] |
| RPC Provider | Helius support |
| Hosting | Render/Vercel support |

---

## Cost Estimates

### Monthly Infrastructure Costs

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Carbium RPC | Already have | $0 |
| Vercel | Pro | $20 |
| Render (Backend) | Standard | $25 |
| Render (Database) | Starter | $7 |
| Sentry | Team | $26 |
| **Total** | | **$78/mo** |

### Optional Additions

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Pro | $20 | DDoS protection |
| Better monitoring | $50-100 | Datadog, etc. |

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Mainnet SOL (deployment) | ~2-5 SOL | Contract deployment |
| Authority funding | 10+ SOL | For transaction fees |
| Multi-sig setup | ~0.1 SOL | Squads protocol |

### Post-Revenue (Deferred)

| Item | Cost | Notes |
|------|------|-------|
| Security Audit | $10k-50k | OtterSec, Neodyme, or Sec3 |

---

## Summary Checklist

### Must Have (P0)
- [ ] Smart contract deployed to mainnet
- [ ] Multi-sig authority set up
- [ ] Carbium RPC configured for mainnet
- [ ] All environment variables updated
- [ ] Hardcoded devnet references removed
- [ ] Internal security review completed
- [ ] Monitoring and alerts configured

### Should Have (P1)
- [ ] PostgreSQL database migration
- [ ] Comprehensive error tracking (Sentry)
- [ ] Load testing completed
- [ ] Conservative bet limits at launch

### Nice to Have (P2)
- [ ] Cloudflare DDoS protection
- [ ] Mobile-responsive improvements
- [ ] Performance optimization

### Post-Revenue (P3)
- [ ] Third-party security audit ($10k-50k)
- [ ] Enhanced analytics
- [ ] Additional monitoring tools

---

*Last Updated: January 2026*
*Document Owner: Tayler Melvin*
