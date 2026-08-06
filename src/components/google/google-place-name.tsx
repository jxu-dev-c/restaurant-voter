"use client";

import { useEffect, useState } from "react";

import { loadBrowserPlaceDetails } from "@/lib/google/browser-place";
import { googleMapsPlaceUrl } from "@/lib/google/formatters";

export function GooglePlaceName({
  placeId,
  fallbackLabel = "Restaurant",
  className,
}: {
  placeId: string;
  fallbackLabel?: string;
  className?: string;
}) {
  const [place, setPlace] = useState<{
    requestPlaceId: string;
    displayName: string | null;
    googleMapsUri: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void loadBrowserPlaceDetails(placeId).then((result) => {
      if (!active) return;
      setPlace({
        requestPlaceId: placeId,
        displayName: result.ok ? result.data.displayName : null,
        googleMapsUri: result.ok ? result.data.googleMapsUri : null,
      });
    });
    return () => {
      active = false;
    };
  }, [placeId]);

  const currentPlace = place?.requestPlaceId === placeId ? place : null;
  return (
    <a
      className={className}
      href={currentPlace?.googleMapsUri ?? googleMapsPlaceUrl(placeId)}
      rel="noreferrer"
      target="_blank"
    >
      {currentPlace?.displayName ?? fallbackLabel}
    </a>
  );
}
