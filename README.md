# LunchPick / Restaurant Voter

LunchPick is a mobile-first, referral-only restaurant poll for small teams. An administrator creates a lunch poll, shares a signed link, collects nominations and equal-weight selections, closes the vote, and resolves a top tie when necessary.

The poll lifecycle is one-way:

```text
draft → nominations → voting → closed
```

Voting locks the center snapshot, candidate roster, and choice limit. Closing creates immutable count snapshots and a closed poll cannot reopen.

## Stack

- Node.js 24 LTS and pnpm 10.14
- Next.js 16.2 App Router, React 19, strict TypeScript, and Tailwind CSS 4
- Supabase Postgres and passwordless Auth
- Google Maps JavaScript/Places in the browser and Routes API on the server
- Vitest, pgTAP, Playwright, ESLint, and GitHub Actions
- Vercel deployment

Reads use Server Components. UI mutations use authenticated Server Actions. Client Components are limited to ballot interaction, refresh behavior, Maps, Places, and small browser controls.

## Local setup

Prerequisites: Node.js 24, pnpm 10.14, Docker Desktop, and the Playwright browsers when running end-to-end tests.

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm supabase:start
pnpm db:reset
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Local Supabase Studio is normally available at [http://127.0.0.1:54323](http://127.0.0.1:54323) and Mailpit at [http://127.0.0.1:54324](http://127.0.0.1:54324).

Run `pnpm exec supabase status -o env` and copy these local values into `.env.local`:

- `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SECRET_KEY` → `SUPABASE_SECRET_KEY`

The seed creates a demo center and the `demo-lunch-poll` nomination-phase poll. Set `ADMIN_EMAIL` to the address used for local magic-link testing; links arrive in Mailpit.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical application origin used in redirects and referral URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase publishable key; legacy anon keys are also accepted |
| `SUPABASE_SECRET_KEY` | Server | Preferred modern Supabase `sb_secret_` server credential |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Optional legacy service-role JWT fallback |
| `ADMIN_EMAIL` | Server | The single email authorized to administer the application |
| `REFERRAL_SIGNING_SECRET` | Server | HMAC key for versioned referral tokens |
| `COOKIE_SIGNING_SECRET` | Server | HMAC key for poll-access and device cookies |
| `DEVICE_HASH_SECRET` | Server | HMAC key used before device identifiers reach Postgres |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | Public | Referrer-restricted Maps JavaScript and Places key |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Public | Optional Google cloud map ID |
| `GOOGLE_MAPS_SERVER_KEY` | Server | IP/API-restricted Places and Routes key |

Use a different random value of at least 32 characters for each signing secret. Never expose a Supabase secret/service-role key or the Google server key to browser code.

Google configuration is optional for local application work: nomination controls explain that search is unavailable, restaurant cards retain their user-authored fallback label, routes show “Unavailable,” and the non-map list remains usable.

## Database and security model

Migrations live in [`supabase/migrations`](./supabase/migrations) and define:

- centers, polls, durable Place IDs, candidates, voters, ballots, immutable results, winner history, and audit events;
- constraints for phase transitions, active-candidate limits, ballot ownership, and automatic winner uniqueness;
- RLS on every exposed table with no browser-role access to poll data;
- service-only transactional RPCs for registration, nomination, ballot replacement/withdrawal, phase changes, closure, link rotation, and tie resolution;
- a daily retention job that anonymizes voter names and device hashes 90 days after closure.

Public server requests must pass a versioned HMAC referral grant and, for voter-specific data, a signed device cookie. Admin Server Actions recheck the authenticated email inside each action. Before closure, public views contain no totals or other ballots, and the admin view contains turnout but no selections. Named ballot choices are queried only after closure.

Revision conflicts use a PostgREST HTTP-409 SQLSTATE so stale edits fail immediately rather than being retried as database serialization failures.

## Google data handling

The database stores Google Place IDs, plus an optional label authored outside Google data. Names, addresses, ratings, prices, photos, business status, and source links are fetched live. Browser place requests share an in-memory promise cache, while route matrices use one server-controlled origin and up to 50 server-loaded destination Place IDs with `DRIVE` and `TRAFFIC_UNAWARE`.

Route responses are private and `no-store`. Photo attribution and Google Maps source links are rendered when supplied. Google-owned photo files and result snapshots are not persisted.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:test
pnpm db:lint
pnpm exec playwright install chromium webkit
pnpm test:e2e
pnpm build
```

`pnpm test` covers domain, cookie, referral, auth-environment, and Google adapters. The pgTAP suite covers schema/RLS, lifecycle transactions, concurrent/stale ballots, candidate limits, closure outcomes, ties, winner history, and retention. Playwright exercises the public shell in desktop Chromium and mobile WebKit. CI runs both the application and database jobs on Node.js 24.

## Deployment

Use separate Supabase projects and Google keys for preview and production.

1. Create the Supabase project and configure passwordless email redirects for the Vercel origin.
2. Apply migrations with `pnpm exec supabase db push --linked` before deploying application code that depends on them.
3. Add all environment variables to the matching Vercel environment. Use restricted browser/server Google keys and production quotas/billing alerts.
4. Deploy through Vercel and smoke-test admin login, referral exchange, voter registration, a ballot edit, closure, results, and link rotation.
5. Review Google Maps platform terms for the deployment region, including EEA-specific terms when applicable.

The lightweight browser identity is intentional: clearing cookies or changing browsers can create another ballot. Verified voters, multiple admins, scheduled phases, realtime sockets, and large-scale abuse prevention are outside v1.
