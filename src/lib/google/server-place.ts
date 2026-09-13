import "server-only";

import {
  NOMINATABLE_PRIMARY_TYPES,
  SERVER_PLACE_FIELD_MASK,
} from "./place-fields";
import {
  mapRestPlace,
  type RestPlaceDetailsResponse,
} from "./place-mapper";
import type { GoogleApiResult, GooglePlaceDetails } from "./types";

const PLACE_DETAILS_ENDPOINT = "https://places.googleapis.com/v1/places";

type ServerPlaceOptions = {
  apiKey?: string;
  languageCode?: string;
  regionCode?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

function resolveApiKey(apiKey?: string): string | null {
  return (
    apiKey?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    null
  );
}

function normalizePlaceId(placeId: string): string | null {
  const value = placeId.trim();
  return value && value.length <= 512 ? value : null;
}

export async function fetchServerPlaceDetails(
  placeId: string,
  options: ServerPlaceOptions = {},
): Promise<GoogleApiResult<GooglePlaceDetails>> {
  const normalizedPlaceId = normalizePlaceId(placeId);
  if (!normalizedPlaceId) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: "A valid Google Place ID is required.",
        retryable: false,
      },
    };
  }

  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: "configuration_missing",
        message: "Google Places validation is not configured.",
        retryable: false,
      },
    };
  }

  const url = new URL(`${PLACE_DETAILS_ENDPOINT}/${encodeURIComponent(normalizedPlaceId)}`);
  if (options.languageCode) {
    url.searchParams.set("languageCode", options.languageCode);
  }
  if (options.regionCode) {
    url.searchParams.set("regionCode", options.regionCode);
  }

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": SERVER_PLACE_FIELD_MASK,
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: response.status === 404 ? "invalid_place" : "upstream_error",
          message:
            response.status === 404
              ? "Google Maps could not find that place."
              : "Google Places validation is temporarily unavailable.",
          retryable: response.status === 429 || response.status >= 500,
          upstreamStatus: response.status,
        },
      };
    }

    const payload = (await response.json()) as RestPlaceDetailsResponse;
    const place = mapRestPlace(payload);
    if (!place) {
      return {
        ok: false,
        error: {
          code: "invalid_response",
          message: "Google Places returned an invalid response.",
          retryable: true,
        },
      };
    }

    return { ok: true, data: place };
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "Google Places validation is temporarily unavailable.",
        retryable: true,
      },
    };
  }
}

export async function validateRestaurantPlace(
  placeId: string,
  options: ServerPlaceOptions = {},
): Promise<GoogleApiResult<GooglePlaceDetails>> {
  const result = await fetchServerPlaceDetails(placeId, options);
  if (!result.ok) return result;

  const isRestaurant = result.data.types.some((type) =>
    NOMINATABLE_PRIMARY_TYPES.includes(
      type as (typeof NOMINATABLE_PRIMARY_TYPES)[number],
    ),
  );

  if (!isRestaurant) {
    return {
      ok: false,
      error: {
        code: "not_restaurant",
        message: "Choose a restaurant or cafe from Google Maps.",
        retryable: false,
      },
    };
  }

  return result;
}
