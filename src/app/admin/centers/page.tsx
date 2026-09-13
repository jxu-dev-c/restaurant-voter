import { CenterForm } from "@/components/admin/center-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { createCenterAction } from "@/app/admin/actions";
import { listLunchCenters } from "@/lib/data/polls";
import { CentersIcon, PlaceIcon } from "@/components/ui/icons";

export default async function LunchCentersPage() {
  const centers = await listLunchCenters();

  return (
    <div>
      <AdminPageHeader
        description="Centers keep restaurant discovery anchored around a familiar office or meetup point. Existing polls retain the coordinates they started with."
        eyebrow="Reusable settings"
        title="Lunch centers"
      />
      <div className="layout-rail mt-8">
        <section className="admin-section overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <h2 className="card-title">Saved centers</h2>
            <p className="mt-1 text-sm text-muted">Choose one of these when creating a poll.</p>
          </div>
          {centers.length ? (
            <div className="divide-y divide-line">
              {centers.map((center) => (
                <article className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={center.id}>
                  <div className="flex items-start gap-3">
                    <span className="state-icon h-9 w-9">
                      <PlaceIcon size={17} />
                    </span>
                    <div>
                      <h3 className="font-bold">{center.label}</h3>
                      <p className="mt-1 text-sm text-muted">Lunch search origin</p>
                    </div>
                  </div>
                  <code className="rounded-xs bg-band px-3 py-2 text-xs text-muted">{center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}</code>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid justify-items-center px-6 py-12 text-center">
              <span className="state-icon">
                <CentersIcon size={22} weight="light" />
              </span>
              <p className="mt-4 text-muted">No saved lunch centers yet.</p>
            </div>
          )}
        </section>
        <aside className="h-fit rail-sticky"><CenterForm action={createCenterAction} /></aside>
      </div>
    </div>
  );
}
