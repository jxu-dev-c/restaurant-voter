import { CenterForm } from "@/components/admin/center-form";
import { createCenterAction } from "@/app/admin/actions";
import { listLunchCenters } from "@/lib/data/polls";

export default async function LunchCentersPage() {
  const centers = await listLunchCenters();

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <p className="eyebrow">Reusable settings</p>
        <h1 className="section-title mt-3">Lunch centers</h1>
        <p className="mt-3 max-w-2xl text-muted">A center is usually an office. Each poll copies its coordinates so later edits do not change an active vote.</p>
        <div className="mt-7 grid gap-3">
          {centers.length ? centers.map((center) => (
            <article className="panel p-5" key={center.id}>
              <h2 className="font-bold">{center.label}</h2>
              <p className="mt-1 text-sm text-muted">{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}</p>
            </article>
          )) : <p className="panel p-6 text-muted">No saved lunch centers.</p>}
        </div>
      </section>
      <aside className="h-fit xl:sticky xl:top-6">
        <CenterForm action={createCenterAction} />
      </aside>
    </div>
  );
}
