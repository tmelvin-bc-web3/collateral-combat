# Mainnet Deployment Guide

**Last updated:** 2026-01-22
**Status:** Ready for mainnet deployment
**Program ID (devnet):** 4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All Phase 1-4 plans completed
- [ ] TypeScript compiles without errors (`npx tsc --noEmit` in web/ and backend/)
- [ ] No console.log statements in production code
- [ ] All environment variables documented
- [ ] Structured logging implemented
- [ ] Error alerting configured
- [ ] Health checks (/livez, /readyz) operational

### Security

- [ ] No hardcoded secrets in codebase (`git grep -i password`, `git grep -i private`)
- [ ] Authority wallet private key secured (hardware wallet or secure storage)
- [ ] Admin wallet list configured (ADMIN_WALLETS env var)
- [ ] Rate limiting enabled on backend
- [ ] CORS configured for production domain only
- [ ] Session key expiration tested (24-hour limit)
- [ ] Replay attack protection verified (signature caching)
- [ ] Emergency pause functionality tested on devnet

### Infrastructure

- [ ] Render backend provisioned for production (Standard instance or higher)
- [ ] Vercel frontend configured for production domain
- [ ] DNS configured (degendome.xyz pointing to Vercel)
- [ ] SSL certificates active (automatic via Vercel/Render)
- [ ] Discord webhook URL set for alerts (DISCORD_WEBHOOK_URL)
- [ ] PostgreSQL database provisioned (for waitlist, progression, balance tracking)
- [ ] Database backups configured
- [ ] Monitoring dashboard accessible (/admin/metrics)

### Solana Program

- [ ] Program tested on devnet with real transactions
- [ ] Authority wallet has sufficient SOL for deployment (~5-10 SOL for program, ~2 SOL buffer)
- [ ] Program upgrade authority decision made (immutable or upgradeable?)
- [ ] Emergency pause functionality tested
- [ ] Pyth oracle integration verified (SOL/USD price feed working)
- [ ] All instruction tests passing (`anchor test`)
- [ ] Rent calculations verified (round PDAs, player positions)
- [ ] Global vault balance monitoring in place

---

## Environment Variables

### Backend (Render)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `production` | Yes |
| `PORT` | Server port | `3001` | Yes |
| `SOLANA_RPC_URL` | Mainnet RPC | `https://api.mainnet-beta.solana.com` or premium RPC | Yes |
| `SESSION_BETTING_AUTHORITY_PRIVATE_KEY` | Program authority (base58) | [REDACTED] | Yes |
| `ALLOWED_ORIGINS` | CORS origins | `https://degendome.xyz,https://www.degendome.xyz` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Yes |
| `LOG_LEVEL` | Logging level | `info` | Yes |
| `DISCORD_WEBHOOK_URL` | Alert webhook | `https://discord.com/api/webhooks/...` | Recommended |
| `ADMIN_WALLETS` | Admin wallet addresses (comma-separated) | `wallet1,wallet2` | Yes |
| `CMC_API_KEY` | CoinMarketCap API key (for memecoin data) | `your_cmc_api_key` | Optional |
| `HELIUS_API_KEY` | Helius API key (enhanced RPC features) | `your_helius_key` | Optional |
| `ESCROW_WALLET_PRIVATE_KEY` | Escrow wallet for off-chain games | [REDACTED] | Yes |
| `REBATE_WALLET_PRIVATE_KEY` | Rebate wallet for rake rebates | [REDACTED] | Yes |
| `BATTLE_AUTHORITY_PRIVATE_KEY` | Battle program authority | [REDACTED] | Yes |
| `JWT_SECRET` | Session token secret | `generate_with_crypto_randomBytes` | Yes |
| `REQUIRE_WALLET_SIGNATURES` | Enforce wallet signatures | `true` | Yes |

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend (Vercel)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL | `https://api.degendome.xyz` | Yes |
| `NEXT_PUBLIC_RPC_URL` | Solana RPC URL | `https://api.mainnet-beta.solana.com` or premium | Yes |
| `NEXT_PUBLIC_PROGRAM_ID` | Session Betting Program ID | `[MAINNET_PROGRAM_ID]` | Yes |
| `NEXT_PUBLIC_PYTH_PRICE_FEED` | Pyth SOL/USD feed address | `H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG` | Yes |

