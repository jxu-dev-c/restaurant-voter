export default function Loading() {
  return (
    <main className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="text-center" role="status">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl bg-leaf-soft" />
        <p className="mt-4 font-semibold text-muted">Loading LunchPick…</p>
      </div>
    </main>
  );
}
