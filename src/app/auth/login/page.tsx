import type { Metadata } from "next";

import { requestAdminMagicLink } from "@/app/auth/actions";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Organizer sign in",
  robots: { follow: false, index: false },
};

const errorMessages: Record<string, string> = {
  "invalid-email": "Enter a valid email address.",
  "invalid-link": "That sign-in link is invalid or has expired.",
  unauthorized: "Sign in with a verified email to manage your polls.",
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
          <h1 className="admin-page-title">Sign in to manage lunch polls</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Enter an authorized organizer email. We will send a secure, one-time sign-in link.
          </p>

          {errorMessage ? (
            <p className="mt-5 rounded-xs border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
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
        <p className="mt-5 text-center text-xs leading-5 text-muted">Your polls, saved centers, and winner history are private to your account.</p>
      </div>
    </main>
  );
}
