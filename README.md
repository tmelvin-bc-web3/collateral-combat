# SOL Battles - PvP Trading Arena

Compete head-to-head in trading battles on Solana. Best P&L wins.

## Project Structure

```
sol-battles/
├── backend/          # Node.js backend server
│   ├── src/
│   │   ├── index.ts           # Express + Socket.io server
│   │   ├── types.ts           # TypeScript types
│   │   ├── tokens.ts          # Whitelisted tokens
│   │   └── services/
│   │       ├── priceService.ts    # Jupiter price feeds
│   │       └── battleManager.ts   # Battle logic
│   └── package.json
│
├── web/              # Next.js frontend
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Socket client
│   │   └── types/            # TypeScript types
│   └── package.json
│
└── program/          # (Future) Solana smart contract
```

## Quick Start

### 1. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on `http://localhost:3001`

### 2. Start the Frontend

```bash
cd web
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`

### 3. Connect & Play

1. Open http://localhost:3000
2. Connect your Phantom/Solflare wallet
3. Select battle duration and entry fee
4. Click "Find Match" to queue for matchmaking
5. Once matched, trade tokens to maximize your P&L
6. Winner takes the prize pool (minus 5% fee)

## Features

- **Paper Trading Mode**: Practice without real funds
- **Real-time Price Feeds**: Live prices from Jupiter
- **1v1 Battles**: Head-to-head competition
- **Token Whitelist**: 15+ liquid Solana tokens
- **Fog of War**: Opponent's portfolio hidden until battle ends
- **Automatic Matchmaking**: Find opponents at same stakes

## Tech Stack

- **Frontend**: Next.js 16, React, TailwindCSS, Socket.io
- **Backend**: Node.js, Express, Socket.io, TypeScript
- **Wallet**: Solana Wallet Adapter
- **Prices**: Jupiter Price API

## API Endpoints

```
GET  /api/tokens         - List whitelisted tokens
GET  /api/prices         - Current token prices
GET  /api/battles        - Active battles
GET  /api/battles/:id    - Battle details
GET  /api/health         - Health check
```

## WebSocket Events

**Client → Server:**
- `create_battle` - Create new battle
- `join_battle` - Join existing battle
- `queue_matchmaking` - Enter matchmaking queue
- `execute_trade` - Execute paper trade
- `leave_battle` - Leave battle/queue

**Server → Client:**
- `battle_update` - Battle state changed
- `price_update` - New prices available
- `trade_executed` - Trade confirmed
- `battle_started` - Battle begun
- `battle_ended` - Battle complete
- `error` - Error message

## Environment Variables

### Backend
```
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Roadmap

- [ ] Real trading mode (actual on-chain swaps)
- [ ] Solana smart contract for escrow
- [ ] Battle Royale mode (10 players)
- [ ] Leaderboards
- [ ] Tournament system
- [ ] Mobile app
