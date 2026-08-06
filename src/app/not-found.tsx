import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="panel max-w-lg p-8 text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">That lunch poll is off the menu.</h1>
        <p className="mt-3 leading-7 text-muted">The link may be incomplete, expired, rotated, or archived.</p>
        <Link className="button button-primary mt-7" href="/">Back home</Link>
      </div>
    </main>
  );
}
