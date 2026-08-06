"use client";

import { loadGoogleMapsLibrary } from "./browser-loader";
import { BROWSER_PLACE_FIELDS } from "./place-fields";
import { mapBrowserPlace } from "./place-mapper";
import type { GoogleApiResult, GooglePlaceDetails } from "./types";

type PlaceDetailsOptions = {
  apiKey?: string;
  requestedLanguage?: string;
  requestedRegion?: string;
  maxPhotoWidth?: number;
};

const placeDetailsRequests = new Map<
  string,
  Promise<GoogleApiResult<GooglePlaceDetails>>
>();

function requestKey(placeId: string, options: PlaceDetailsOptions) {
  return JSON.stringify([
    placeId,
    options.apiKey ?? "",
    options.requestedLanguage ?? "",
    options.requestedRegion ?? "",
    options.maxPhotoWidth ?? 960,
  ]);
}

async function fetchBrowserPlaceDetails(
  placeId: string,
  options: PlaceDetailsOptions,
): Promise<GoogleApiResult<GooglePlaceDetails>> {
  const normalizedPlaceId = placeId.trim();
  if (!normalizedPlaceId) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: "A Google Place ID is required.",
        retryable: false,
      },
    };
  }

  try {
    const { Place } = await loadGoogleMapsLibrary("places", options.apiKey);
    const place = new Place({
      id: normalizedPlaceId,
      requestedLanguage: options.requestedLanguage,
      requestedRegion: options.requestedRegion,
    });

    await place.fetchFields({ fields: [...BROWSER_PLACE_FIELDS] });

    return {
      ok: true,
      data: mapBrowserPlace(place, {
        maxPhotoWidth: options.maxPhotoWidth,
      }),
    };
  } catch (error) {
    const configurationError =
      error instanceof Error &&
      error.name === "GoogleMapsBrowserConfigurationError";

    return {
      ok: false,
      error: {
        code: configurationError ? "configuration_missing" : "network_error",
        message: configurationError
          ? error.message
          : "Google Maps place details are temporarily unavailable.",
        retryable: !configurationError,
      },
    };
  }
}

export function loadBrowserPlaceDetails(
  placeId: string,
  options: PlaceDetailsOptions = {},
): Promise<GoogleApiResult<GooglePlaceDetails>> {
  const normalizedPlaceId = placeId.trim();
  const key = requestKey(normalizedPlaceId, options);
  const cached = placeDetailsRequests.get(key);
  if (cached) return cached;

  const request = fetchBrowserPlaceDetails(normalizedPlaceId, options);
  placeDetailsRequests.set(key, request);
  void request.then((result) => {
    if (!result.ok && result.error.retryable && placeDetailsRequests.get(key) === request) {
      placeDetailsRequests.delete(key);
    }
  });
  return request;
}