**Mainnet Pyth Price Feeds:**
- SOL/USD: `H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG`
- BTC/USD: `GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU`
- ETH/USD: `JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB`

---

## Deployment Steps

### Phase 1: Deploy Solana Program

**IMPORTANT:** Test this process on devnet first with `./scripts/deploy-mainnet.sh devnet`

**Option A: New deployment (fresh program ID)**

```bash
# 1. Build the program
cd programs/session_betting
anchor build

# 2. Generate new program keypair (SAVE THIS SECURELY!)
solana-keygen new -o target/deploy/session_betting-keypair.json

# 3. Check authority wallet balance
solana balance --keypair ~/.config/solana/authority.json --url mainnet-beta

# 4. Verify program size and estimated cost
solana program show --programs --url mainnet-beta  # See typical costs
ls -lh target/deploy/session_betting.so  # Check program size

# 5. Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# 6. Record new program ID (CRITICAL - NEEDED FOR FRONTEND)
PROGRAM_ID=$(solana-keygen pubkey target/deploy/session_betting-keypair.json)
echo "New Program ID: $PROGRAM_ID"

# 7. Verify deployment
solana program show $PROGRAM_ID --url mainnet-beta

# 8. Initialize program state
anchor run initialize --provider.cluster mainnet-beta
```

**Option B: Upgrade existing program (same program ID)**

```bash
# Only works if upgrade authority is set
anchor upgrade target/deploy/session_betting.so \
  --program-id [EXISTING_PROGRAM_ID] \
  --provider.cluster mainnet-beta
```

**Security Note:** After mainnet deployment, consider:
- Setting upgrade authority to null (makes program immutable)
- Using multi-sig for upgrade authority
- Gradual rollout with feature flags

### Phase 2: Configure Backend

1. **Set environment variables in Render:**
   - Navigate to Render Dashboard → Your Service → Environment
   - Set all production environment variables (see table above)
   - Set `SOLANA_RPC_URL` to mainnet (preferably premium RPC)
   - Update `SESSION_BETTING_AUTHORITY_PRIVATE_KEY` to mainnet authority
   - Set `DISCORD_WEBHOOK_URL` for production alerts
   - Update `ALLOWED_ORIGINS` to production domains

2. **Deploy backend:**
   ```bash
   # Option 1: Git-based deploy (automatic)
   git push origin main  # Triggers Render auto-deploy

   # Option 2: Manual deploy via Render dashboard
   # Dashboard → Manual Deploy → Deploy Latest Commit
   ```

3. **Verify backend deployment:**
   ```bash
   # Health checks
   curl https://api.degendome.xyz/livez
   # Expected: {"status":"alive","uptime":123}

   curl https://api.degendome.xyz/readyz
   # Expected: {"status":"ready","database":"connected","solana":"connected"}

   # Admin metrics (requires auth)
   curl https://api.degendome.xyz/api/admin/metrics
   ```

4. **Monitor logs:**
   ```bash
   # Render Dashboard → Logs
   # Watch for startup errors, database connection, Solana RPC connection
   ```

### Phase 3: Configure Frontend

1. **Update Vercel environment variables:**
   - Vercel Dashboard → Project Settings → Environment Variables
   - Set `NEXT_PUBLIC_BACKEND_URL` to production backend
   - Set `NEXT_PUBLIC_RPC_URL` to mainnet RPC
   - Set `NEXT_PUBLIC_PROGRAM_ID` to mainnet program ID
   - Set `NEXT_PUBLIC_PYTH_PRICE_FEED` to mainnet Pyth feed
   - Apply to Production environment

2. **Deploy frontend:**
   ```bash
   # From web/ directory
   vercel --prod

   # Or via Git (automatic)
   git push origin main
   ```

3. **Verify frontend deployment:**
   - Visit https://degendome.xyz
   - Connect wallet (Phantom, Solflare)
   - Check that wallet connects successfully
   - Check that balance displays (should be 0 if new wallet)
   - Check console for errors (should be clean)

4. **Smoke test user flow:**
   - Deposit 0.1 SOL
   - Create session key (24h)
   - Place prediction bet (Oracle)
   - Verify bet appears in UI
   - Wait for round to settle
   - Verify winnings/losses credited

