import { ManualWinnerForm } from "@/components/admin/manual-winner-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GooglePlaceName } from "@/components/google";
import { addManualWinnerAction } from "@/app/admin/actions";
import { listWinnerHistory } from "@/lib/data/polls";
import { formatDate } from "@/lib/domain/format";

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
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
        <section className="admin-section overflow-hidden">
          <div className="border-b border-line px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold">Recorded winners</h2>
            <p className="mt-1 text-sm text-muted">Newest wins appear first.</p>
          </div>
          {winners.length ? (
            <div className="divide-y divide-line">
              {winners.map((winner) => (
                <article className="px-5 py-5 sm:px-6" key={winner.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                    <span className="status-pill">{winner.source.replace("_", " ")}</span>
                  </div>
                  {winner.notes ? <p className="mt-3 text-sm leading-6 text-muted">{winner.notes}</p> : null}
                </article>
              ))}
            </div>
          ) : <p className="px-6 py-12 text-center text-muted">No winners recorded yet.</p>}
        </section>
        <aside className="h-fit xl:sticky xl:top-6"><ManualWinnerForm action={addManualWinnerAction} defaultDate={today} /></aside>
      </div>
    </div>
  );
}
