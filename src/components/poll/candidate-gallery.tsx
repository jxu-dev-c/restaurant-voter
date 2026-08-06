"use client";

import { GooglePlaceDetailsCard } from "@/components/google";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import { formatDate, formatDistance, formatDuration } from "@/lib/domain/format";
import { useRouteMetrics } from "./use-route-metrics";

export function CandidateGallery({
  publicId,
  candidates,
  removeAction,
}: {
  publicId: string;
  candidates: InteractiveCandidateView[];
  removeAction: (formData: FormData) => void | Promise<void>;
}) {
  const { metrics, error } = useRouteMetrics(
    publicId,
    candidates.map((candidate) => candidate.placeId),
  );

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-warning">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        {candidates.map((candidate) => {
          const metric = metrics.get(candidate.placeId);
          return (
            <article key={candidate.id} className="relative">
              <GooglePlaceDetailsCard placeId={candidate.placeId} fallbackLabel={candidate.fallbackLabel} />
              {candidate.canRemoveNomination ? (
                <ConfirmActionForm
                  action={removeAction}
                  className="absolute right-3 top-3 z-10"
                  confirmLabel="Remove nomination"
                  confirmMessage={`Remove ${candidate.fallbackLabel} from the shortlist? You can nominate it again while nominations remain open.`}
                  confirmTitle="Remove nomination?"
                  tone="danger"
                >
                  <input name="candidateId" type="hidden" value={candidate.id} />
                  <button
                    aria-label={`Remove nomination for ${candidate.fallbackLabel}`}
                    className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white/95 text-2xl font-medium leading-none text-muted shadow-sm transition hover:border-danger hover:text-danger"
                    type="submit"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </ConfirmActionForm>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-muted">
                <span className="status-pill">{formatDistance(metric?.distanceMeters)}</span>
                <span className="status-pill">{formatDuration(metric?.durationSeconds)} drive</span>
                {candidate.previousWinnerAt ? (
                  <span className="status-pill text-warning">
                    Previous winner · {formatDate(candidate.previousWinnerAt)}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
