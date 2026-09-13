import { ManualWinnerForm } from "@/components/admin/manual-winner-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GooglePlaceName } from "@/components/google";
import { addManualWinnerAction } from "@/app/admin/actions";
import { listWinnerHistory } from "@/lib/data/polls";
import { formatDate } from "@/lib/domain/format";
import { TrophyIcon, WinnersIcon } from "@/components/ui/icons";

export default async function WinnerHistoryPage() {
  const winners = await listWinnerHistory();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <AdminPageHeader
        description="Track recent winners so repeat choices are visible during future nominations without making them ineligible."
        eyebrow="Repeat awareness"
        title="Winner history"
      />
      <div className="layout-rail mt-8">
        <section className="admin-section overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <h2 className="card-title">Recorded winners</h2>
            <p className="mt-1 text-sm text-muted">Newest wins appear first.</p>
          </div>
          {winners.length ? (
            <div className="divide-y divide-line">
              {winners.map((winner) => (
                <article className="px-5 py-5 sm:px-6" key={winner.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="state-icon state-icon-gold h-9 w-9">
                        <TrophyIcon size={17} />
                      </span>
                      <div>
                      <h3 className="font-bold">
                    <GooglePlaceName
                      className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                      fallbackLabel={winner.fallbackLabel}
                      placeId={winner.placeId}
                    />
                      </h3>
                      <p className="mt-1 text-sm text-muted">Won {formatDate(winner.wonOn)}</p>
                      </div>
                    </div>
                    <span className="status-pill">{winner.source.replace("_", " ")}</span>
                  </div>
                  {winner.notes ? <p className="mt-3 text-sm leading-6 text-muted">{winner.notes}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="grid justify-items-center px-6 py-12 text-center">
              <span className="state-icon">
                <WinnersIcon size={22} weight="light" />
              </span>
              <p className="mt-4 text-muted">No winners recorded yet.</p>
            </div>
          )}
        </section>
        <aside className="h-fit rail-sticky"><ManualWinnerForm action={addManualWinnerAction} defaultDate={today} /></aside>
      </div>
    </div>
  );
}
