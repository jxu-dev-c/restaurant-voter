import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell max-w-3xl py-14 sm:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="section-title mt-4">Privacy at LunchPick</h1>
        <div className="mt-10 space-y-8 leading-7 text-muted">
          <section>
            <h2 className="text-xl font-bold text-ink">What we collect</h2>
            <p className="mt-2">
              Polls store the display name you provide, a one-way identifier for
              your browser, your nominations, and your latest ballot. LunchPick
              does not require a voter email address or account.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-ink">Who can see it</h2>
            <p className="mt-2">
              Other voters never see named ballots. While voting is open, the
              poll administrator sees turnout and submitted names only. Named
              selections become available to the administrator after closing;
              link holders see aggregate results.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-ink">Cookies and retention</h2>
            <p className="mt-2">
              Essential, secure cookies remember access to a poll and let the
              same browser revise its ballot. Clearing cookies or using another
              browser creates a new identity. Voter names and browser hashes are
              anonymized 90 days after a poll closes; aggregate results and
              winner history remain.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-ink">Google Maps</h2>
            <p className="mt-2">
              Restaurant details, photos, ratings, and driving estimates are
              fetched from Google Maps for display and are subject to the{" "}
              <a className="font-semibold text-leaf underline" href="https://policies.google.com/privacy">
                Google Privacy Policy
              </a>
              . LunchPick stores durable Place IDs, not copies of Google photos
              or review content.
            </p>
          </section>
          <p>
            <Link className="font-semibold text-leaf underline" href="/terms">
              Read the terms of use
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
