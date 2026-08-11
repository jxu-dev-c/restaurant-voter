import type { Metadata } from "next";

import { requestAdminMagicLink } from "@/app/auth/actions";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { follow: false, index: false },
};

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "send-failed": "The sign-in email could not be sent. Try again shortly.",
  "invalid-link": "That sign-in link is invalid or has expired.",
  unauthorized: "That account is not authorized to administer this site.",
};

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const errorCode = Array.isArray(parameters.error)
    ? parameters.error[0]
    : parameters.error;
  const requestedReturnPath = Array.isArray(parameters.next)
    ? parameters.next[0]
    : parameters.next;
  const returnPath = sanitizeReturnPath(requestedReturnPath, "/admin");
  const errorMessage = errorCode ? errorMessages[errorCode] : undefined;

  return (
    <main className="admin-auth-shell">
      <div className="w-full max-w-md">
        <div className="brand-mark">
          <span aria-hidden="true">LP</span>
          <span>LunchPick</span>
        </div>
        <section className="admin-auth-card mt-8">
          <p className="eyebrow">Admin access</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Sign in to manage lunch polls</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Enter the authorized administrator email. We will send a secure, one-time sign-in link.
          </p>

          {errorMessage ? (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <form action={requestAdminMagicLink} className="mt-6 space-y-5">
            <input name="next" type="hidden" value={returnPath} />
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                autoComplete="email"
                autoFocus
                className="field"
                id="email"
                inputMode="email"
                name="email"
                required
                type="email"
              />
            </div>
            <button className="button button-primary w-full" type="submit">Email me a sign-in link</button>
          </form>
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-muted">Only the configured administrator account can access this workspace.</p>
      </div>
    </main>
  );
}
