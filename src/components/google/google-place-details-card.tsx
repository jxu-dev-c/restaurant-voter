"use client";

import { useEffect, useState } from "react";

import { loadBrowserPlaceDetails } from "@/lib/google/browser-place";
import type { GooglePlaceDetails } from "@/lib/google/types";

import {
  GooglePlaceDetailsView,
  PlaceMediaFallback,
  type PlaceDetailsVariant,
} from "./google-place-details-view";

export function GooglePlaceDetailsCard({
  placeId,
  apiKey,
  fallbackLabel = "Restaurant",
  requestedLanguage,
  requestedRegion,
  elevated = true,
  variant = "card",
}: {
  placeId: string;
  apiKey?: string;
  fallbackLabel?: string;
  requestedLanguage?: string;
  requestedRegion?: string;
  elevated?: boolean;
  variant?: PlaceDetailsVariant;
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

  // Most candidates have no live Places data, so these states are load-bearing:
  // they must read as a designed tile, never as a broken frame.
  if (currentState?.error) {
    if (variant === "flat") {
      return (
        <div className="min-w-0" role="status">
          <PlaceMediaFallback />
          <h3 className="card-title mt-3">{fallbackLabel}</h3>
          <p className="mt-1 text-sm text-muted">Details unavailable</p>
        </div>
      );
    }

    if (variant === "admin-row") {
      // Mirror the loaded row's shape so a missing Places record reads as the
      // same row, not as a slab of empty colour.
      return (
        <div
          className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[120px_minmax(0,1fr)]"
          role="status"
        >
          <figure className="media" aria-hidden="true">
            <PlaceMediaFallback className="media-empty h-full w-full" />
          </figure>
          <div className="min-w-0">
            <p className="card-title">{fallbackLabel}</p>
            <p className="mt-1 text-sm text-muted">Details unavailable</p>
          </div>
        </div>
      );
    }

    return (
      <div className="panel p-4 text-sm text-muted" role="status">
        <p className="card-title">{fallbackLabel}</p>
        <p className="mt-1">Details unavailable</p>
      </div>
    );
  }

  if (!currentState?.place) {
    if (variant === "flat") {
      return (
        <div className="min-w-0 animate-pulse" role="status">
          <PlaceMediaFallback />
          <h3 className="card-title mt-3">{fallbackLabel}</h3>
          <p className="mt-1 text-sm text-muted">Loading details…</p>
        </div>
      );
    }

    if (variant === "admin-row") {
      return (
        <div
          className="grid min-w-0 animate-pulse grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[120px_minmax(0,1fr)]"
          role="status"
        >
          <div className="media" aria-hidden="true" />
          <div className="min-w-0">
            <p className="card-title">{fallbackLabel}</p>
            <p className="mt-1 text-sm text-muted">Loading details…</p>
          </div>
        </div>
      );
    }

    return (
      <div className="panel animate-pulse p-4 text-sm text-muted" role="status">
        Loading {fallbackLabel} details…
      </div>
    );
  }

  return <GooglePlaceDetailsView elevated={elevated} place={currentState.place} variant={variant} />;
}
