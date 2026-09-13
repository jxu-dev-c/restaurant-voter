# Release and deployment guide

LunchPick's initial open-source release uses a sanitized source snapshot. Company
branding is retained; private organizer identities and deployment research details
are excluded. Original source and documentation use MIT; see the separate
[third-party notices](../THIRD_PARTY_NOTICES.md) for assets and dependencies.

## Production compatibility

The release preserves application source, branding, package scripts, CI workflow,
Next.js configuration, and Supabase Auth configuration. Security maintenance
updates Next.js and eslint-config-next to 16.3.5, Vitest to 4.1.11, and the affected
transitive dependencies in the lockfile. No feature changes are intended.

Migration `202609130002_add_jcb_organizers.sql` retains its original filename and
version, but its public contents are a no-op. This one-time privacy redaction
removes private account provisioning from source. The existing database already
records this migration as applied; current accounts and team memberships remain
in the database. Do not replay, repair, or reset production migrations for this
cleanup. See [Supabase migration history](https://supabase.com/docs/guides/deployment/database-migrations).

New installations must provision their own organizers using the README. The local
seed still allowlists `admin@example.com`, and database tests use synthetic
identities inside rolled-back transactions. The committed Auth origin belongs to
the existing deployment; configure your own origin before pushing Auth settings
to a different Supabase project.

Publishing source, updating Git refs, and deploying the app are distinct actions.
The existing Vercel integration builds pushes to `main`. A history rewrite can
therefore trigger the same pipeline even when application source is unchanged.
Keep the project link, production branch, build settings, and database intact.

## Repository access

GitHub's persistent `pull_request_creation_policy` is `collaborators_only`.
The repository owner manages the whitelist under **Settings → Collaborators**.
No one else is granted access by this release. Collaborator status grants write
access as well as PR creation permission; it is independent of the application's
organizer email allowlist. See [GitHub's PR access control](https://github.blog/changelog/2026-02-13-new-repository-settings-for-configuring-pull-request-access/).

Protect `main` with the existing `app` and `database` CI checks before adding other
collaborators. Keep external PR execution unprivileged. Never expose deployment
secrets or use `pull_request_target` to execute untrusted contributor code.
Enable private vulnerability reporting and verify the link in `SECURITY.md`.

## Initial history cleanup

The public branch starts with one new initial commit without pre-public ancestors,
attributed using the owner's public GitHub handle and GitHub noreply address.
Private backups stay outside this repository. Only reviewed branch and tag refs
should be pushed; local tooling refs and old worktrees must not be mirror-pushed
or merged back into the public history.

A clean initial commit does not itself erase cached GitHub objects or old PR refs.
Before changing visibility, resolve cached personal data through [GitHub's
sensitive-data removal process](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
Two historical merged PRs cannot be archived through GitHub's archive API; a
support request is required for any retained references or views needing removal.

## Verified release checks

Validated on September 13, 2026 with Node.js 24:

- ESLint, TypeScript, 114 unit tests across 28 files, and a production build.
- Fresh local migrations, 192 pgTAP assertions across 10 files, and database lint.
- Six Playwright tests against the production build on desktop Chromium and mobile
  WebKit, including organizer sign-in, shared-team management, sign-out, and public
  pages. These use a disposable local Supabase project.
- Full dependency audit: zero reported vulnerabilities after the security updates.
- Linked production migration dry run: no migrations, seeds, or roles to apply.
  No production application data, schema, or account mutations were performed.
- Targeted scans of the sanitized tree for known personal identities, non-example
  email addresses, common credential formats, and configured private credentials.

Google API calls were disabled in local validation. The integration code is
unchanged; live Maps, Places, routing, and restaurant photos were not reverified.
A clean dependency audit is not a guarantee that no vulnerabilities exist.

## Future releases

1. Keep changes focused, use synthetic test identities, and never commit live
   referral links, credentials, personal contact details, or database dumps.
2. Run `pnpm check`, `pnpm test:e2e`, `pnpm db:test`, `pnpm db:lint`, and
   `pnpm test:e2e:accounts` as appropriate for the changes. Audit dependencies.
3. Apply schema changes through new migrations and review a linked dry run before
   deploying. Existing production data should not be reset or seeded.
4. Review CI and staging behavior, tag the approved commit, and document setup
   requirements and known limitations in the release notes.
