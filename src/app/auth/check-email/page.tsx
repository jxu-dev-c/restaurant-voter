import type { Metadata } from "next";
import Link from "next/link";
import { EmailIcon } from "@/components/ui/icons";

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
          <div className="state-icon state-icon-blue">
            <EmailIcon size={24} weight="light" />
          </div>
          <p className="eyebrow mt-6">Sign-in requested</p>
          <h1 className="mt-3 admin-page-title">Check your email</h1>
          <p className="mt-3 leading-7 text-muted">
            If this address is authorized, a one-time sign-in link is on its way. You can close this tab after opening it.
          </p>
          <Link className="button button-secondary mt-6 w-full" href="/auth/login">Try another address</Link>
        </section>
      </div>
    </main>
  );
}
