"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="panel max-w-lg p-8 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Lunch plans hit a snag.</h1>
        <p className="mt-3 leading-7 text-muted">Try the request again. If it keeps failing, check the service configuration and logs.</p>
        <button className="button button-primary mt-7" type="button" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