### Phase 4: Initialize Program State

```bash
# Initialize the game state (one-time setup)
cd programs/session_betting
anchor run initialize --provider.cluster mainnet-beta

# Verify initialization
anchor account session_betting.GameState --provider.cluster mainnet-beta

# Expected output:
# {
#   "authority": "[YOUR_AUTHORITY_PUBKEY]",
#   "isPaused": false,
#   "roundCounter": 0,
#   "totalFeesCollected": 0
# }
```

---

## Post-Deployment Verification

Run the automated verification script:

```bash
./scripts/verify-deployment.sh mainnet
```

### Manual Verification Checklist

**Backend Health:**
- [ ] `/livez` returns 200 OK
- [ ] `/readyz` returns 200 OK with database and Solana connected
- [ ] WebSocket connects successfully
- [ ] Logs show no errors in past 5 minutes

**Program Verification:**
- [ ] Program deployed: `solana program show [PROGRAM_ID]` shows active
- [ ] GameState initialized: `anchor account session_betting.GameState` returns data
- [ ] Authority matches expected wallet

**Frontend Verification:**
- [ ] Site loads: https://degendome.xyz accessible
- [ ] Wallet connects: Can connect Phantom/Solflare
- [ ] Balance displays: PDA balance shows correctly (or 0 for new users)
- [ ] Navigation works: All game mode pages load
- [ ] No console errors on page load

**Core User Flows:**
- [ ] **Deposit:** Small deposit (0.01 SOL) succeeds
- [ ] **Session:** Create session key works
- [ ] **Prediction Bet:** Place UP or DOWN bet works
- [ ] **Withdrawal:** Withdraw funds succeeds
- [ ] **Real-time Updates:** WebSocket events arrive (price updates, round updates)

**Alerting:**
- [ ] Test alert sends to Discord: Trigger an error condition, verify Discord notification
- [ ] Alert throttling works: Multiple errors don't spam Discord

**Monitoring:**
- [ ] Metrics dashboard accessible at /admin/metrics
- [ ] Metrics show current data (DAU, volume, fees, health)
- [ ] Auto-refresh works (30-second interval)

---

## Rollback Procedure

### Backend Rollback

**If deployment introduces critical bug:**

1. **Render Dashboard:**
   - Navigate to Deploys tab
   - Find last working deploy (green checkmark)
   - Click "Rollback to this deploy"

2. **Verify rollback:**
   ```bash
   curl https://api.degendome.xyz/livez
   curl https://api.degendome.xyz/readyz
   ```

3. **Estimated time:** ~2-5 minutes for Render to redeploy

### Frontend Rollback

**If frontend has critical UI bug:**

1. **Vercel Dashboard:**
   - Navigate to Deployments
   - Find last working deployment
   - Click "..." menu → "Promote to Production"

2. **Verify rollback:**
   - Visit https://degendome.xyz
   - Verify issue is resolved

3. **Estimated time:** ~30 seconds (instant DNS update)

### Program Rollback

**WARNING:** On-chain state persists. Rolling back the program doesn't revert user balances, rounds, or transactions.

**If upgrade authority is set:**
```bash
# Rebuild previous version
git checkout [PREVIOUS_COMMIT]
cd programs/session_betting
anchor build

# Upgrade to previous version
anchor upgrade target/deploy/session_betting.so \
  --program-id [PROGRAM_ID] \
  --provider.cluster mainnet-beta
```

**If immutable (no upgrade authority):**
- **Cannot rollback** - program is permanent
- Must deploy new program with different ID
- Requires frontend/backend redeployment with new program ID
- User balances remain in old program (migration path needed)

**Best practice:** Always keep upgrade authority for first 30 days, then consider making immutable after battle-testing.

### Emergency Stop

**If critical security issue discovered:**

1. **Pause the program immediately:**
   ```bash
   # Prevents new deposits, bets, but allows withdrawals
   cd programs/session_betting
   anchor run pause --provider.cluster mainnet-beta
   ```

2. **Scale backend to 0 (stop processing):**
   - Render Dashboard → Manual Scale → 0 instances
   - Stops new rounds, bets, battles from processing

