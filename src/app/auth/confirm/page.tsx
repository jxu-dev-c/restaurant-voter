import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { sanitizeReturnPath } from "@/lib/auth/return-path";

export const metadata: Metadata = {
  title: "Confirm sign in",
  robots: { follow: false, index: false },
  // no-referrer makes native form POSTs send Origin: null. Keep the origin
  // required by the callback's CSRF check without exposing the token URL.
  referrer: "strict-origin",
};

export default async function ConfirmSignInPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const tokenHash = parameters.token_hash;
  const type = parameters.type;
  if (typeof tokenHash !== "string" || !tokenHash ||
      typeof type !== "string" || !["email", "magiclink", "signup"].includes(type)) {
    redirect("/auth/login?error=invalid-link");
  }
  const returnTo = sanitizeReturnPath(
    typeof parameters.next === "string" ? parameters.next : undefined,
    "/admin",
  );

  return (
    <main className="admin-auth-shell">
      <div className="w-full max-w-md">
        <div className="brand-mark">
          <span aria-hidden="true">LP</span><span>LunchPick</span>
        </div>
        <section className="admin-auth-card mt-8">
          <p className="eyebrow">Organizer access</p>
          <h1 className="admin-page-title mt-3">Confirm your sign-in</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Continue to open your team’s lunch polls.
          </p>
          <form action="/auth/callback" method="post" className="mt-6">
            <input name="token_hash" type="hidden" value={tokenHash} />
            <input name="type" type="hidden" value={type} />
            <input name="next" type="hidden" value={returnTo} />
            <button className="button button-primary w-full" type="submit">
              Continue to LunchPick
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
