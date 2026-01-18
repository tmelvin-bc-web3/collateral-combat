# DegenDome

**The Ultimate PvP Trading Arena on Solana**

**Live at:** [degendome.xyz](https://www.degendome.xyz)

---

## What is DegenDome?

DegenDome is a competitive trading platform where players go head-to-head in skill-based games. Predict price movements, battle other traders with leverage, draft memecoin teams, or spectate and bet on live competitions. Winner takes all.

---

## Game Modes

### 1. Oracle Predictions
**Predict SOL price movement in 30 seconds**

The fastest way to play. Each round lasts just 30 seconds - predict whether SOL goes UP or DOWN, and if you're right, you win a share of the pot.

- **Round Duration:** 30 seconds
- **Betting Window:** 25 seconds
- **Min Bet:** 0.01 SOL
- **Payout:** Winners split 95% of the losing pool (5% platform fee)
- **Price Oracle:** Pyth Network (on-chain verified)

---

### 2. Battle Arena
**1v1 Leveraged Trading Battles**

Enter head-to-head trading competitions. Both players start with equal virtual capital and trade crypto with up to 20x leverage. Best P&L at the end wins the pot.

- **Duration:** 5 minutes
- **Leverage:** 2x, 5x, 10x, 20x
- **Assets:** SOL, ETH, BTC, WIF, BONK, JUP, RAY
- **Entry:** 0.1 - 5 SOL
- **Platform Fee:** 5% of pot

---

### 3. Draft Tournaments
**Weekly Fantasy-Style Memecoin Competitions**

Build a team of 6 memecoins from a randomized draft. Your portfolio's performance over the week determines your ranking. Use power-ups strategically to maximize gains.

- **Draft:** 6 picks from 5 random options each round
- **Duration:** Weekly (Monday to Sunday UTC)
- **Entry Tiers:** 0.1 / 0.5 / 1 SOL
- **Coin Pool:** 28+ real memecoins (DOGE, PEPE, BONK, WIF, etc.)
- **Payout:** Top performers split the prize pool

**Power-Ups:**
- **Swap** - Replace one pick with new options
- **2x Boost** - Double the score impact of one coin
- **Freeze** - Lock in gains, protect from downside

---

### 4. Spectator Wagering
**Watch & Bet on Live Battles**

Can't trade? Watch others compete in real-time and bet on who you think will win. Dynamic odds update as the battle progresses.

- **Live Streaming:** Real-time P&L updates
- **Parimutuel Odds:** Dynamic odds based on pool sizes
- **Min Wager:** 0.01 SOL
- **Platform Fee:** 5% of winning pool

---

### 5. Last Degen Standing
**Battle Royale Elimination**

Predict SOL price direction each round. Wrong prediction = elimination. Last player standing wins the pot.

- **Entry Fee:** 0.1 SOL
- **Players:** 3-50
- **Round Duration:** 30 seconds
- **Max Rounds:** 15
- **Payout:** Tiered based on player count

---

### 6. Token Wars
**Head-to-Head Token Battles**

Two tokens face off - bet on which one will have better price performance over 5 minutes.

- **Battle Duration:** 5 minutes
- **Betting Window:** 60 seconds
- **Min Bet:** 0.01 SOL
- **Max Bet:** 10 SOL
- **Platform Fee:** 5% of losing pool

---

## Session Betting System

DegenDome uses a unified on-chain balance system:

1. **Deposit Once** - Transfer SOL to your PDA vault
2. **Create Session** - Authorize a session key (up to 24 hours)
3. **Play Everywhere** - Use the same balance across all game modes
4. **Instant Wagers** - No wallet popups during gameplay
5. **Withdraw Anytime** - Only your wallet can withdraw

**Security:** Session keys can place wagers but CANNOT withdraw funds.

---

## Platform Highlights

| Feature | Details |
|---------|---------|
| **Game Modes** | 6 unique ways to play |
| **Fastest Rounds** | 30-second prediction games |
| **Payouts** | Credited to on-chain balance instantly |
| **Availability** | 24/7 live games |
| **Platform Fee** | 5% on winnings |
| **Price Oracle** | Pyth Network (tamper-proof) |

---

## Tech Stack

- **Frontend:** Next.js 16, React, TailwindCSS, Socket.IO
- **Backend:** Node.js, Express, Socket.IO, TypeScript
- **Blockchain:** Solana (Anchor Framework 0.31.1)
- **Wallet:** Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Prices:** Jupiter API, Pyth Network
- **Deployment:** Vercel (frontend), Render (backend)

---

## Smart Contract

| Program | Address | Network |
|---------|---------|---------|
| Session Betting | `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA` | Devnet |

---

## Links

- **Live App:** https://www.degendome.xyz
- **GitHub:** https://github.com/tmelvin-bc-web3/collateral-combat
- **Documentation:** https://www.degendome.xyz/docs

---

## Roadmap

- [x] PvP Trading Battles
- [x] Oracle/Prediction Game (on-chain)
- [x] Spectator Wagering
- [x] Draft Tournaments
- [x] Last Degen Standing
- [x] Token Wars
- [x] Unified PDA Balance System
- [x] Session Keys (no wallet popups)
- [x] Pyth Oracle Integration
- [x] Progression System (XP/Levels)
- [ ] Multi-sig authority
- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Tournament brackets

---

*Trade PvP. Winner Takes All.*
