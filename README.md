# Pass & Verification System

Technical practical submission for DecyfoTech (Full Stack Engineer, Contract) — Option 1.

A check-in system where an admin issues an entry pass and a verifier redeems it at the
door. Built with Node.js/Express, Next.js, and PostgreSQL, per the brief's stack
requirement.

## Live links

- Frontend: https://pass-verification-system.vercel.app
- Backend API: https://pass-verification-system-production.up.railway.app

## Project overview

Two roles, one table:

- **Issuer** fills in a guest's name, host/reference, and a valid date. The system
  generates a unique entry code.
- **Verifier** enters that code at the door. The system marks it `USED` and shows the
  guest details, or rejects it if it's already used, expired, or doesn't exist.

The core engineering problem this is built around is preventing the same code from
being redeemed twice, including when two verify requests land at the same moment.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js, Express |
| Frontend | Next.js 14 (App Router), React, plain JS/JSX (no TypeScript) |
| Database | PostgreSQL |
| Testing | Jest, Supertest, Newman (Postman CLI) |
| Backend hosting | Railway |
| Frontend hosting | Vercel |

## Architecture overview

```
frontend/  (Next.js, deployed on Vercel)
  app/page.jsx           issue-pass form
  app/verify/page.jsx    verifier console
  lib/api.js             fetch wrapper around the backend API

backend/   (Express, deployed on Railway)
  src/routes/passes.js         route wiring
  src/controllers/             request validation, response shaping
  src/services/passesService.js  business logic (code generation, atomic verify)
  src/services/notificationService.js  stubbed in-app notification
  src/db/                      pool, schema, migration runner
```

The frontend never talks to the database directly — every read/write goes through the
REST API. The backend is stateless (no sessions, no auth), so the entire system's state
lives in the single `passes` table.

## Features

- Generate an entry pass with a unique, human-typeable code (unambiguous alphabet —
  no `0`/`O`, `1`/`I`)
- Verify a pass by code, with race-safe redemption (see below)
- Automatic expiry: a `PENDING` pass past its `valid_date` is rejected and flipped to
  `EXPIRED` on the verify attempt, no cron job needed
- Stubbed in-app notification, logged on every successful verify
- Loading and error states on both frontend pages

### Preventing double-redemption

`POST /passes/verify` does not check-then-update. It runs a single conditional
statement:

```sql
UPDATE passes SET status = ... WHERE code = $1 AND status = 'PENDING'
```

Two concurrent requests for the same code both reach this statement; Postgres
row-locks during the update, so only one can match `status = 'PENDING'`. The second
request matches zero rows and is told the pass is already used. There is no window
between checking and updating for a race to slip through.

## Database schema

Single table, as scoped by the brief:

```sql
CREATE TYPE pass_status AS ENUM ('PENDING', 'USED', 'EXPIRED');

CREATE TABLE passes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(16) NOT NULL UNIQUE,
  guest_name      VARCHAR(255) NOT NULL,
  host_reference  VARCHAR(255) NOT NULL,
  valid_date      DATE NOT NULL,
  status          pass_status NOT NULL DEFAULT 'PENDING',
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Full definition: `backend/src/db/schema.sql`.

## API endpoints

Base URL (production): `https://pass-verification-system-production.up.railway.app`

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/passes` | Create a pass. Body: `{ guest_name, host_reference, valid_date }`. Returns `201` + the created pass. |
| POST | `/passes/verify` | Verify and redeem a pass. Body: `{ code }`. Returns `200` (verified), `409` (already used or expired), `404` (unknown code), or `400` (bad input). |

## Postman collection

`backend/postman_collection.json` covers all endpoints above, including the error
cases (already-used, expired, not-found, missing fields). Import it into Postman and
set the `base_url` collection variable to either `http://localhost:4000` (local) or
the production URL above.

It's also runnable headlessly with [Newman](https://github.com/postmanlabs/newman):

```bash
npx newman run backend/postman_collection.json
```

## Installation instructions

### Prerequisites

- Node.js 18+
- npm
- A PostgreSQL database (local or hosted)

### Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in DATABASE_URL
npm run migrate         # applies schema.sql
npm start                # or: npm run dev
```

The API listens on `PORT` (default `4000`).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in NEXT_PUBLIC_API_URL
npm run dev
```

The app runs on `http://localhost:3000`.

## Environment variables

**Backend** (`backend/.env.example`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set `true` if your DB provider requires SSL |
| `PORT` | Port the server listens on (default `4000`) |
| `ALLOWED_ORIGIN` | Origin allowed to call the API in production (your frontend URL). Unset allows any origin, for local dev. |

**Frontend** (`frontend/.env.example`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |

Neither `.env` file is committed — only the `.example` versions.

## Testing instructions

Backend tests require a running Postgres database with the schema applied.

```bash
cd backend
npm install
npm run migrate                # against a disposable test database
npm run test:unit              # mocked DB, no network needed
npm run test:integration       # hits a real database via Supertest
npm test                       # both
```

Unit tests cover pass code generation (format, alphabet, uniqueness) and the service
layer's status-transition logic (verified/already-used/expired/not-found), using a
mocked database pool. Integration tests exercise the full HTTP stack against a real
Postgres instance: create → verify happy path, double-verify returning `409`, an
expired pass returning `409`, and validation errors.

## Deployment details

- **Backend (Railway):** deployed from the `backend/` directory (Root Directory
  set in Railway service settings). `railway.json` sets the start command to
  `npm run migrate && npm start`, so the schema is applied automatically on every
  deploy. A PostgreSQL database is provisioned in the same Railway project, which
  injects `DATABASE_URL` automatically.
- **Frontend (Vercel):** deployed from the `frontend/` directory (Root Directory
  set in Vercel project settings), with `NEXT_PUBLIC_API_URL` set to the Railway
  backend's public URL.

---

## Written note

### 1. Structuring this for native iOS and Android alongside the web version

I'd keep the backend exactly as it is — a stateless REST API with no knowledge of
which client is calling it — and treat "shipping mobile" as purely a frontend
decision, not a backend one. The `passes` resource and its two endpoints don't change
shape based on platform.

For the mobile client itself, I'd reach for **React Native with Expo** rather than
separate native Swift/Kotlin codebases. The reasoning: this app's UI is simple forms
and status displays, not platform-specific capability (no deep native APIs, no
heavy animation, no background processing). That's exactly the case where a single
React codebase pays off — one team, one language, most of the business logic
(validation, API calls, state handling) shared between web and mobile rather than
duplicated. Expo specifically over bare React Native for the managed workflow: faster
iteration, OTA updates for quick fixes without an app-store review cycle, and we're
not going to need custom native modules for something this scoped.

The one thing I would change on the backend side is CORS/auth posture — right now
it's origin-open with no auth, which is fine for a web-only take-home, but a real
mobile client would want token-based auth (e.g. short-lived JWTs) rather than relying
on browser-origin trust, since a mobile app has no "origin" in the CORS sense at all.

### 2. Choosing between push, SMS, and WhatsApp for a given event, cost-consciously

I'd treat this as a decision tree ordered by cost, not a single default channel:

- **In-app push** is effectively free and instant, so it's the default for anything
  where the user is likely to have the app open or recently used it — this is what's
  implemented in this exercise.
- **WhatsApp** (via the Business API) costs per conversation but is far cheaper than
  SMS in most markets outside the US, and has much better delivery/read visibility.
  It's the right fallback when push isn't guaranteed to reach the user (they may not
  have the app installed, or notifications disabled) but the message still needs to
  land reliably — e.g. confirming a pass was issued to someone who isn't the one
  using the verifier app.
- **SMS** is the most expensive and lowest-context channel (160 characters, no read
  receipts), so I'd reserve it for the cases where deliverability has to be
  guaranteed regardless of app installation or internet connectivity — the genuine
  fallback of last resort, or for markets where WhatsApp penetration is low.

In practice I'd implement this as a priority-ordered attempt: push first, and only
escalate to WhatsApp/SMS if the event is critical enough that silent failure isn't
acceptable (e.g. a pass being revoked) rather than routine (e.g. a routine "pass
verified" log). Cost scales with how much certainty of delivery the specific event
actually needs.
