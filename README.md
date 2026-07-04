# Tap For Good

Contactless giving prototype with a React/Vite frontend and native Node HTTP
API.

## Setup

```sh
pnpm install
cp back/.env.example back/.env
cp front/.env.example front/.env
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Run the API:

```sh
pnpm dev
```

Run the frontend:

```sh
pnpm dev:front
```

The frontend dev server proxies `/api` to `http://localhost:3000`.

## Environment

Backend environment variables are documented in `back/.env.example`:

```sh
DATABASE_URL="postgresql://user:pass@localhost:5432/tap_for_good"
PORT=3000
CLIENT_ORIGIN="http://localhost:3000"
DEMO_PAYMENT_OUTCOME="success"
```

`DEMO_PAYMENT_OUTCOME` supports `success`, `declined`, `cancelled`, and
`offline`. Backend runtime and seed scripts load `back/.env` with Node 24's
`--env-file`. Mastercard credentials are not used yet; real network calls are
isolated behind `back/src/payments.ts`.

Frontend environment variables are documented in `front/.env.example`:

```sh
VITE_API_BASE_URL=""
```

Leave `VITE_API_BASE_URL` empty for local Vite proxying. Set it only when the
frontend is served separately from the API.

## Seeded Admins

All seeded users use password `password123`.

- `auditor@example.org` - Auditor
- `volunteer@example.org` - Volunteer
- `admin@example.org` - Charity Admin

## Checks

```sh
pnpm test
pnpm run build:all
```

## Mocked Behavior

Card and simulated tap payments create normalized Mastercard event rows, but
never store PAN, CVV, full expiry, or raw payment payloads. Receipts are marked
as queued only; no email or SMS is sent.
