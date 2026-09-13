/**
 * Placeholders for the admin `loading.tsx` boundaries.
 *
 * Two jobs: give the click something to land on immediately, and hold the
 * finished page's shape so the swap to real content does not shove the layout
 * around. Kept free of data and hooks so the whole tree is prefetchable.
 */

export function SkeletonLine({
  className = "",
  width = "100%",
}: {
  className?: string;
  width?: string;
}) {
  return <span aria-hidden className={`skeleton h-3.5 ${className}`} style={{ width }} />;
}

/** One announcement per boundary — the bars themselves stay aria-hidden. */
export function SkeletonStatus({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status">
      {label}
    </span>
  );
}

export function SkeletonPageHeader({ withAction = false }: { withAction?: boolean }) {
  return (
    <header className="admin-page-header">
      <div className="min-w-0 max-w-3xl space-y-3">
        <SkeletonLine className="h-2.5" width="7rem" />
        <SkeletonLine className="h-8" width="min(100%, 18rem)" />
        <SkeletonLine width="min(100%, 30rem)" />
      </div>
      {withAction ? <span aria-hidden className="skeleton h-11 w-32 rounded-full" /> : null}
    </header>
  );
}

function SkeletonRailRow() {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <span aria-hidden className="skeleton h-9 w-9 shrink-0" />
        <div className="space-y-2">
          <SkeletonLine width="9rem" />
          <SkeletonLine className="h-2.5" width="6rem" />
        </div>
      </div>
      <SkeletonLine className="h-6" width="8rem" />
    </div>
  );
}

/** The centers and winners pages share one list-plus-form rail. */
export function SkeletonRailPage({
  label,
  rows = 3,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div>
      <SkeletonStatus label={label} />
      <SkeletonPageHeader />
      <div className="layout-rail mt-8">
        <section className="admin-section overflow-hidden">
          <div className="space-y-2 border-b border-line px-5 py-5 sm:px-6">
            <SkeletonLine className="h-5" width="10rem" />
            <SkeletonLine className="h-2.5" width="16rem" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: rows }, (_, index) => <SkeletonRailRow key={index} />)}
          </div>
        </section>
        <aside className="admin-section h-fit space-y-4 p-5">
          <SkeletonLine className="h-5" width="9rem" />
          <SkeletonLine className="h-11" />
          <SkeletonLine className="h-11" />
          <span aria-hidden className="skeleton block h-11 rounded-full" />
        </aside>
      </div>
    </div>
  );
}

export function SkeletonPollRow() {
  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(240px,1.35fr)_minmax(420px,1fr)_auto] xl:items-center">
        <div className="space-y-2">
          <SkeletonLine className="h-5" width="5rem" />
          <SkeletonLine className="h-5" width="12rem" />
          <SkeletonLine className="h-2.5" width="8rem" />
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="space-y-2" key={index}>
              <SkeletonLine className="h-2.5" width="4.5rem" />
              <SkeletonLine width="3rem" />
            </div>
          ))}
        </div>
        <span aria-hidden className="skeleton h-11 w-full rounded-full xl:w-36" />
      </div>
    </div>
  );
}
