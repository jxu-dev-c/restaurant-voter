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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Restaurant Voter
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="text-sm leading-6 text-neutral-600">
          Enter the configured administrator email. We will send a one-time
          sign-in link.
        </p>
      </div>

      {errorMessage ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <form action={requestAdminMagicLink} className="space-y-4">
        <input name="next" type="hidden" value={returnPath} />
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email address</span>
          <input
            autoComplete="email"
            autoFocus
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
            inputMode="email"
            name="email"
            required
            type="email"
          />
        </label>
        <button
          className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
          type="submit"
        >
          Email me a sign-in link
        </button>
      </form>
    </main>
  );
}

