# LaunchPad

LaunchPad is a token-launch and decentralized trading application built for Arc Mainnet. It lets creators deploy ERC-20 tokens, seed token/USDC liquidity through a Uniswap V2-compatible router, and make new markets immediately discoverable to traders.

The application combines a Next.js frontend, EVM wallet integration, Arc Mainnet contract reads and transactions, a PostgreSQL/Prisma indexer, and Solidity contracts for token and bonding-curve workflows.

## Features

- Connect an EIP-1193 wallet such as MetaMask and switch automatically to Arc Mainnet.
- Deploy a new ERC-20 token directly from the launch page.
- Mint the initial token supply and create token/USDC liquidity in one guided flow.
- Discover markets from the ArcDEX-compatible factory.
- Read pair reserves and token metadata directly from Arc Mainnet.
- Quote and execute token swaps through the configured router.
- View token details, pool statistics, portfolio balances, and indexed trade activity.
- Apply minimum-output protection and transaction deadlines to swaps and liquidity operations.
- Index bonding-curve events and persist application data with Prisma and PostgreSQL.
- Use responsive layouts, animated interfaces, toast notifications, and light/dark theme support.

## Arc Mainnet

| Setting | Value |
| --- | --- |
| Chain ID | `5042` (`0x13b2`) |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | [explorer.arc.io](https://explorer.arc.io) |
| Currency | USDC |
| USDC facade decimals | 6 |

## Deployed contracts

| Contract | Arc Mainnet address | Explorer |
| --- | --- | --- |
| UniswapV2Factory | `0x4Cd7fDFf83DC1540696BdaF38840a93134336dF8` | [View contract](https://explorer.arc.io/address/0x4Cd7fDFf83DC1540696BdaF38840a93134336dF8) |
| UniswapV2Router02 | `0xB433a6F3c690D17E78aa3dD87eC01cdc304278a9` | [View contract](https://explorer.arc.io/address/0xB433a6F3c690D17E78aa3dD87eC01cdc304278a9) |
| BondingCurveFactory | `0x95ee06ec2D944B891E82CEd2F1404FBB8A36dA44` | [View contract](https://explorer.arc.io/address/0x95ee06ec2D944B891E82CEd2F1404FBB8A36dA44) |
| Arc USDC facade | `0x3600000000000000000000000000000000000000` | [View contract](https://explorer.arc.io/address/0x3600000000000000000000000000000000000000) |
| Multicall3 | `0xca11bde05977b3631167028862be2a173976ca11` | [View contract](https://explorer.arc.io/address/0xca11bde05977b3631167028862be2a173976ca11) |

BondingCurveFactory deployment transaction: [view on Arc Explorer](https://explorer.arc.io/tx/0xd3824bbd96895469e75d0e1865cfcf993a1056a95a143f8de2b58e9ce83273e1).

The current launch and trading interface uses the Uniswap V2-compatible Factory and Router. The bonding-curve deployment is retained as a separate contract workflow.

## Technology

- Next.js 15 and React 19
- TypeScript and Tailwind CSS
- ethers.js
- Solidity and Hardhat
- Prisma and PostgreSQL
- Vitest and Testing Library

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 15 or Docker for indexed activity
- A browser wallet configured for Arc Mainnet

### Install and configure

```bash
npm ci
cp .env.example .env.local
npx prisma generate
```

The checked-in `.env.example` already contains the public Arc Mainnet network and contract configuration. Set `DATABASE_URL`, `DIRECT_URL`, and `CRON_SECRET` in `.env.local` for the indexer and recent-trade APIs. Never commit wallet private keys or production secrets.

To start PostgreSQL with Docker and apply migrations:

```bash
docker compose up -d postgres
npm run db:migrate:deploy
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm test
npm run test:contracts
npm run build
npm run test:arc
```

`npm run test:arc` checks the configured Arc deployment and requires RPC access. Wallet-based launch, approval, liquidity, and swap operations also require an Arc Mainnet account funded with the necessary USDC.

## Project structure

```text
app/          Next.js pages and API routes
components/   Interface and wallet components
contracts/    Solidity contracts and interfaces
hooks/        Trading hooks
lib/          Arc, ArcDEX, API, Prisma, and indexing utilities
prisma/       Database schema and migrations
scripts/      Deployment and verification scripts
addresses/    Network deployment registries
test/         Solidity tests
```

## Deployment notes

- Configure the public Arc variables from `.env.example` in the hosting environment.
- Configure PostgreSQL if indexed trade history is required.
- Keep `ARC_PRIVATE_KEY`, database credentials, and `CRON_SECRET` server-side.
- The launch flow sends newly created LP tokens to the connected creator wallet.
