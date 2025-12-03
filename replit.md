# Nekomancer - Prediction Market Platform

## Overview

Nekomancer is a fully trustless crypto prediction market platform built for the Monad blockchain. It uses $MANCER token (0x4e12a73042b4964a065a11a3f7845dc0b2717777) as the native prediction currency. The platform features a dark-only theme with glassmorphism design, purple hooded cat branding, Privy embedded wallets for authentication, and fully automated on-chain resolution with bond-based permissionless oracle. All trading uses $MANCER tokens with 2% platform fees auto-forwarding to treasury for buyback and burn.

## User Preferences

Preferred communication style: Simple, everyday language.

## Smart Contract Deployment

**Network**: Monad Mainnet (Chain ID: 143)
**Proxy Address**: 0x256f33EB879264679460Df8Ba0eAb96738bCec9B
**Implementation Address**: 0xE3F6a46F28edc478dc51f5d1F320D017B2A34774
**Proxy Type**: UUPS (Upgradeable)

**Token**: $MANCER (0x4e12a73042b4964a065a11a3f7845dc0b2717777)
**Treasury**: 0xE9059B5f1C60ecf9C1F07ac2bBa148A75394f56e

**Oracle Settings**:
- Proposal Bond: 5 $MANCER
- Challenge Bond: 10 $MANCER  
- Challenge Window: 24 hours
- Platform Fee: 2% → Treasury (buyback & burn)

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool

**Styling**: TailwindCSS v4 with shadcn/ui component library (New York style variant). Dark-only theme with glassmorphism effects, purple/pink accent colors for Nekomancer branding.

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
- `/wallet` - Deposit/withdraw $MANCER funds
- `/create` - Create new prediction events

**Web3 Integration**:
- Privy embedded wallets for authentication (App ID: cmigfq0mr004ljf0c1j36gpk3)
- Ethers.js for Ethereum interactions
- Custom Monad mainnet configuration (Chain ID: 143)
- $MANCER token support (18 decimals)

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
- Bond-based permissionless oracle for decentralized resolution
- Anyone can propose outcomes by staking $MANCER bond
- Challenge mechanism with higher bond requirement
- 24-hour challenge window before finalization
- Winners receive losers' bonds as reward

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
- `DEPLOYER_PRIVATE_KEY` - For contract deployments

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
- **Privy** (@privy-io/react-auth) - Embedded wallet authentication
- **Ethers.js** - Ethereum wallet and provider utilities
- **Viem** - TypeScript Ethereum library

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
- **Solc** - Solidity compiler for smart contracts

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
