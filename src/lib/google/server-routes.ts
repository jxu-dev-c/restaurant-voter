import "server-only";

import { ROUTE_MATRIX_FIELD_MASK } from "./place-fields";
import {
  mapRouteMatrixResponse,
  type RouteMatrixApiElement,
} from "./route-matrix-mapper";
import type {
  GoogleApiResult,
  LatLngLiteral,
  RouteMatrix,
} from "./types";

const ROUTE_MATRIX_ENDPOINT =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

export type ComputeRouteMatrixInput = {
  origin: LatLngLiteral;
  destinationPlaceIds: string[];
  apiKey?: string;
  languageCode?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

function isValidCoordinate({ lat, lng }: LatLngLiteral): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizedPlaceIds(placeIds: readonly string[]): string[] | null {
  const values = [...new Set(placeIds.map((value) => value.trim()))];
  if (
    values.length > 50 ||
    values.some((value) => !value || value.length > 512)
  ) {
    return null;
  }
  return values;
}

export async function computeRouteMatrix(
  input: ComputeRouteMatrixInput,
): Promise<GoogleApiResult<RouteMatrix>> {
  const destinationPlaceIds = normalizedPlaceIds(input.destinationPlaceIds);
  if (!isValidCoordinate(input.origin) || !destinationPlaceIds) {
    return {
      ok: false,
      error: {
        code: "invalid_request",
        message: "The route matrix request is invalid.",
        retryable: false,
      },
    };
  }

  if (destinationPlaceIds.length === 0) {
    return { ok: true, data: { routes: [] } };
  }

  const apiKey =
    input.apiKey?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    process.env.GOOGLE_ROUTES_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: "configuration_missing",
        message: "Google route calculations are not configured.",
        retryable: false,
      },
    };
  }

  try {
    const response = await (input.fetchImpl ?? fetch)(ROUTE_MATRIX_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": ROUTE_MATRIX_FIELD_MASK,
      },
      body: JSON.stringify({
        origins: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: input.origin.lat,
                  longitude: input.origin.lng,
                },
              },
            },
          },
        ],
        destinations: destinationPlaceIds.map((placeId) => ({
          waypoint: { placeId },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: input.languageCode ?? "en",
        units: "METRIC",
      }),
      signal: input.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "upstream_error",
          message: "Google route calculations are temporarily unavailable.",
          retryable: response.status === 429 || response.status >= 500,
          upstreamStatus: response.status,
        },
      };
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return {
        ok: false,
        error: {
          code: "invalid_response",
          message: "Google Routes returned an invalid response.",
          retryable: true,
        },
      };
    }

    return {
      ok: true,
      data: mapRouteMatrixResponse(
        destinationPlaceIds,
        payload as RouteMatrixApiElement[],
      ),
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "Google route calculations are temporarily unavailable.",
        retryable: true,
      },
    };
  }
}
