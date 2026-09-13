# Contributing to LunchPick

Start with the [README](README.md) for local setup. Use Node.js 24 and the pnpm
version pinned in `package.json`; install with `pnpm install --frozen-lockfile`.
Use local Supabase and synthetic `example.com` identities for development.

Pull requests are limited to collaborators explicitly approved by the repository
owner. Request approval through an issue before preparing a pull request if you
are not already a collaborator. The GitHub collaborator list is the PR whitelist;
it is independent of the application's organizer email allowlist.

For bugs, include reproducible steps, expected and actual behavior, browser and
runtime versions, and redacted logs. Discuss substantial changes in an issue
before implementing them. Keep pull requests focused and explain the behavior
change and verification performed.

## Checks

```bash
pnpm check
pnpm exec playwright install chromium webkit
pnpm test:e2e
```

For database, authorization, or organizer-flow changes, start local Supabase and
also run:

```bash
pnpm db:test
pnpm db:lint
pnpm test:e2e:accounts
```

`pnpm db:reset` and `pnpm ux:screenshots` replace local database contents. Use a
disposable local instance for fixtures. Never run tests against production.

Read the relevant Next.js guide in `node_modules/next/dist/docs/` before changing
framework code; this project uses version-specific APIs. Keep server credentials
server-only and preserve team isolation, signed referral access, ballot privacy,
and one-way poll phases. Test behavior and security boundaries affected by a change.

## Migrations and private data

Add a new migration for schema changes; do not edit previously applied migrations.
The one-time removal of private organizer provisioning from migration
`202609130002` is documented in [the release guide](docs/open-source-release.md).
Organizer addresses belong in each deployment's database, not in source control.
Never commit real names, personal contact details, `.env.local`, credentials,
database dumps, session cookies, signed referral URLs, or unredacted screenshots.
Do not attach those details to issues or pull requests either.

## License and conduct

Contributions to original project code and documentation use the [MIT license](LICENSE).
Identify the source and license of any third-party material you add. Respect the
[code of conduct](CODE_OF_CONDUCT.md), and use the [security policy](SECURITY.md)
for vulnerability reports.
