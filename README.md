# Rowing Lineups

Lineup builder and coaching workflow for a squad with four 8+ boats and three coaches.

- Next.js (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres, Auth, row-level security)
- dnd-kit for seat drag-and-drop
- Vitest (unit + database policy tests) and Playwright (end-to-end)

## Requirements

- Node 22+
- Docker (for the local Supabase stack)

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | app, tests | Project URL. Local: `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app, tests | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | seed script, RLS tests, e2e cleanup | Never expose to the browser |
| `DATABASE_URL` | RLS tests | Direct Postgres URL. Local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

`npx supabase status` prints the local keys after the stack is running.

## Local setup

```bash
npm install
npm run db:start          # starts local Supabase, applies supabase/migrations
npm run seed              # 32 rowers, 4 coxswains, 3 coaches, one session with two lineups
npm run dev               # http://localhost:3000
```

Seeded coach logins: `coach1@example.com`, `coach2@example.com`, `coach3@example.com`, password `password123`.

The seeded session has two lineups, `Piece 1` and `Piece 2`, that differ by a single same-boat swap (boat 1, seats 5 and 6). Open Compare, pick the session on both sides, and the swap renders as one paired change.

## Migrations

Schema lives in `supabase/migrations`. Common commands:

```bash
npm run db:reset                                   # drop, re-run all migrations locally
npx supabase migration new <name>                  # add a migration
npx supabase gen types typescript --local > src/lib/database.types.ts
npx supabase db push                               # apply to a linked remote project
```

Run `npm run seed` again after a reset.

## Coaches and permissions

Anyone with the URL can read sessions, lineups, roster, notes, and availability (this is what powers `/share/[id]`).
Only users whose `auth.uid()` appears in `public.coaches` can write. A coach can only insert, update, or delete
their own row in `session_notes`. Policies are in the init migration and verified by `tests/db/rls.test.ts`.

To make a user a coach: create the auth user, then insert `(id, name)` into `public.coaches` with the service role.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (validation, balance, diff engine) |
| `npm run test:db` | RLS and RPC tests against the local Supabase stack |
| `npm run test:e2e` | Playwright happy path on laptop and phone viewports |
| `npm run check` | typecheck + lint + unit tests |
| `npm run db:start` / `db:stop` / `db:reset` | Local Supabase lifecycle |
| `npm run seed` | Seed sample data |

`test:db` and `test:e2e` need the local stack running and seeded. `test:e2e` starts its own dev server on port 3100
unless `E2E_BASE_URL` points at a running one. First run: `npx playwright install chromium`.

## Project layout

```
src/domain        pure domain logic: types, rigging, validation, balance, diff (unit tested)
src/lib           Supabase clients, queries, server actions, auth helpers
src/components    shared UI and the lineup canvas (boat cards, roster sidebar, tabs, notes)
src/app           routes: /sessions, /sessions/[id], /compare, /roster, /share/[id], /login
supabase          config and migrations
scripts/seed.ts   sample data
tests/db          RLS policy tests
tests/e2e         Playwright
```

## Design tokens

Colors are CSS variables in `src/app/globals.css` and exposed to Tailwind through `@theme`.
The palette is monochrome plus a single accent, Stanford Cardinal `#8C1515` (`--accent`) with `#820000` (`--accent-dark`) for hover.
