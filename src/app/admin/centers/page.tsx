import { CenterForm } from "@/components/admin/center-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { createCenterAction } from "@/app/admin/actions";
import { listLunchCenters } from "@/lib/data/polls";

export default async function LunchCentersPage() {
  const centers = await listLunchCenters();

  return (
    <div>
      <AdminPageHeader
        description="Centers keep restaurant discovery anchored around a familiar office or meetup point. Existing polls retain the coordinates they started with."
        eyebrow="Reusable settings"
        title="Lunch centers"
      />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
        <section className="admin-section overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold">Saved centers</h2>
            <p className="mt-1 text-sm text-muted">Choose one of these when creating a poll.</p>
          </div>
          {centers.length ? (
            <div className="divide-y divide-line">
              {centers.map((center) => (
                <article className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={center.id}>
                  <div>
                    <h3 className="font-bold">{center.label}</h3>
                    <p className="mt-1 text-sm text-muted">Lunch search origin</p>
                  </div>
                  <code className="rounded-lg bg-surface-soft px-3 py-2 text-xs text-muted">{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}</code>
                </article>
              ))}
            </div>
          ) : <p className="px-6 py-12 text-center text-muted">No saved lunch centers yet.</p>}
        </section>
        <aside className="h-fit xl:sticky xl:top-6"><CenterForm action={createCenterAction} /></aside>
      </div>
    </div>
  );
}
