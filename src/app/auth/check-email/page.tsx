import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { follow: false, index: false },
};

export default function CheckEmailPage() {
  return (
    <main className="admin-auth-shell">
      <div className="w-full max-w-md">
        <div className="brand-mark">
          <span aria-hidden="true">LP</span>
          <span>LunchPick</span>
        </div>
        <section className="admin-auth-card mt-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-leaf-soft text-xl text-leaf" aria-hidden="true">✓</div>
          <p className="eyebrow mt-6">Sign-in link sent</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Check your email</h1>
          <p className="mt-3 leading-7 text-muted">
            If that address is authorized, a one-time sign-in link is on its way. You can close this tab after opening it.
          </p>
          <Link className="button button-secondary mt-6 w-full" href="/auth/login">Try another address</Link>
        </section>
      </div>
    </main>
  );
}
