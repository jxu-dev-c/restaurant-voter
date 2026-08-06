import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { follow: false, index: false },
};

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Restaurant Voter
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
      <p className="leading-7 text-neutral-600">
        If that address is authorized, a one-time sign-in link is on its way.
        You can close this tab after opening the link.
      </p>
      <Link className="text-sm font-medium underline" href="/auth/login">
        Try another address
      </Link>
    </main>
  );
}

