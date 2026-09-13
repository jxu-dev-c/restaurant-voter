"use client";

export default function ErrorPage({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="panel max-w-lg p-8 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 admin-page-title">Lunch plans hit a snag.</h1>
        <p className="mt-3 leading-7 text-muted">We couldn’t complete your request. Please try again in a moment.</p>
        <button className="button button-primary mt-7" type="button" onClick={unstable_retry}>Try again</button>
      </div>
    </main>
  );
}
