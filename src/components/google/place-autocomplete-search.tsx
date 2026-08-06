"use client";

import { useEffect, useRef, useState } from "react";

import { GooglePlaceDetailsView } from "@/components/google/google-place-details-view";
import { loadGoogleMapsLibrary } from "@/lib/google/browser-loader";
import { BROWSER_PLACE_FIELDS, NOMINATABLE_PRIMARY_TYPES } from "@/lib/google/place-fields";
import {
  mapBrowserPlace,
  type BrowserPlaceLike,
} from "@/lib/google/place-mapper";
import type { GooglePlaceDetails, LatLngLiteral } from "@/lib/google/types";

type SelectedBrowserPlace = BrowserPlaceLike & {
  fetchFields(options: { fields: string[] }): Promise<void>;
};

type PlacePredictionSelectEventLike = Event & {
  placePrediction: {
    toPlace(): SelectedBrowserPlace;
  };
};

export function PlaceAutocompleteSearch({
  apiKey,
  center,
  biasRadiusMeters = 5_000,
  countryCodes,
  disabled = false,
  placeholder = "Search for a restaurant or cafe",
  description = "Search Google Maps for a restaurant or cafe to nominate",
  showSelectionPreview = true,
  onPlaceSelect,
  onError,
}: {
  apiKey?: string;
  center?: LatLngLiteral | null;
  biasRadiusMeters?: number;
  countryCodes?: string[];
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  showSelectionPreview?: boolean;
  onPlaceSelect?: (place: GooglePlaceDetails) => void;
  onError?: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onErrorRef = useRef(onError);
  const [selectedPlace, setSelectedPlace] =
    useState<GooglePlaceDetails | null>(null);
  const [status, setStatus] = useState("Loading Google Maps search…");
  const [hasError, setHasError] = useState(false);
  const centerLat = center?.lat;
  const centerLng = center?.lng;
  const countryCodeKey = countryCodes?.join(",") ?? "";

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let active = true;
    let autocomplete: HTMLElement | null = null;

    const reportError = (message: string) => {
      if (!active) return;
      setSelectedPlace(null);
      setHasError(true);
      setStatus(message);
      onErrorRef.current?.(message);
    };

    const handleSelect = async (event: Event) => {
      const selection = event as PlacePredictionSelectEventLike;
      setHasError(false);
      setStatus("Loading place details…");

      try {
        const place = selection.placePrediction.toPlace();
        await place.fetchFields({ fields: [...BROWSER_PLACE_FIELDS] });
        if (!active) return;

        const details = mapBrowserPlace(place);
        setSelectedPlace(details);
        setHasError(false);
        setStatus(`${details.displayName ?? "Place"} selected.`);
        onPlaceSelectRef.current?.(details);
      } catch {
        reportError("Google Maps could not load details for that place.");
      }
    };

    const handleGoogleError = () => {
      reportError("Google Maps search is temporarily unavailable.");
    };

    void loadGoogleMapsLibrary("places", apiKey)
      .then(({ PlaceAutocompleteElement }) => {
        if (!active || !containerRef.current) return;

        const element = new PlaceAutocompleteElement({
          description,
          disabled,
          includedPrimaryTypes: [...NOMINATABLE_PRIMARY_TYPES],
          includedRegionCodes: countryCodeKey
            ? countryCodeKey.split(",").map((code) => code.toLowerCase())
            : undefined,
          locationBias:
            centerLat !== undefined && centerLng !== undefined
              ? {
                center: { lat: centerLat, lng: centerLng },
                radius: Math.max(100, biasRadiusMeters),
              }
              : null,
          origin:
            centerLat !== undefined && centerLng !== undefined
              ? { lat: centerLat, lng: centerLng }
              : null,
          placeholder,
        });
        element.className = "block w-full";
        element.addEventListener("gmp-select", handleSelect);
        element.addEventListener("gmp-error", handleGoogleError);
        containerRef.current.replaceChildren(element);
        autocomplete = element;
        setHasError(false);
        setStatus("Google Maps search ready.");
      })
      .catch((error: unknown) => {
        reportError(
          error instanceof Error
            ? error.message
            : "Google Maps search is unavailable.",
        );
      });

    return () => {
      active = false;
      if (autocomplete) {
        autocomplete.removeEventListener("gmp-select", handleSelect);
        autocomplete.removeEventListener("gmp-error", handleGoogleError);
        autocomplete.remove();
      }
    };
  }, [
    apiKey,
    biasRadiusMeters,
    centerLat,
    centerLng,
    countryCodeKey,
    description,
    disabled,
    placeholder,
  ]);

  return (
    <div className="space-y-3">
      <div
        className="min-h-12 rounded-xl border border-slate-300 bg-white p-1 focus-within:ring-2 focus-within:ring-blue-600"
        ref={containerRef}
      />
      <p
        className={hasError ? "rounded-xl border border-warning/30 bg-[#fff8e8] px-3 py-2 text-sm text-warning" : "sr-only"}
        aria-live="polite"
        role="status"
      >
        {status}
      </p>
      {showSelectionPreview && selectedPlace ? (
        <GooglePlaceDetailsView compact place={selectedPlace} />
      ) : null}
    </div>
  );
}
