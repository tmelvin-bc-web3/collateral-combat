# DegenDome - PvP Trading Arena on Solana

**Live at:** [degendome.xyz](https://www.degendome.xyz)

A competitive trading platform where players battle head-to-head, predict prices, draft memecoin portfolios, and wager on live matches - all powered by a unified PDA balance system on Solana.

## Game Modes

| Mode | Description | Entry |
|------|-------------|-------|
| **Battle Arena** | 1v1 trading battles - best P&L wins the pot | 0.1 - 5 SOL |
| **Oracle/Predict** | Predict if price goes UP or DOWN in 30 seconds | 0.01 - 0.5 SOL |
| **Draft** | Pick 5 memecoins, compete on weekly performance | 0.1 - 1 SOL |
| **Spectator** | Wager on live battles between other players | 0.01 - 1 SOL |

## Architecture

```
sol-battles/
├── programs/
│   └── session_betting/     # Solana Anchor program
│       └── programs/
│           └── session_betting/
│               └── src/lib.rs    # PDA balance + session keys
│
├── backend/                  # Node.js + Socket.io server
│   └── src/
│       ├── services/
│       │   ├── battleManager.ts       # Battle logic
│       │   ├── predictionService.ts   # Oracle rounds
│       │   ├── spectatorService.ts    # Spectator wagering
│       │   ├── draftTournamentManager.ts  # Draft tournaments
│       │   ├── balanceService.ts      # PDA balance verification
│       │   └── priceService.ts        # Jupiter price feeds
│       └── db/
│           ├── balanceDatabase.ts     # Pending transactions
│           └── draftDatabase.ts       # Draft tournament data
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

### Session Keys
- **No wallet popups** - Create a session key for frictionless betting
- **Time-limited** - Sessions expire after max 7 days
- **Safe by design** - Session keys can bet but CANNOT withdraw

### Key Instructions
| Instruction | Who Can Call | Purpose |
|-------------|--------------|---------|
| `deposit` | User (wallet) | Add SOL to PDA balance |
| `withdraw` | User (wallet) | Remove SOL from PDA balance |
| `create_session` | User (wallet) | Create session key for betting |
| `place_bet` | User or Session | Place UP/DOWN bet in Oracle |
| `credit_winnings` | Authority only | Pay out game winners |
| `transfer_to_global_vault` | Authority only | Collect from losers |

## Security Features

### Smart Contract Security
- **Authority-only price submission** - Prevents price manipulation in Oracle
- **Global vault balance check** - Ensures sufficient funds before payouts
- **SystemAccount validation** - All vaults use `SystemAccount` for type safety
- **Reentrancy protection** - State updated before all transfers
- **Math overflow protection** - All arithmetic uses `checked_*` operations
- **Session key isolation** - Sessions cannot withdraw, only bet

### Backend Security
- **PDA balance verification** - Checks on-chain balance before every action
- **Pending transaction tracking** - Prevents double-spending during settlement
- **Wallet signature authentication** - All sensitive operations require signatures
- **Rate limiting** - Global, standard, and strict limits per endpoint

See [SECURITY.md](./SECURITY.md) for full security documentation.

## Quick Start

### Prerequisites
- Node.js 18+
- Rust + Anchor CLI (for program development)
- Solana CLI (configured for devnet)

### 1. Start the Backend
```bash
cd backend
npm install
cp .env.example .env  # Configure environment
npm run dev
```
Backend runs on `http://localhost:3001`

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
anchor deploy --provider.cluster devnet
```

## Environment Variables

### Backend
```bash
# Required
SOLANA_RPC_URL=https://api.devnet.solana.com
SESSION_BETTING_AUTHORITY_PRIVATE_KEY=<base58 private key>

# Optional
PORT=3001
FRONTEND_URL=http://localhost:3000
REQUIRE_WALLET_SIGNATURES=true
```

### Frontend
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
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
- **Blockchain:** Solana, Anchor Framework
- **Wallet:** Solana Wallet Adapter (Phantom, Solflare, etc.)
- **Prices:** Jupiter Price API, Pyth (Oracle)
- **Deployment:** Vercel (frontend), Render (backend)

## Program IDs

| Program | Address | Network |
|---------|---------|---------|
| Session Betting | `4EMMUfMMx61ynFq53fi8nsXBdDRcB1KuDuAmjsYMAKAA` | Devnet |

## Roadmap

- [x] PvP Trading Battles
- [x] Oracle/Prediction Game
- [x] Spectator Wagering
- [x] Draft Tournaments
- [x] Unified PDA Balance System
- [x] Session Keys (no wallet popups)
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

*Built with Solana + Anchor*
