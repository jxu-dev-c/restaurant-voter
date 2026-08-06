"use client";

import { GooglePlaceDetailsCard } from "@/components/google";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import { formatDate, formatDistance, formatDuration } from "@/lib/domain/format";
import { useRouteMetrics } from "./use-route-metrics";

export function CandidateGallery({ publicId, candidates }: { publicId: string; candidates: InteractiveCandidateView[] }) {
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
