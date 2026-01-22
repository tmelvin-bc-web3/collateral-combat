# DegenDome - PvP Trading Arena on Solana

**Live at:** [degendome.xyz](https://www.degendome.xyz)

A competitive trading platform where players battle head-to-head, predict prices, draft memecoin portfolios, and wager on live matches - all powered by a unified PDA balance system on Solana.

## Game Modes

| Mode | Description | Entry |
|------|-------------|-------|
| **Battle Arena** | 1v1 trading battles - best P&L wins the pot | 0.1 - 5 SOL |
| **Oracle/Predict** | Predict if price goes UP or DOWN in 30 seconds | 0.01 - 0.5 SOL |
| **Draft** | Pick 6 memecoins, compete on weekly performance | 0.1 - 1 SOL |
| **Spectator** | Wager on live battles between other players | 0.01 - 1 SOL |

## Architecture

```
sol-battles/
├── programs/
│   └── session_betting/     # Solana Anchor program
│       └── programs/
│           └── session_betting/
│               └── src/lib.rs    # PDA balance + session keys + Oracle rounds
│
├── backend/                  # Node.js + Socket.io server
│   └── src/
│       ├── services/
│       │   ├── battleManager.ts           # Battle logic
│       │   ├── predictionServiceOnChain.ts # Oracle rounds (on-chain)
│       │   ├── onChainRoundManager.ts     # Round lifecycle management
│       │   ├── spectatorService.ts        # Spectator wagering
│       │   ├── draftTournamentManager.ts  # Draft tournaments
│       │   ├── balanceService.ts          # PDA balance verification
│       │   └── priceService.ts            # Jupiter price feeds
│       └── db/
│           ├── balanceDatabase.ts         # Pending transactions
│           └── draftDatabase.ts           # Draft tournament data
│
├── scripts/                  # Deployment scripts
│   ├── deploy-mainnet.sh    # Mainnet deployment
│   └── verify-deployment.sh # Post-deploy verification
│
└── web/                      # Next.js 16 frontend
    └── src/
        ├── app/              # App router pages
        │   ├── battle/       # Battle arena
        │   ├── predict/      # Oracle predictions
        │   ├── draft/        # Draft tournaments
        │   └── spectate/     # Watch & wager
        ├── lib/
        │   └── session-betting/  # Solana program client
        └── hooks/
            └── useSessionBetting.ts  # Balance & session management
```

## Session Betting Program

The core Solana program (`4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA`) provides:

### PDA Balance System
- **Deposit once, play everywhere** - Users deposit SOL to their PDA vault
- **Unified balance** - Same balance used across all game modes
- **Instant withdrawals** - Withdraw anytime with wallet signature
- **Immediate fund locking** - Wagers locked on-chain when placed

### On-Chain Oracle Rounds
- **Pyth Network integration** - Tamper-proof price data
- **On-chain round management** - Start, lock, settle all verifiable
- **Automatic rent reclaim** - Rounds closed after 1-hour grace period

### Session Keys
- **No wallet popups** - Create a session key for frictionless betting
- **Time-limited** - Sessions expire after max 24 hours
- **Safe by design** - Session keys can bet but CANNOT withdraw

### Key Instructions
| Instruction | Who Can Call | Purpose |
|-------------|--------------|---------|
| `deposit` | User (wallet) | Add SOL to PDA balance |
| `withdraw` | User (wallet) | Remove SOL from PDA balance |
| `create_session` | User (wallet) | Create session key for betting |
| `start_round` | Authority | Begin new Oracle round with Pyth price |
| `lock_round` | Authority | Lock round at 25s mark |
| `settle_round` | Authority | Determine winner at 30s |
| `close_round` | Authority | Reclaim rent after grace period |
| `credit_winnings` | Authority | Pay out game winners |
| `transfer_to_global_vault` | Authority | Lock wager funds |
| `propose_authority` | Authority | Begin authority transfer |
| `accept_authority` | New Authority | Complete authority transfer |

## Security Features

### Smart Contract Security
- **Pyth oracle integration** - Tamper-proof price data for Oracle rounds
- **Two-step authority transfer** - Prevents accidental loss of control
- **Immediate fund locking** - Wagers locked on-chain to prevent exploit
- **Global vault balance check** - Ensures sufficient funds before payouts
- **SystemAccount validation** - All vaults use `SystemAccount` for type safety
- **Reentrancy protection** - State updated before all transfers
- **Math overflow protection** - All arithmetic uses `checked_*` operations
- **Session key isolation** - Sessions cannot withdraw, only bet

### Fund Locking Security
When a user places a wager:
1. Backend verifies on-chain PDA balance
2. Funds transferred to global vault **immediately** on-chain
3. User cannot withdraw wagered funds
4. If user wins: credited from global vault
5. If user loses: funds already in vault

### Backend Security
- **PDA balance verification** - Checks on-chain balance before every action
- **Pending transaction tracking** - Prevents double-spending during settlement
- **Wallet signature authentication** - All sensitive operations require signatures
- **Rate limiting** - Global, standard, and strict limits per endpoint

### Monitoring & Operations
- **Health endpoints** - `/livez` (liveness) and `/readyz` (readiness) for Kubernetes
- **Discord alerting** - Critical errors trigger Discord notifications with 5-minute throttling
- **Automated backups** - SQLite databases backed up every 6 hours with 7-day retention
- **Structured logging** - JSON format with DEBUG/INFO/WARN/ERROR levels

## Quick Start

### Prerequisites
- Node.js 18+
- Rust + Anchor CLI 0.31.1 (for program development)
- Solana CLI (configured for devnet)

### 1. Start the Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure environment
npm run dev
```
Backend runs on `http://localhost:3002`

### 2. Start the Frontend
```bash
cd web
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

### 3. Build the Solana Program (optional)
```bash
cd programs/session_betting
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

## Environment Variables

### Backend
```bash
# Required
SOLANA_RPC_URL=https://api.devnet.solana.com
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<base58 private key>

# Optional
PORT=3002
FRONTEND_URL=http://localhost:3000
REQUIRE_WALLET_SIGNATURES=true
DISCORD_WEBHOOK_URL=<discord webhook for alerts>
ADMIN_WALLETS=<comma-separated admin wallet addresses>
CMC_API_KEY=<coinmarketcap api key>
HELIUS_API_KEY=<helius api key>
```

### Frontend
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

## Oracle Round Lifecycle

```
Start Round (0s)
    │
    ├── Backend calls start_round with Pyth price
    ├── BettingRound + BettingPool PDAs created
    │
    ▼
Betting Phase (0-25s)
    │
    ├── Users place wagers via WebSocket
    ├── Each wager: transferToGlobalVault (on-chain)
    ├── Funds locked immediately
    │
    ▼
Lock Round (25s)
    │
    ├── Backend calls lock_round with Pyth price
    ├── No more wagers accepted
    │
    ▼
Settle Round (30s)
    │
    ├── Backend calls settle_round
    ├── Winner determined: UP, DOWN, or DRAW
    ├── Winners credited via creditWinnings
    │
    ▼
Close Round (+1 hour)
    │
    ├── Backend calls close_round
    └── Rent reclaimed (~0.003 SOL per round)
```

## WebSocket Events

### Client → Server
| Event | Description |
|-------|-------------|
| `register_wallet` | Register wallet for notifications |
| `queue_matchmaking` | Enter battle matchmaking |
| `open_position` | Open leveraged position in battle |
| `subscribe_prediction` | Subscribe to Oracle rounds |
| `place_prediction_bet` | Place UP/DOWN prediction |
| `spectate_battle` | Watch a live battle |
| `place_bet` | Wager on battle outcome |

### Server → Client
| Event | Description |
|-------|-------------|
| `battle_update` | Battle state changed |
| `price_update` | New prices available |
| `prediction_round` | New Oracle round started |
| `prediction_settled` | Round result + payouts |
| `odds_update` | Spectator odds changed |
| `progression_update` | XP/level changes |

## Tech Stack

- **Frontend:** Next.js 16, React, TailwindCSS, Socket.io-client
- **Backend:** Node.js, Express, Socket.io, TypeScript, SQLite
- **Blockchain:** Solana, Anchor Framework 0.31.1
- **Wallet:** Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Prices:** Jupiter Price API, Pyth Network (Oracle)
- **Deployment:** Vercel (frontend), Render (backend)

## Program IDs

| Program | Address | Network |
|---------|---------|---------|
| Session Betting | `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA` | Devnet |
| Battle Program | `GJPVHcvCAwbaCNXuiADj8a5AjeFy9LQuJeU4G8kpBiA9` | Mainnet |

## Roadmap

- [x] PvP Trading Battles
- [x] Oracle/Prediction Game
- [x] Spectator Wagering
- [x] Draft Tournaments
- [x] Unified PDA Balance System
- [x] Session Keys (no wallet popups)
- [x] Pyth Oracle Integration
- [x] On-Chain Round Management
- [x] Immediate Fund Locking
- [x] Automatic Rent Reclaim
- [x] Structured Logging
- [x] Health Check Endpoints
- [x] Discord Alert Service
- [x] Automated Database Backups
- [x] Scheduled Match System
- [ ] Multi-sig authority (before mainnet)
- [ ] Mainnet deployment
- [ ] Mobile app
- [ ] Battle Royale mode (10 players)
- [ ] Tournament system with brackets

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

*Built with Solana + Anchor + Pyth*
