# Organizer session and logout diagnosis

Reviewed September 12, 2026, at 01:16:30 America/Halifax (04:16:30 UTC).

The reported behavior is returning to sign-in within a few minutes on the live site. The code has no short inactivity timer. Two confirmed application behaviors can display the sign-in form even though a Supabase session still exists. The available evidence does not establish which caused every reported occurrence.

## Current logic

- The email callback verifies the one-time credential, saves the Supabase session through the cookie adapter, and redirects to the organizer workspace. Missing, unverified, or anonymous identities are rejected.
- `supabase/config.toml:50` configures a 3,600-second access token and refresh-token rotation. This is repository configuration; the live Auth configuration endpoint was not retrieved. An access token expiring is not, by itself, a session ending.
- `src/lib/supabase/proxy.ts:38` calls `getClaims()` before rendering matching requests. Its cookie adapter forwards refreshed cookies to both the request and response, matching the [Supabase Next.js workflow](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs). Renewal runs on requests; the browser-client factory exists but is not used by application components.
- The installed SSR package uses persistent cookies with a default maximum age of 400 days. Browser retention does not guarantee that the underlying session remains valid for that duration.
- Protected reads and actions check the verified user and the organizer's allowlist/team assignment. Removing allowlist access also prevents new tokens through the custom access-token hook.
- Clicking Sign out calls `supabase.auth.signOut()` and redirects to login (`src/app/auth/actions.ts:63`). The omitted scope defaults to global, so it signs out the account across devices. [Supabase sign-out reference](https://supabase.com/docs/reference/javascript/auth-signout)

## Confirmed navigation problem

The homepage's Organizer sign in and Create a lunch poll links point to `/admin/login` (`src/app/page.tsx:37`, `:60`, and `:156`). The shared footer uses that destination too.

`src/app/admin/login/page.tsx:4` unconditionally redirects to `/auth/login`. `src/app/auth/login/page.tsx:24` always renders the email form without checking for an existing signed-in user. Following those links therefore presents another sign-in request even when the browser is already authenticated. This route does not call sign-out or clear the session.

Production logs include a request to `/admin/login` at 04:04:05 UTC followed by `/auth/login` at 04:04:06 UTC. Requests may include prefetch traffic; this is consistent with the route behavior but does not prove an individual click or logout.

## Confirmed error-handling problem

`src/lib/auth/admin.ts:25` returns null for every `getUser()` error. `requireAdmin()` then redirects to login at line 50. Temporary network failures, rate limits, and service errors are therefore treated like missing authentication. The error is discarded without application logging. This branch itself does not revoke the session.

Production Vercel logs show Gateway Timeout errors at 04:00:41 and 04:00:43 UTC on organizer team and poll reads, followed by a login-page request at 04:01:00 UTC. These establish backend request failures, but they are database-read errors, not recorded `getUser()` errors. They support transient service failure as a possible contributor; they do not prove an auth-check timeout caused the redirect.

## Live database evidence

Read-only Supabase CLI queries found five remaining sessions for the same organizer. All had `not_after = null`, and each had one unrevoked refresh-token row. Three earlier sessions had successfully refreshed, including one created at 00:33:57 UTC and refreshed at 01:56:23 UTC. The two newest sessions were created at 03:53:25 and 04:12:09 UTC.

This shows previous sessions had not all been revoked and renewal has worked. It does not establish which session cookie was present in the affected browser or prove all live session-policy settings. The auth audit table returned no entries for the preceding 24 hours. No token values were selected or printed.

## Recommended changes

1. Send homepage organizer entry links to `/admin`, allowing its auth guard to choose whether login is needed. Make login routes return already authenticated organizers to their workspace or sanitized return destination.
2. Distinguish unavailable authentication service from a missing or invalid session. Preserve access checks and show a retryable error for temporary failures instead of redirecting to login. Log sanitized error code/status for diagnosis.
3. If Sign out is intended to affect only the current browser session, explicitly set `scope: 'local'`. There is no evidence that global sign-out caused the reported occurrences.

Opening [the organizer dashboard directly](https://restaurant-voter.vercel.app/admin) can avoid the unconditional login route while the browser still has a valid session.

## Verification and scope

Inspected application auth/navigation code, installed Supabase SDK behavior, official Supabase documentation, live session/refresh metadata through the Supabase CLI, and production Vercel logs. All 15 existing auth, magic-link action, and callback tests passed across three test files. Those tests do not cover the two behaviors above. No application code, live configuration, or production data was changed.
