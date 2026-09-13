import {
  SkeletonLine,
  SkeletonPageHeader,
  SkeletonPollRow,
  SkeletonStatus,
} from "@/components/admin/admin-skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonStatus label="Loading lunch polls" />
      <SkeletonPageHeader withAction />
      <div className="mt-8 space-y-5">
        <dl className="admin-stats">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="admin-stat" key={index}>
              <dt><SkeletonLine className="h-2.5" width="5.5rem" /></dt>
              <dd><SkeletonLine className="h-7" width="2.5rem" /></dd>
            </div>
          ))}
        </dl>
        <section className="overflow-hidden bg-surface">
          <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <SkeletonLine className="h-5" width="4rem" />
              <SkeletonLine className="h-2.5" width="16rem" />
            </div>
            <SkeletonLine className="h-9" width="min(100%, 20rem)" />
          </div>
          <div className="divide-y divide-line">
            {Array.from({ length: 3 }, (_, index) => <SkeletonPollRow key={index} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