3. **Update frontend to maintenance mode:**
   ```bash
   # Option 1: Deploy maintenance page
   cd web
   # Create src/app/page.tsx with maintenance message
   vercel --prod

   # Option 2: Show banner via environment variable
   # Add NEXT_PUBLIC_MAINTENANCE_MODE=true to Vercel
   ```

4. **Communicate to users:**
   - Discord #announcements: "DegenDome is temporarily paused for maintenance. Funds are safe. Withdrawals still enabled."
   - Twitter/X post (if applicable)
   - Update status page (if applicable)

5. **Investigate and fix:**
   - Review logs for attack vectors
   - Test fix on devnet
   - Deploy fix to production
   - Unpause program

6. **Resume operations:**
   ```bash
   # Unpause program
   anchor run unpause --provider.cluster mainnet-beta

   # Scale backend back up
   # Render Dashboard → Manual Scale → 1+ instances

   # Remove maintenance mode from frontend
   # Redeploy normal frontend or remove env var
   ```

---

## Monitoring After Launch

### First 24 Hours (High Alert)

**Every 30 minutes:**
- [ ] Check Discord alerts channel (any errors?)
- [ ] Check /api/admin/metrics (DAU, volume, errors)
- [ ] Check Render logs (any crashes, memory issues?)
- [ ] Scan social media for user reports

**Every 2 hours:**
- [ ] Test deposit → bet → withdraw flow manually
- [ ] Check database size growth (reasonable?)
- [ ] Check RPC rate limits (hitting limits?)

