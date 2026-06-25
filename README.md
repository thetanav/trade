# TradeX - Real-Time Trading System

TradeX is a full-stack trading simulation built as a Bun + Turborepo monorepo. It pairs a Next.js trading dashboard with a Hono API, PostgreSQL persistence, Redis-backed order books, and Socket.IO streams for live market depth and candlestick updates.

![TradeX preview](https://github.com/user-attachments/assets/bfde9e9e-6456-4e66-add1-be71bbcb700b)

## Highlights

- Limit and market order placement with basic order matching
- Redis-backed bid/ask order book with live depth broadcasts
- Real-time candlestick chart updates over Socket.IO
- Authenticated user accounts with signed HTTP-only cookie sessions
- Portfolio dashboard for cash, holdings, active orders, and trade history
- PostgreSQL schema and migrations managed with Drizzle ORM
- Shared TypeScript, ESLint, and UI packages across the monorepo

## Tech Stack

| Layer | Tools |
| --- | --- |
| Monorepo | Bun workspaces, Turborepo |
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TanStack Query, Zustand |
| Backend | Bun, Hono, Socket.IO, Zod, JWT, bcrypt |
| Data | PostgreSQL, Drizzle ORM, Redis |
| Charts | lightweight-charts, Recharts |

## Project Structure

```txt
apps/
  frontend/   Next.js web app and trading dashboard
  backend/    Hono API, matching logic, sockets, database access
packages/
  ui/         Shared React UI primitives
  eslint-config/
  typescript-config/
```

## Getting Started

### Prerequisites

- Bun 1.3+
- PostgreSQL
- Redis

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment variables

Create `apps/backend/.env`:

```env
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/tradex
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-long-random-secret
PORT=8080
NODE_ENV=development
```

Create `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=http://localhost:8080
```

### 3. Prepare the database

```bash
cd apps/backend
bun run db:migrate
```

### 4. Run the app

From the repository root:

```bash
bun run dev
```

The frontend runs on `http://localhost:3000` and the backend defaults to `http://localhost:8080`.

## Useful Scripts

```bash
bun run dev          # Start all apps through Turborepo
bun run build        # Build all workspaces
bun run lint         # Run lint checks
bun run check-types  # Run TypeScript checks

docker run -d --name redis -p 6379:6379 redis:latest # spin docker
```

Backend-specific commands:

```bash
cd apps/backend
bun run db:gen       # Generate Drizzle migrations
bun run db:migrate   # Apply migrations
bun run db:studio    # Open Drizzle Studio
```

## API Overview

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/signup` | Create an account with starter cash and stock |
| `POST` | `/auth/login` | Authenticate and set session cookie |
| `GET` | `/auth/logout` | Clear session cookie |
| `GET` | `/user` | Return the current portfolio profile |
| `GET` | `/user/transactions` | Return trade history |
| `POST` | `/trade/makeorder` | Place a limit or market order |
| `GET` | `/trade/depth` | Return current bid/ask depth |
| `GET` | `/trade/chart` | Return recent candlestick data |
| `GET` | `/trade/myorders` | Return the authenticated user's open orders |
| `POST` | `/trade/cancelorder` | Cancel an open order |

## Real-Time Events

Socket.IO is served from the backend port.

| Event | Payload |
| --- | --- |
| `depth` | Current `asks` and `bids` arrays |
| `chart` | Recent OHLC candle array |

## Quality Checks

Before opening a PR or presenting the project, run:

```bash
bun run lint
bun run check-types
```

## Notes

This is a trading simulator for engineering and product demonstration. It is not connected to live brokerage infrastructure and should not be used for real-money trading.
