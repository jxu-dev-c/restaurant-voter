import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  ArrowRightIcon,
  StorefrontIcon,
  TrophyIcon,
  VoteIcon,
} from "@/components/ui/icons";

const features = [
  {
    number: "01",
    title: "Build the shortlist",
    body: "Seed the poll yourself or let the team nominate restaurants around your lunch center.",
    Icon: StorefrontIcon,
  },
  {
    number: "02",
    title: "Vote without accounts",
    body: "Share one private referral link. Voters enter a display name and choose up to your limit.",
    Icon: VoteIcon,
  },
  {
    number: "03",
    title: "Pick somewhere new",
    body: "Close the vote, settle any tie, and keep a winner history so repeats are easy to spot.",
    Icon: TrophyIcon,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader
        trailing={
          <Link className="button button-secondary button-compact" href="/admin/login">
            Organizer sign in
          </Link>
        }
      />

      {/* Split hero: solid blue panel + the illustrated map, flush like the reference. */}
      <section className="shell grid gap-px py-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <div className="hero-panel flex flex-col justify-between gap-10 px-7 py-10 sm:px-10 sm:py-12">
          <div>
            <p className="eyebrow">A calmer way to choose lunch</p>
            <h1 className="hero-title mt-5">
              Turn “where should we eat?” into a two-minute vote
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-on-blue/85">
              Put nearby restaurants on one map, compare the drive, collect a few
              choices from everyone, and keep yesterday&apos;s winners in view.
            </p>
          </div>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="button bg-surface text-blue hover:bg-band"
                href="/admin/login"
              >
                Create a lunch poll
                <ArrowRightIcon size={16} />
              </Link>
              <a
                className="button border-on-blue/35 text-on-blue hover:bg-white/10"
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-sm text-on-blue/75">
              Voters need only the referral link — no account or email required.
            </p>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="map-grid" />
          <div className="map-road map-road-one" />
          <div className="map-road map-road-two" />
          <span className="map-pin map-pin-office">
            <span>HQ</span>
          </span>
          <span className="map-pin map-pin-a">
            <span>1</span>
          </span>
          <span className="map-pin map-pin-b">
            <span>2</span>
          </span>
          <span className="map-pin map-pin-c">
            <span>3</span>
          </span>
          <div className="poll-card">
            <p className="eyebrow text-blue">Friday lunch</p>
            <div className="mt-4 space-y-3">
              <div className="result-row">
                <span>Harbour Tacos</span>
                <strong>8</strong>
              </div>
              <div className="result-bar result-bar-gold">
                <span style={{ width: "82%" }} />
              </div>
              <div className="result-row">
                <span>Green Table</span>
                <strong>6</strong>
              </div>
              <div className="result-bar">
                <span style={{ width: "61%" }} />
              </div>
              <div className="result-row">
                <span>Noodle House</span>
                <strong>4</strong>
              </div>
              <div className="result-bar">
                <span style={{ width: "42%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Oat band — the reference's alternating section rhythm. */}
      <section id="how-it-works" className="band scroll-mt-16">
        <div className="shell">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title mt-4">One link. Three small steps.</h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {features.map((feature) => (
              <article key={feature.number} className="content-card">
                <feature.Icon className="text-gold-ink" size={30} weight="light" />
                <span className="mt-4 block font-label text-sm font-semibold tracking-wider text-gold-ink">
                  {feature.number}
                </span>
                <h3 className="card-title mt-3">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Full-bleed blue CTA band, straight from the reference's newsletter strip. */}
      <section className="band-blue">
        <div className="shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="section-title">Ready to settle lunch?</h2>
            <p className="mt-2 text-sm text-on-blue/85">
              Create a poll, share one link, and have an answer before noon.
            </p>
          </div>
          <Link
            className="button bg-surface text-blue hover:bg-band"
            href="/admin/login"
          >
            Create a lunch poll
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
