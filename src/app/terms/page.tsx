import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="shell max-w-3xl py-14 sm:py-20">
        <p className="eyebrow">Legal</p>
        <h1 className="section-title mt-4">Terms of use</h1>
        <div className="mt-10 space-y-8 leading-7 text-muted">
          <section>
            <h2 className="card-title text-xl">Referral-only access</h2>
            <p className="mt-2">
              Poll links act as bearer invitations. Do not publish a link unless
              you intend its recipients to participate. Administrators may
              rotate a link at any time, invalidating earlier access.
            </p>
          </section>
          <section>
            <h2 className="card-title text-xl">Fair participation</h2>
            <p className="mt-2">
              Browser identity is a lightweight duplicate control, not verified
              identity. Participants agree not to evade it deliberately, submit
              misleading names, or abuse restaurant nominations.
            </p>
          </section>
          <section>
            <h2 className="card-title text-xl">Restaurant information</h2>
            <p className="mt-2">
              Restaurant content and route estimates can be incomplete or
              unavailable and should be confirmed before travel. Google Maps
              content is governed by the{" "}
              <a className="font-semibold text-leaf underline" href="https://maps.google.com/help/terms_maps/">
                Google Maps/Google Earth Additional Terms
              </a>
              .
            </p>
          </section>
          <section>
            <h2 className="card-title text-xl">Poll outcomes</h2>
            <p className="mt-2">
              LunchPick records the configured voting result; organizers remain
              responsible for reservations, dietary needs, transport, and the
              final lunch decision.
            </p>
          </section>
          <p>
            <Link className="font-semibold text-leaf underline" href="/privacy">
              Read the privacy notice
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
