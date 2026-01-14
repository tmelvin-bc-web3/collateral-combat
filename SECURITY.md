# Security Documentation

This document describes the security measures implemented in Sol Battles / DegenDome and important considerations for future development.

## Table of Contents
- [API Key Protection](#api-key-protection)
- [Wallet Authentication](#wallet-authentication)
- [Input Validation](#input-validation)
- [Rate Limiting](#rate-limiting)
- [CORS Configuration](#cors-configuration)
- [Anti-Abuse Measures](#anti-abuse-measures)
- [Environment Variables](#environment-variables)
- [Common Security Mistakes to Avoid](#common-security-mistakes-to-avoid)
- [Future Improvements](#future-improvements)

---

## API Key Protection

### Helius API Key
- **Location:** Backend only (`HELIUS_API_KEY` in `.env`)
- **How it works:** Frontend calls `/api/nfts/:wallet` which proxies to Helius
- **Never:** Put API keys in `NEXT_PUBLIC_*` variables - they're visible in browser

### Other API Keys
- `CMC_API_KEY` - CoinMarketCap (backend only)
- All private keys (`ESCROW_WALLET_PRIVATE_KEY`, etc.) - backend only

---

## Wallet Authentication

### Current State (as of Jan 2025)
Authentication requires wallet signatures. All authenticated endpoints verify that:
1. The wallet address is valid (base58 format)
2. The signature is valid (signed by the wallet's private key)
3. The timestamp is within 5 minutes
4. The signature hasn't been used before (replay protection)

**Signature verification is ENABLED** (`REQUIRE_WALLET_SIGNATURES=true`)

### Frontend Auth Utility
```typescript
// web/src/lib/auth.ts
import { createAuthHeaders, authenticatedFetch } from '@/lib/auth';

// Option 1: Get headers manually
const headers = await createAuthHeaders(walletAddress, signMessage);
fetch(url, { headers });

// Option 2: Use helper function
const response = await authenticatedFetch(url, walletAddress, signMessage, options);
```

### Files Using Wallet Signatures
These files have been updated to use wallet signatures:
- `web/src/hooks/useProfile.ts` - Profile update/delete (via ProfileContext)
- `web/src/contexts/ProfileContext.tsx` - Passes signMessage to useProfile
- `web/src/app/admin/waitlist/page.tsx` - Admin dashboard
- `web/src/app/waitlist/page.tsx` - Waitlist signup

### Signature Format
- Message: `DegenDome:auth:{timestamp}`
- Headers required:
  - `x-wallet-address`: Wallet public key (base58)
  - `x-signature`: Signed message (base58)
  - `x-timestamp`: Unix timestamp (ms)

---

## Input Validation

### Backend Validation (`backend/src/`)
- **Email:** Regex validation, max 254 chars, no `+` aliases
- **Wallet addresses:** Base58 format, 32-44 chars
- **Referral codes:** Format `DEGEN[A-HJ-NP-Z2-9]{4}`
- **UTM parameters:** Alphanumeric, dash, underscore only
- **NFT URLs:** Block localhost, internal IPs, validate protocol
- **SQL:** Parameterized queries, whitelist for sort columns

### Frontend Validation (`web/src/`)
- **Email:** Same regex as backend
- **Wallet addresses:** Base58 format check
- **Referral codes:** Format validation before API call

---

## Rate Limiting

### Backend Rate Limiters (`backend/src/middleware/rateLimiter.ts`)
- `globalLimiter`: 100 req/min per IP
- `standardLimiter`: 30 req/min (most endpoints)
- `strictLimiter`: 5 req/min (write operations)
- `burstLimiter`: 60 req/min (price history)

### Endpoints with Rate Limiting
- All `/api/*` routes have global limiter
- Waitlist join: strict limiter
- Profile updates: standard limiter
- Admin endpoints: standard limiter

---

## CORS Configuration

### Production (`backend/src/config.ts`)
- Only allows origins in `ALLOWED_ORIGINS` env var
- Default: `https://www.degendome.xyz`, `https://degendome.xyz`
- Logs blocked CORS requests

### Development
- Allows localhost:3000, localhost:3001, 127.0.0.1

---

## Anti-Abuse Measures

### Waitlist System
1. **Disposable email blocking:** 500+ domains blocked (`backend/src/utils/disposableEmails.ts`)
2. **Email alias blocking:** No `+` in emails (prevents `john+1@gmail.com` abuse)
3. **IP tracking:** Same-IP referrals not credited
4. **Wallet signature:** Required for waitlist signup
5. **Signature replay protection:** 5-minute window, each signature usable once

### Whitelist
- Stored in `NEXT_PUBLIC_WHITELISTED_WALLETS` env var
- **Not** hardcoded in source code

---

## Environment Variables

### Backend (`.env`)
```bash
# Required
DATABASE_URL=              # PostgreSQL connection
HELIUS_API_KEY=           # NFT API
CMC_API_KEY=              # CoinMarketCap

# Optional
REQUIRE_WALLET_SIGNATURES= # Enable signature auth (default: false)
ADMIN_WALLETS=            # Comma-separated admin wallets
ALLOWED_ORIGINS=          # CORS origins
```

### Frontend (`.env.local`)
```bash
# Required
NEXT_PUBLIC_BACKEND_URL=   # API URL (NO localhost fallback in production)

# Optional
NEXT_PUBLIC_WHITELISTED_WALLETS=  # Early access wallets
```

---

## Common Security Mistakes to Avoid

### 1. Exposing API Keys
```typescript
// BAD - visible in browser
const HELIUS_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

// GOOD - proxy through backend
const response = await fetch(`${BACKEND_URL}/api/nfts/${wallet}`);
```

### 2. Hardcoding Secrets
```typescript
// BAD
const ADMIN_WALLETS = ['GxjjUm...', 'Cyth...'];

// GOOD
const ADMIN_WALLETS = process.env.ADMIN_WALLETS?.split(',');
```

### 3. Localhost Fallback in Production
```typescript
// BAD - will silently fail or connect to wrong service
const URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// GOOD - use centralized config that fails clearly
import { BACKEND_URL } from '@/config/api';
```

### 4. Trusting Headers Without Verification
```typescript
// BAD - anyone can set this header
const wallet = req.headers['x-wallet-address'];

// GOOD - verify signature (when REQUIRE_WALLET_SIGNATURES=true)
const isValid = verifyAuthSignature(wallet, signature, timestamp);
```

### 5. SQL Injection
```typescript
// BAD
const query = `SELECT * FROM users ORDER BY ${sortBy}`;

// GOOD
const validColumns = ['created_at', 'name'];
const safeSortBy = validColumns.includes(sortBy) ? sortBy : 'created_at';
```

---

## Future Improvements

### High Priority
1. **Enable wallet signatures:** Set `REQUIRE_WALLET_SIGNATURES=true` after updating frontend
2. **Add CSRF protection:** Implement anti-CSRF tokens for state-changing requests
3. **Database encryption:** Encrypt sensitive fields (email, IP addresses)

### Medium Priority
1. **Audit logging:** Log all admin actions and security events to database
2. **Session management:** Implement proper sessions instead of per-request auth
3. **2FA for admin:** Add TOTP for admin dashboard access

### Low Priority
1. **Content Security Policy:** Add CSP headers to frontend
2. **Subresource Integrity:** Add SRI hashes for external scripts
3. **Security headers:** Add X-Frame-Options, X-Content-Type-Options

---

## Security Contacts

If you discover a security vulnerability, please report it responsibly.

---

*Last updated: January 2025*
