import { ManualWinnerForm } from "@/components/admin/manual-winner-form";
import { GooglePlaceName } from "@/components/google";
import { addManualWinnerAction } from "@/app/admin/actions";
import { listWinnerHistory } from "@/lib/data/polls";
import { formatDate } from "@/lib/domain/format";

export default async function WinnerHistoryPage() {
  const winners = await listWinnerHistory();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <p className="eyebrow">Repeat awareness</p>
        <h1 className="section-title mt-3">Winner history</h1>
        <p className="mt-3 max-w-2xl text-muted">Previous winners remain eligible, but future nominations display a dated warning.</p>
        <div className="mt-7 grid gap-3">
          {winners.length ? winners.map((winner) => (
            <article className="panel p-5" key={winner.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    <GooglePlaceName
                      className="underline decoration-transparent underline-offset-4 hover:decoration-current"
                      fallbackLabel={winner.fallbackLabel}
                      placeId={winner.placeId}
                    />
                  </h2>
                  <p className="mt-1 text-sm text-muted">Won {formatDate(winner.wonOn)} · {winner.source.replace("_", " ")}</p>
                </div>
                <span className="text-sm font-bold text-leaf">Google Maps source</span>
              </div>
              {winner.notes ? <p className="mt-3 text-sm leading-6 text-muted">{winner.notes}</p> : null}
            </article>
          )) : <p className="panel p-6 text-muted">No winners recorded yet.</p>}
        </div>
      </section>
      <aside className="h-fit xl:sticky xl:top-6"><ManualWinnerForm action={addManualWinnerAction} defaultDate={today} /></aside>
    </div>
  );
}
