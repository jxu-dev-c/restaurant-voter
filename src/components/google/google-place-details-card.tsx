"use client";

import { useEffect, useState } from "react";

import { loadBrowserPlaceDetails } from "@/lib/google/browser-place";
import type { GooglePlaceDetails } from "@/lib/google/types";

import { GooglePlaceDetailsView } from "./google-place-details-view";

export function GooglePlaceDetailsCard({
  placeId,
  apiKey,
  fallbackLabel = "Restaurant",
  requestedLanguage,
  requestedRegion,
}: {
  placeId: string;
  apiKey?: string;
  fallbackLabel?: string;
  requestedLanguage?: string;
  requestedRegion?: string;
}) {
  const requestKey = [
    placeId,
    apiKey ?? "",
    requestedLanguage ?? "",
    requestedRegion ?? "",
  ].join("\u0000");
  const [loadState, setLoadState] = useState<{
    requestKey: string;
    place: GooglePlaceDetails | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;

    void loadBrowserPlaceDetails(placeId, {
      apiKey,
      requestedLanguage,
      requestedRegion,
    }).then((result) => {
      if (!active) return;
      setLoadState({
        requestKey,
        place: result.ok ? result.data : null,
        error: result.ok ? null : result.error.message,
      });
    });

    return () => {
      active = false;
    };
  }, [apiKey, placeId, requestKey, requestedLanguage, requestedRegion]);

  const currentState = loadState?.requestKey === requestKey ? loadState : null;

  if (currentState?.error) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
        role="status"
      >
        <p className="font-medium text-slate-900">{fallbackLabel}</p>
        <p className="mt-1">Live Google Maps details are unavailable.</p>
      </div>
    );
  }

  if (!currentState?.place) {
    return (
      <div
        className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500"
        role="status"
      >
        Loading {fallbackLabel} details…
      </div>
    );
  }

  return <GooglePlaceDetailsView place={currentState.place} />;
}
