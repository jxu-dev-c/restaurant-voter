# LunchPick / Restaurant Voter

LunchPick is a mobile-first, referral-only restaurant poll for small teams. Each organizer signs in with a verified email, creates a lunch poll, shares a signed link, collects nominations and equal-weight selections, closes the vote, and resolves a top tie when necessary.

Self-host this app with your own Supabase project and optional Google API keys.
Organizers share a team workspace; voters join through referral links without an
account. Browser cookies provide lightweight voter identity, so this is intended
for small trusted groups.

[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [MIT license](LICENSE) ·
[Third-party notices](THIRD_PARTY_NOTICES.md) · [Release guide](docs/open-source-release.md)

The poll lifecycle is one-way:

```text
draft → nominations → voting → closed
```

Voting locks the center snapshot, candidate roster, and choice limit. Closing creates immutable count snapshots and a closed poll cannot reopen.

## Stack

- Node.js 24 LTS and pnpm 10.14
- Next.js 16.3 App Router, React 19, strict TypeScript, and Tailwind CSS 4
- Supabase Postgres and passwordless Auth
- Google Maps JavaScript/Places in the browser and Routes API on the server
- Vitest, pgTAP, Playwright, ESLint, and GitHub Actions
- Vercel deployment

Reads use Server Components. UI mutations use authenticated Server Actions. Client Components are limited to ballot interaction, refresh behavior, Maps, Places, and small browser controls.

## Local setup

Prerequisites: Node.js 24, pnpm 10.14, Docker Desktop, and the Playwright browsers when running end-to-end tests.

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm supabase:start
```

Local Supabase Studio is normally available at [http://127.0.0.1:54323](http://127.0.0.1:54323) and Mailpit at [http://127.0.0.1:54324](http://127.0.0.1:54324).

Run `pnpm exec supabase status -o env` and copy these local values into `.env.local`:

- `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `PUBLISHABLE_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SECRET_KEY` → `SUPABASE_SECRET_KEY`

Generate three independent secrets and place one value in each signing-secret
variable in `.env.local`:

```bash
node -e 'const { randomBytes } = require("node:crypto"); for (let i = 0; i < 3; i++) console.log(randomBytes(32).toString("hex"))'
```

After saving those values in `.env.local`, start the app and open
[http://localhost:3000](http://localhost:3000):

```bash
pnpm dev
```

`pnpm supabase:start` applies migrations and seeds a fresh local database. If you
need to rebuild an existing local database, `pnpm db:reset` replaces its data.

The seed creates a demo center, the `demo-lunch-poll` nomination-phase poll, and an allowlist entry for `admin@example.com`. Sign in as that address to claim the demo data. Local sign-in links arrive in Mailpit.

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | Canonical application origin used in redirects and referral URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase publishable key; legacy anon keys are also accepted |
| `SUPABASE_SECRET_KEY` | Server | Preferred modern Supabase `sb_secret_` server credential |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Optional legacy service-role JWT fallback |
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

Public server requests must pass a versioned HMAC referral grant and, for voter-specific data, a signed device cookie. Organizer data access rechecks the verified Supabase session, resolves the organizer's predefined allowlist team, and restricts workspace reads and mutations by `team_id`. `owner_id` remains creator/audit metadata. Submitted IDs never grant access to another team's polls or centers. Winner history and restaurant fallback labels are scoped to the team workspace. Before closure, public views contain no totals or other ballots, and the admin view contains turnout but no selections. Named ballot choices are queried only after closure.

Revision conflicts use a PostgREST HTTP-409 SQLSTATE so stale edits fail immediately rather than being retried as database serialization failures.

## Organizer accounts and upgrades

Only emails in `public.organizer_email_allowlist` can create an organizer account or receive a new access token through the passwordless sign-in form. The server checks the table before asking Supabase Auth to send a magic link, so unlisted addresses receive no email; the Auth Hooks independently enforce the same policy for account and token creation. Every allowlist entry has a server-managed team assignment. Organizers on the same team share polls, saved centers, winner history, and poll management access; organizers cannot select or change teams in the app. Voters still join with the referral link and do not need an account. `/admin` remains the organizer workspace URL.

Apply the migrations in `supabase/migrations` in order. They record verified
creators, enforce the organizer allowlist, assign existing workspaces to the
default NRG team, and add the JCB team. Migration `202609130002` retains its
original filename and version as a no-op: personal organizer provisioning is
excluded from public source. Existing installations that have applied that
version keep their current organizers and permissions. Fresh installations must
provision their own organizer addresses; only local seed data adds the synthetic
`admin@example.com` allowlist entry. See the [release guide](docs/open-source-release.md)
for the compatibility boundary.

The allowlist migration creates a fail-closed email allowlist and the Postgres functions used by Supabase's Before User Created and Custom Access Token hooks. Add production organizers before enabling the hooks:

```sql
insert into public.organizer_email_allowlist (email, note)
values ('organizer@example.com', 'Primary organizer');
```

The omitted `team_id` defaults to NRG. For another team, create its `public.teams` row and set that row's ID on each corresponding allowlist entry. Keep emails lowercase and trimmed. Remove access by deleting the allowlist row; the user can no longer receive a new token, including on refresh, and server-side team authorization fails immediately. Existing access tokens remain valid until their normal expiry, so revoke active sessions in Supabase when immediate session invalidation is required. After applying the migrations and adding at least one organizer, configure your own Auth site URL and callback allowlist, then enable both hooks. Review the full Auth configuration before using `pnpm exec supabase config push --linked`: it pushes more than hook settings, and the committed site URL belongs to the existing deployment. Team and allowlist tables are readable only by the server-side service role; Supabase Auth receives only the allowlist access needed by the hooks.

`ADMIN_EMAIL` is no longer used. Keep email signups and confirmation enabled because the allowlist hooks enforce admission, configure the allowed callback URLs, and configure production SMTP for sign-in emails. Team membership is administered directly through the allowlist and is never selected by an organizer.

Configure the hosted **Magic link or OTP** and **Confirm sign up** email bodies
using `supabase/templates/magic-link.html` and `supabase/templates/confirmation.html`.
These templates link to `/auth/confirm` with the token hash. Opening that page
does not redeem the token; the organizer must submit its confirmation button.
This prevents ordinary email security link scans from consuming the one-time
credential before the organizer clicks it. Deploy the confirmation page before
updating hosted templates. Local template configuration does not update hosted
templates automatically. Existing emails using Supabase's direct verification
URL need to be replaced by a newly requested email.

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
pnpm test:e2e:accounts # Requires running local Supabase; tests two isolated accounts
pnpm build
```

## UX review screenshots

Recreate the complete desktop and mobile UX review set with:

```bash
pnpm ux:screenshots
```

The command creates a production build, loads deterministic lifecycle fixtures,
and writes 50 PNGs to `ux-review-screenshots-YYYY-MM-DD/`. It requires Docker,
Node.js 24, the Supabase CLI, and the `ego-browser` CLI.

**Warning:** this command runs `supabase db reset` against this repository's
local Supabase project. It never accepts a linked or remote database URL, but it
will replace any data currently stored in the local development database.

Set `UX_SCREENSHOT_OUTPUT_DIR` to choose a different output folder, or
`UX_SCREENSHOT_PORT` to change the temporary application port (default `3111`).

`pnpm test` covers domain, cookie, referral, auth-environment, team authorization, and Google adapters. The pgTAP suite covers schema/RLS, lifecycle transactions, team workspaces, concurrent/stale ballots, candidate limits, closure outcomes, ties, winner history, and retention. Playwright exercises the public shell in desktop Chromium and mobile WebKit. `pnpm test:e2e:accounts` starts an isolated app on port 3107, uses credentials from local Supabase (without changing `.env.local`), and tests two NRG organizers through sign-in, shared visibility, teammate poll management, duplication, and sign-out. Temporary accounts and their draft data are cleaned up after the test. CI runs both the application and database jobs on Node.js 24.

## Deployment

Use separate Supabase projects and Google keys for preview and production.

1. Create and link your own Supabase project (`pnpm exec supabase link --project-ref YOUR_PROJECT_REF`). Configure passwordless email redirects for your own Vercel origin. The committed `supabase/config.toml` retains the existing deployment's Auth origin for compatibility; replace its site URL and allowed callbacks in your deployment configuration before pushing it to a different project.
2. Apply migrations with `pnpm exec supabase db push --linked`, add production organizer emails to `public.organizer_email_allowlist`, then enable the Auth Hooks after reviewing your deployment-specific Auth configuration (`pnpm exec supabase config push --linked`). Do not include local seed data in a production push.
3. Add all environment variables to the matching Vercel environment. Use restricted browser/server Google keys and production quotas/billing alerts.
4. Deploy through Vercel and smoke-test organizer login, rejected unlisted login, referral exchange, voter registration, a ballot edit, closure, results, and link rotation.
5. Review Google Maps platform terms for the deployment region, including EEA-specific terms when applicable.

The lightweight browser identity is intentional: clearing cookies or changing browsers can create another ballot. Verified voters, scheduled phases, realtime sockets, and large-scale abuse prevention are outside the current scope.

## License and branding

Original project code and documentation are available under the [MIT license](LICENSE).
The application remains `private: true` in `package.json` to prevent accidental
npm publication; that setting does not control GitHub visibility or source licensing.
Company names, logos, Google content, fonts, and dependencies retain their own
rights as described in [third-party notices](THIRD_PARTY_NOTICES.md).
