export type OpeningHoursPeriod = {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
};

export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type GooglePhotoAttribution = {
  displayName: string;
  uri: string | null;
  photoUri: string | null;
};

export type GooglePlacePhoto = {
  uri: string | null;
  widthPx: number | null;
  heightPx: number | null;
  googleMapsUri: string | null;
  attributions: GooglePhotoAttribution[];
};

/**
 * JSON-safe place data. Google Maps JavaScript objects must be converted to
 * this shape before they leave a client-only module.
 */
export type GooglePlaceDetails = {
  placeId: string;
  displayName: string | null;
  formattedAddress: string | null;
  location: LatLngLiteral | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  photo: GooglePlacePhoto | null;
  businessStatus: string | null;
  openingPeriods?: OpeningHoursPeriod[] | null;
  googleMapsUri: string | null;
  types: string[];
};

export type GoogleApiErrorCode =
  | "configuration_missing"
  | "invalid_request"
  | "invalid_place"
  | "not_restaurant"
  | "upstream_error"
  | "invalid_response"
  | "network_error";

export type GoogleApiError = {
  code: GoogleApiErrorCode;
  message: string;
  retryable: boolean;
  upstreamStatus?: number;
};

export type GoogleApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GoogleApiError };

export type RouteMetric = {
  placeId: string;
  destinationIndex: number;
  condition: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  statusCode: number | null;
};

export type RouteMatrix = {
  routes: RouteMetric[];
};
