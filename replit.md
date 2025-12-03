# Monad Markets - Prediction Market Platform

## Overview

Monad Markets is a full-stack prediction market platform built for the Monad blockchain. It enables users to create and participate in prediction markets across multiple categories including crypto prices, sports, politics, and pop culture. The platform features real-time price discovery, automated oracle resolution, and wallet integration through RainbowKit.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**Styling**: TailwindCSS v4 with shadcn/ui component library (New York style variant). Custom CSS variables enable dark/light theme support with purple/green/pink accent colors for Monad branding.

**State Management**: 
- React Query (@tanstack/react-query) for server state with infinite stale time and disabled refetch on window focus
- Local component state with React hooks
- Real-time updates via polling (5-30 second intervals depending on page)

**Routing**: Wouter for client-side routing with the following pages:
- `/` - Landing page with hero, features, and preview cards
- `/markets` - Browse and filter all prediction markets
- `/event/:id` - Individual event details with betting interface
- `/portfolio` - User's active bets and history
- `/leaderboard` - Top performers ranking
- `/wallet` - Deposit/withdraw funds
- `/create` - Create new prediction events

**Web3 Integration**:
- RainbowKit for wallet connection UI
- Wagmi for Ethereum interactions
- Custom Monad mainnet configuration (Chain ID: 143)
- Native MON token support

**Charts**: Chart.js with react-chartjs-2 for vote visualization and price history

**Animation**: Framer Motion for smooth page transitions and component animations

### Backend Architecture

**Runtime**: Node.js with Express.js server

**Language**: TypeScript with ES modules

**API Design**: RESTful endpoints under `/api` prefix:
- `GET/POST /api/events` - Event management
- `GET /api/events/:id` - Single event details
- `POST /api/bets` - Place bets
- `GET /api/bets/user/:walletAddress` - User bet history
- `GET /api/leaderboard` - Top users

**Build Process**: Custom esbuild configuration that bundles server code with selective dependencies (allowlist includes DB drivers, auth libraries, etc.) to reduce syscalls and improve cold start performance

**Development**: 
- Vite dev server with HMR for client
- tsx for server hot reload
- Separate dev:client and dev scripts

**Static File Serving**: Express serves built Vite assets from `dist/public` with SPA fallback to index.html

**Logging**: Custom middleware logs all API requests with timing, method, path, and status code

**Oracle Resolution System**:
- Automated event resolution via CoinGecko API for crypto price events
- Cron job checks for expired events and resolves them
- Resolution metadata stored including source, proof, and resolver

### Data Architecture

**ORM**: Drizzle ORM with Neon serverless Postgres driver

**Database**: PostgreSQL (configured for Neon serverless)

**Schema Design**:

1. **Users Table**:
   - Wallet address (unique identifier)
   - Balance (decimal 18,2)
   - Statistics: totalProfit, totalVolume, winRate
   - Timestamps

2. **Events Table**:
   - Question text and category
   - Deadline timestamp
   - Resolution status and outcome
   - Dynamic pricing: yesPrice, noPrice (decimal 5,4)
   - Volume and pool size tracking
   - Creator information and fee structure
   - Oracle metadata: resolutionSource, resolutionProof, resolvedBy, resolvedAt
   - Event-specific fields: targetAsset, targetPrice, priceCondition (for crypto), sportType, teams, gameId (for sports)

3. **Bets Table**:
   - User and event foreign keys
   - Option (YES/NO), amount, shares
   - Average price and settlement status
   - Payout tracking

**Migrations**: Drizzle Kit handles schema migrations in `/migrations` directory

**Connection Pooling**: Neon serverless connection pool with WebSocket support

### Build and Deployment

**Build Strategy**: 
- Client built with Vite to `dist/public`
- Server bundled with esbuild to `dist/index.cjs`
- Single production command: `node dist/index.cjs`

**Environment Variables**:
- `DATABASE_URL` - Required for Neon Postgres connection
- `NODE_ENV` - Development/production mode
- `REPL_ID` - Replit-specific identifier

**Development Tools**:
- Replit-specific Vite plugins for error overlay, cartographer, and dev banner
- Custom meta images plugin for OpenGraph image URL updates
- TypeScript strict mode with path aliases

## External Dependencies

### Database & ORM
- **Neon Serverless Postgres** (@neondatabase/serverless) - Serverless Postgres database with WebSocket support
- **Drizzle ORM** - Type-safe ORM with PostgreSQL dialect
- **Drizzle Kit** - Schema management and migrations

### Web3 & Blockchain
- **RainbowKit** (@rainbow-me/rainbowkit) - Wallet connection UI components
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **Ethers.js** - Ethereum wallet and provider utilities

### UI & Styling
- **Radix UI** - Unstyled accessible component primitives (20+ components)
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Framer Motion** - Animation library
- **Chart.js** - Charting library with react-chartjs-2 wrapper

### Data Fetching & State
- **React Query** (@tanstack/react-query) - Server state management
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### Development Tools
- **Vite** - Frontend build tool and dev server
- **esbuild** - Fast JavaScript bundler for server
- **tsx** - TypeScript execution for Node.js
- **Replit Vite Plugins** - Error modal, cartographer, dev banner

### External APIs
- **CoinGecko API** - Cryptocurrency price data for oracle resolution (free tier, no auth required)
- Future: Sports APIs (TheSportsDB, API-Football) for sports event resolution
- Future: News/AI APIs for pop culture event verification

### Session & Security
- **express-session** - Session middleware
- **connect-pg-simple** - PostgreSQL session store
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - API rate limiting

### Utilities
- **date-fns** - Date formatting and manipulation
- **nanoid** - Unique ID generation
- **wouter** - Lightweight routing library
- **sonner** - Toast notifications