# Aviator Zim Game

A Zimbabwe-focused crash-style betting platform starter built as a full-stack TypeScript monorepo.

## Stack

- **Frontend:** Next.js 15, React, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO, JWT auth
- **Database:** Prisma schema prepared for PostgreSQL
- **Shared package:** Game constants, types, and provably-fair helpers

## Included features

- Demo mode with virtual balance
- Real-time crash round state over Socket.IO
- Provably fair crash algorithm with configurable house edge
- Authentication routes and profile/dashboard shells
- Payment provider service placeholders for PayNow, EcoCash, and OneMoney
- Live chat, leaderboard, game history, rewards, and player progression UI
- Responsible gambling reminders, RTP transparency, and legal page shells

## Important notes

- This starter includes **placeholders** for real payment provider credentials and production KYC/compliance flows.
- For real-money deployment in Zimbabwe, you must obtain the appropriate legal approvals, fraud controls, KYC/AML checks, and secure gateway credentials.
- The app is intentionally designed with **transparent house-edge settings** and a provably-fair verification flow rather than deceptive player-specific manipulation.

## Getting started

1. Install dependencies with your preferred package manager that supports workspaces (recommended: `pnpm`).
2. Update the values in `.env`.
3. Start PostgreSQL locally or via the included container config.
4. Run the Prisma migration against your PostgreSQL database.
5. Generate the Prisma client if needed.
6. Run the API and frontend in development mode.

### Local PostgreSQL with containers

This repo now includes a root `compose.yaml` that starts PostgreSQL 16 with a persistent named volume.

- The compose service reads `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_PORT` from `.env`.
- Keep `DATABASE_URL` aligned with those values if you change them.
- The current workspace container preference points to Podman. On this Windows setup the helper scripts call `python -m podman_compose` so they work even when the user-level `podman-compose.exe` script is not on `PATH`.

Typical local flow:

- Start the database container.
- Run Prisma migrations.
- Start the dev stack.

Useful commands:

	- `corepack pnpm db:up`
	- `corepack pnpm --filter @aviator-zim/server prisma:migrate:deploy`
	- `corepack pnpm dev`
	- `corepack pnpm db:logs`
	- `corepack pnpm db:down`

### Database workflow

- Prisma schema: `apps/server/prisma/schema.prisma`
- SQL migrations:
	- `apps/server/prisma/migrations/20260421_000001_init/migration.sql`
	- `apps/server/prisma/migrations/20260421_000002_bets_admin_auth/migration.sql`
	- `apps/server/prisma/migrations/20260421_000003_round_history_analytics/migration.sql`
- Server scripts:
	- `corepack pnpm --filter @aviator-zim/server prisma:migrate:dev`
	- `corepack pnpm --filter @aviator-zim/server prisma:migrate:deploy`
	- `corepack pnpm --filter @aviator-zim/server prisma:generate`

The payment flow now persists users, balances, deposit transactions, Paynow poll URLs, callback crediting, and withdrawal requests through Prisma/PostgreSQL so they survive server restarts.

## Workspace layout

- `apps/web` – Next.js frontend
- `apps/server` – Express + Socket.IO backend
- `packages/shared` – shared game logic, types, and constants
