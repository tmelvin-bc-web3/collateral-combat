# Sol Battles - Economics & Cost Analysis

## Revenue (Platform Rake)

| Game Mode | Rake % | How It Works |
|-----------|--------|--------------|
| Oracle | 5% | Taken from losing pool before distribution |
| Token Wars | 5% | Taken from total pool before payout |
| LDS | 5% | Taken from prize pool |
| Draft | 10% | Taken from prize pool |
| Spectator | 5% | Taken from losing pool |
| Battles | 5% | Taken from prize pool |

### Revenue Examples

| Scenario | Volume | Rake |
|----------|--------|------|
| 100 users × 0.1 SOL/day avg | 10 SOL/day | 0.5 SOL/day |
| 500 users × 0.5 SOL/day avg | 250 SOL/day | 12.5 SOL/day |
| 1000 users × 1 SOL/day avg | 1000 SOL/day | 50 SOL/day |

At $140/SOL: 50 SOL/day rake = **$7,000/day** or **$49,000/week**

---

## Operating Costs

### 1. CoinMarketCap API

**Current Usage:**
- `priceService`: 1 call every 30 seconds = **2,880 calls/day**
- `coinMarketCapService` (Draft): 1 call every 5 minutes = **288 calls/day**
- **Total: ~3,168 calls/day = ~95,000 calls/month**

**CMC Pricing:**
| Tier | Calls/Month | Price | Enough? |
|------|-------------|-------|---------|
| Free | 10,000 | $0 | ❌ No |
| Basic | 30,000 | $29/mo | ❌ No |
| Hobbyist | 120,000 | $79/mo | ✓ Yes (barely) |
| Startup | 500,000 | $299/mo | ✓ Yes |

**Recommendation:** Hobbyist tier at **$79/month** should work, but consider Startup ($299/mo) for headroom.

**Optimization Option:** Reduce priceService from 30s to 60s intervals = 1,440 calls/day = 43,200/month (Basic tier would work)

---

### 2. Solana RPC (Carbium)

**Usage Types:**
- Balance checks
- PDA operations (deposit/withdraw)
- Payout transactions

**Costs:**
- Carbium pricing: Check your plan (likely usage-based)
- Transaction fees: ~0.000005 SOL per transaction

**Estimated Weekly:**
- 1000 transactions/week × 0.000005 SOL = 0.005 SOL (~$0.70)
- RPC calls: Depends on your Carbium plan

---

### 3. Helius (NFT Data)

**Usage:** Profile picture NFT fetching

**Costs:**
| Tier | Requests/Month | Price |
|------|----------------|-------|
| Free | 100,000 | $0 |
| Starter | 1,000,000 | $49/mo |

**Likely:** Free tier sufficient unless heavy NFT usage

---

### 4. Infrastructure

**Render (Backend):**
| Plan | Price | Specs |
|------|-------|-------|
| Free | $0 | 512 MB, sleeps after inactivity |
| Starter | $7/mo | 512 MB, always on |
| Standard | $25/mo | 2 GB RAM |
| Pro | $85/mo | 4 GB RAM |

**Recommendation:** Standard ($25/mo) for production

**PostgreSQL (Render):**
| Plan | Price | Storage |
|------|-------|---------|
| Free | $0 | 1 GB, expires in 90 days |
| Starter | $7/mo | 1 GB |
| Standard | $20/mo | 10 GB |

**Recommendation:** Standard ($20/mo) for production

**Vercel (Frontend):**
| Plan | Price |
|------|-------|
| Hobby | $0 |
| Pro | $20/mo |

**Likely:** Free tier works, Pro if you need more bandwidth

---

## Weekly Cost Summary

### Minimum Viable (Low Traffic)

| Service | Weekly Cost |
|---------|-------------|
| CMC Hobbyist | $18.25 |
| Render Standard | $5.75 |
| PostgreSQL Standard | $4.60 |
| Vercel Free | $0 |
| Helius Free | $0 |
| Solana TX fees | ~$1 |
| **Total** | **~$30/week** |

### Production Ready (Medium Traffic)

| Service | Weekly Cost |
|---------|-------------|
| CMC Startup | $69 |
| Render Pro | $19.60 |
| PostgreSQL Standard | $4.60 |
| Vercel Pro | $4.60 |
| Helius Starter | $11.30 |
| Carbium RPC | $?? |
| Solana TX fees | ~$5 |
| **Total** | **~$115/week** + Carbium |

---

## Break-Even Analysis

**At minimum costs ($30/week):**
- Need 0.21 SOL/week in rake revenue
- At 5% rake = 4.2 SOL/week in volume
- = 0.6 SOL/day average volume

**At production costs ($115/week):**
- Need 0.82 SOL/week in rake revenue
- At 5% rake = 16.4 SOL/week in volume
- = 2.3 SOL/day average volume

**This is very achievable.** Even 10 users betting 0.25 SOL/day = 2.5 SOL/day volume.

---

## Cost Optimization Opportunities

1. **Reduce CMC calls:**
   - Change priceService from 30s → 60s (halves API usage)
   - Use Pyth for real-time, CMC for fallback only

2. **Cache aggressively:**
   - Price history cached on backend
   - Memecoin list cached for Draft

3. **Batch transactions:**
   - Combine multiple payouts into single TX where possible

4. **Self-host RPC:**
   - Run your own Solana validator (expensive but unlimited)
   - Only worth it at very high scale

---

## Referral Program Economics

Currently configured:
- Referrer gets **10% of rake** from referred users' bets
- Referred users get **1% rake discount** (9% vs 10% on Draft)

Example: User bets 1 SOL on Draft
- Normal rake: 0.10 SOL (10%)
- Referred user rake: 0.09 SOL (9%)
- Referrer kickback: 0.009 SOL (10% of 0.09)
- Platform keeps: 0.081 SOL

---

## Summary

| Metric | Value |
|--------|-------|
| **Weekly Operating Cost** | $30-115 |
| **Break-even Volume** | 2-16 SOL/week |
| **Rake Rate** | 5-10% |
| **Biggest Cost** | CoinMarketCap API |

The economics are favorable - even modest usage easily covers costs.
