import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Poll link unavailable",
  robots: { index: false, follow: false },
};

export default function LinkUnavailablePage() {
  return (
    <main className="shell grid min-h-screen place-items-center py-16">
      <div className="panel max-w-lg p-8 text-center">
        <p className="eyebrow">Link unavailable</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Ask the organizer for a fresh referral link.</h1>
        <p className="mt-3 leading-7 text-muted">
          This link is invalid, expired, rotated, or belongs to a poll that has not opened yet.
        </p>
        <Link className="button button-primary mt-7" href="/">Back home</Link>
      </div>
    </main>
  );
}
