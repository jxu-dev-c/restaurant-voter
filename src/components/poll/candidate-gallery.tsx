"use client";

import { GooglePlaceDetailsCard } from "@/components/google";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import { formatDate, formatDistance, formatDuration } from "@/lib/domain/format";
import { CloseIcon, DriveIcon, TrophyIcon } from "@/components/ui/icons";
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
      <div className="restaurant-grid grid gap-6 sm:grid-cols-2">
        {candidates.map((candidate) => {
          const metric = metrics.get(candidate.placeId);
          const hasMetrics =
            metric?.distanceMeters != null || metric?.durationSeconds != null;
          return (
            <article key={candidate.id} className="restaurant-card relative">
              {candidate.previousWinnerAt ? (
                <span className="flag flag-corner">Previous winner</span>
              ) : null}
              <GooglePlaceDetailsCard
                placeId={candidate.placeId}
                fallbackLabel={candidate.fallbackLabel}
                variant="flat"
              />
              {candidate.canRemoveNomination ? (
                <ConfirmActionForm
                  action={removeAction}
                  className="absolute left-2 top-2 z-10"
                  confirmLabel="Remove nomination"
                  confirmMessage={`Remove ${candidate.fallbackLabel} from the shortlist? You can nominate it again while nominations remain open.`}
                  confirmTitle="Remove nomination?"
                  tone="danger"
                >
                  <input name="candidateId" type="hidden" value={candidate.id} />
                  <button
                    aria-label={`Remove nomination for ${candidate.fallbackLabel}`}
                    className="icon-button icon-button-danger"
                    type="submit"
                  >
                    <CloseIcon size={15} />
                  </button>
                </ConfirmActionForm>
              ) : null}
              <p className="restaurant-meta flex items-center gap-1.5 text-sm text-muted">
                <DriveIcon className="shrink-0" size={15} />
                <span className="truncate">
                  {hasMetrics
                    ? `${formatDistance(metric?.distanceMeters)} · ${formatDuration(metric?.durationSeconds)} drive`
                    : "Distance unavailable"}
                </span>
              </p>
              {candidate.previousWinnerAt ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gold-ink">
                  <TrophyIcon className="shrink-0" size={14} />
                  Won {formatDate(candidate.previousWinnerAt)}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
