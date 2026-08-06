"use client";

import { useEffect, useState } from "react";
import type { RouteMetric } from "@/lib/google/types";

export function useRouteMetrics(
  publicId: string,
  candidatePlaceIds: readonly string[],
) {
  const [metrics, setMetrics] = useState<Map<string, RouteMetric>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const candidateKey = candidatePlaceIds.toSorted().join("\u0000");

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/polls/${encodeURIComponent(publicId)}/route-matrix`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Driving estimates are unavailable.");
        return (await response.json()) as { routes?: RouteMetric[] };
      })
      .then((payload) => {
        setMetrics(new Map((payload.routes ?? []).map((metric) => [metric.placeId, metric])));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Driving estimates are unavailable.");
      });

    return () => controller.abort();
  }, [candidateKey, publicId]);

  return { metrics, error };
}
