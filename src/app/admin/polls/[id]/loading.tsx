import {
  SkeletonLine,
  SkeletonPageHeader,
  SkeletonStatus,
} from "@/components/admin/admin-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonStatus label="Loading poll" />
      <SkeletonPageHeader withAction />

      {/* Lifecycle controls, then the tab row, then the roster — the same
          three bands the loaded page opens with. */}
      <section className="admin-section space-y-4 p-5">
        <SkeletonLine className="h-2.5" width="6rem" />
        <SkeletonLine width="min(100%, 24rem)" />
        <div className="flex flex-wrap gap-2">
          <span aria-hidden className="skeleton h-11 w-40 rounded-full" />
          <span aria-hidden className="skeleton h-11 w-32 rounded-full" />
        </div>
      </section>

      <SkeletonLine className="h-9" width="min(100%, 22rem)" />

      <section className="admin-section overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <SkeletonLine className="h-5" width="8rem" />
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6" key={index}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="skeleton h-9 w-9 shrink-0" />
                <div className="space-y-2">
                  <SkeletonLine width="11rem" />
                  <SkeletonLine className="h-2.5" width="7rem" />
                </div>
              </div>
              <SkeletonLine className="h-8" width="5rem" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
