import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Build the shortlist",
    body: "Seed the poll yourself or let the team nominate restaurants around your lunch center.",
  },
  {
    number: "02",
    title: "Vote without accounts",
    body: "Share one private referral link. Voters enter a display name and choose up to your limit.",
  },
  {
    number: "03",
    title: "Pick somewhere new",
    body: "Close the vote, settle any tie, and keep a winner history so repeats are easy to spot.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="shell flex items-center justify-between py-6">
        <Link href="/" className="brand-mark" aria-label="LunchPick home">
          <span aria-hidden="true">LP</span>
          <span>LunchPick</span>
        </Link>
        <Link className="button button-secondary" href="/admin/login">
          Admin sign in
        </Link>
      </header>

      <section className="shell relative grid gap-12 pb-20 pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:pb-28 lg:pt-24">
        <div className="relative z-10">
          <p className="eyebrow">A calmer way to choose lunch</p>
          <h1 className="hero-title mt-5 max-w-4xl">
            Turn “where should we eat?” into a two-minute vote.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
            Put nearby restaurants on one map, compare the drive, collect a
            few choices from everyone, and keep yesterday&apos;s winners in view.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="button button-primary" href="/admin/login">
              Create a lunch poll
              <span aria-hidden="true">→</span>
            </Link>
            <a className="button button-ghost" href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className="mt-5 text-sm text-subtle">
            Voters need only the referral link—no account or email required.
          </p>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="map-grid" aria-hidden="true" />
          <div className="map-road map-road-one" aria-hidden="true" />
          <div className="map-road map-road-two" aria-hidden="true" />
          <span className="map-pin map-pin-office">
            <span>HQ</span>
          </span>
          <span className="map-pin map-pin-a" aria-hidden="true">1</span>
          <span className="map-pin map-pin-b" aria-hidden="true">2</span>
          <span className="map-pin map-pin-c" aria-hidden="true">3</span>
          <div className="poll-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">
              Friday lunch
            </p>
            <div className="mt-4 space-y-3">
              <div className="result-row">
                <span>Harbour Tacos</span><strong>8</strong>
              </div>
              <div className="result-bar"><span style={{ width: "82%" }} /></div>
              <div className="result-row">
                <span>Green Table</span><strong>6</strong>
              </div>
              <div className="result-bar"><span style={{ width: "61%" }} /></div>
              <div className="result-row">
                <span>Noodle House</span><strong>4</strong>
              </div>
              <div className="result-bar"><span style={{ width: "42%" }} /></div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-line bg-surface-soft">
        <div className="shell py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title mt-4">One link. Three small steps.</h2>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.number} className="bg-canvas p-7 sm:p-8">
                <span className="text-sm font-bold text-accent-strong">
                  {feature.number}
                </span>
                <h3 className="mt-8 text-xl font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="shell flex flex-col gap-4 py-8 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>LunchPick · Built for small teams and decisive lunches.</p>
        <nav className="flex gap-5" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </main>
  );
}