**Monitor for:**
- Settlement failures (critical - users not getting paid)
- Balance discrepancies (on-chain vs. database mismatch)
- Memory leaks (backend RAM climbing)
- WebSocket disconnections (users can't play)
- Excessive error rates (>1% of transactions)

### First Week (Elevated Monitoring)

**Daily:**
- [ ] Review metrics dashboard at 9am, 5pm
- [ ] Check total volume and fee collection
- [ ] Review any Discord alerts from past 24h
- [ ] Test one full user flow (deposit → play → withdraw)
- [ ] Check database backups completed successfully

**Weekly:**
- [ ] Review user onboarding success rate (% who deposit)
- [ ] Check retention (% who return after first session)
- [ ] Review any support tickets or user issues
- [ ] Analyze which game modes are most popular

### Ongoing (Standard Operations)

**Weekly:**
- [ ] Review metrics dashboard
- [ ] Check for new security advisories (Solana, Anchor, dependencies)
- [ ] Review error rates and alert history

**Monthly:**
- [ ] Test database backup restoration (verify backups work!)
- [ ] Review and rotate API keys (RPC, CMC, Helius)
- [ ] Check for dependency updates (npm, pnpm audit)
- [ ] Review program upgrade authority (still needed? make immutable?)

**Quarterly:**
- [ ] Security audit (code review, dependency scan)
- [ ] Load testing (can handle 10x current traffic?)
- [ ] Disaster recovery drill (test full rollback procedure)
- [ ] Review monitoring alerts (any false positives? missed incidents?)

---

## RPC Considerations

### Free Tier Limitations

Public mainnet RPC (`api.mainnet-beta.solana.com`) has rate limits:
- **Rate limit:** ~100 requests/second
- **Good for:** Testing, low-traffic launches
- **May hit limits under load:** >50 concurrent users

### Recommended: Premium RPC

For production, use a premium RPC provider:

| Provider | Pricing | Free Tier | Why |
|----------|---------|-----------|-----|
| **Helius** | $0-99+/month | 100k credits/day | Solana-native, great devX, enhanced APIs |
| **QuickNode** | $49+/month | 7-day trial | Reliable, good support, multi-chain |
| **Alchemy** | $0-49+/month | 300M CU/month | Multi-chain option, generous free tier |
| **Triton** | Volume-based | Contact sales | High throughput, institutional-grade |

**Cost estimates (Helius example):**
- Starter: $99/month - 5M credits (~500k transactions)
- Professional: $349/month - 20M credits (~2M transactions)

**When to upgrade:**
- Seeing rate limit errors in logs
- Users experiencing "transaction failed" errors
- >100 concurrent users
- Launching marketing campaign

**How to switch:**
1. Sign up for premium RPC provider
2. Get API endpoint URL
3. Update `SOLANA_RPC_URL` in Render (backend) and Vercel (frontend)
4. Redeploy (or restart services to pick up new env var)
5. Monitor for improvement in error rates

---

## Cost Estimates

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Program deployment | ~2-5 SOL (~$200-500) | Depends on program size (~150KB) |
| Initialize state | ~0.05 SOL (~$5) | GameState PDA rent |
| Authority wallet buffer | ~5 SOL (~$500) | For ongoing operations, rent collection |
| Domain name | $15/year | degendome.xyz (annual cost) |

**Total one-time:** ~$700-1000 + domain

### Monthly Costs

| Item | Cost | Notes |
|------|------|-------|
| **Render (backend)** | $25-85/month | Starter: $25, Standard: $85 (recommended) |
| **Vercel (frontend)** | $0-20/month | Hobby: $0, Pro: $20 (if needed for team features) |
| **PostgreSQL database** | $7-50/month | Render: $7/month Starter, $50/month Standard |
| **RPC (Helius/etc)** | $0-349/month | Free tier to Professional based on usage |
| **Domain (annual)** | $1.25/month | ($15/year amortized) |
| **Monitoring/Alerts** | $0 | Discord webhooks (free) |

**Estimated monthly total:**
- **Low traffic:** ~$35/month (free RPC, Starter backend, free Vercel)
- **Medium traffic:** ~$150/month (Helius Starter, Standard backend, Pro Vercel)
- **High traffic:** ~$500/month (Helius Pro, upgraded instances)

### Variable Costs

| Item | Cost | Notes |
|------|------|-------|
| **Transaction fees** | ~0.000005 SOL per tx (~$0.0005) | User-facing transactions (bets, claims) |
| **Round management** | ~0.000005 SOL per instruction | Authority-paid (start_round, lock_round, settle_round) |
| **Rent for PDAs** | One-time per account | Reclaimed when account closed |
| **Rebate payouts** | Variable | Depends on volume and perk usage |

**Revenue model:**
- 5% platform fee on all winnings
- Break-even estimate: ~$1000/day gross volume → $50/day revenue → $1500/month
- Profitability: >$100/month costs, so >$3000/day volume for meaningful profit

---

## Contacts & Support

| Role | Contact | When to Use |
|------|---------|-------------|
| **On-call Engineer** | [Your contact] | Any production issues, incidents |
| **Solana Discord** | #developers channel | Smart contract issues, RPC problems |
| **Render Support** | support@render.com | Backend hosting issues, deployment problems |
| **Vercel Support** | vercel.com/support | Frontend issues, DNS problems |
| **Helius Support** | Discord or support@helius.dev | RPC issues (if using Helius) |

**Escalation path:**
1. Check logs (Render, Vercel, browser console)
2. Search Discord/GitHub issues
3. Attempt rollback if critical
4. Contact support with logs and reproduction steps

---

## Post-Launch Checklist

**Week 1:**
- [ ] All core user flows tested with real funds
- [ ] Alert system validated (test errors sent to Discord)
- [ ] Monitoring dashboard reviewed daily
- [ ] User feedback collected and triaged

**Week 2:**
- [ ] Database backup tested (restore to staging environment)
- [ ] RPC usage analyzed (upgrade to premium if needed)
- [ ] First security review scheduled

**Month 1:**
- [ ] Upgrade authority decision made (keep or revoke?)
- [ ] All Phase 1-4 fixes validated in production
- [ ] User onboarding funnel analyzed
- [ ] Marketing readiness assessment

---

## Next Steps After Deployment

1. **Monitor and stabilize** (Week 1-2)
   - Fix any production issues immediately
   - Optimize performance based on real usage
   - Gather user feedback

2. **Feature rollout** (Month 1-2)
   - Scheduled matches (Phase 3, Plan 03-02)
   - Animation polish (Phase 2, Plan 02-05)
   - Mobile app (if planned)

3. **Scale preparation** (Month 2-3)
   - Load testing with simulated traffic
   - Database optimization and indexing
   - RPC upgrade if needed

4. **Marketing launch** (Month 3+)
   - Public announcement
   - Influencer partnerships
   - Community building

---

*Review and update this guide after each deployment iteration. Keep it living documentation.*

**Last updated:** 2026-01-22
**Next review:** After first mainnet deployment
