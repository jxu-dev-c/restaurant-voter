import type {
  GooglePhotoAttribution,
  GooglePlaceDetails,
  GooglePlacePhoto,
  LatLngLiteral,
  OpeningHoursPeriod,
} from "./types";

type BrowserLatLngLike =
  | { lat: number; lng: number }
  | { lat(): number; lng(): number };

type BrowserAttributionLike = {
  displayName?: string | null;
  uri?: string | null;
  photoURI?: string | null;
};

type BrowserPhotoLike = {
  widthPx?: number | null;
  heightPx?: number | null;
  googleMapsURI?: string | null;
  authorAttributions?: BrowserAttributionLike[] | null;
  getURI(options?: { maxWidth?: number; maxHeight?: number }): string;
};

export type BrowserPlaceLike = {
  id: string;
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: BrowserLatLngLike | null;
  rating?: number | null;
  userRatingCount?: number | null;
  priceLevel?: string | null;
  photos?: BrowserPhotoLike[] | null;
  regularOpeningHours?: { periods?: OpeningHoursPeriod[] | null } | null;
  businessStatus?: string | null;
  googleMapsURI?: string | null;
  types?: string[] | null;
};

type RestAttribution = {
  displayName?: string;
  uri?: string;
  photoUri?: string;
};

type RestPhoto = {
  widthPx?: number;
  heightPx?: number;
  googleMapsUri?: string;
  authorAttributions?: RestAttribution[];
};

export type RestPlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  photos?: RestPhoto[];
  regularOpeningHours?: { periods?: OpeningHoursPeriod[] | null } | null;
  businessStatus?: string;
  googleMapsUri?: string;
  types?: string[];
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function toLatLngLiteral(
  value: BrowserLatLngLike | null | undefined,
): LatLngLiteral | null {
  if (!value) return null;

  const lat = typeof value.lat === "function" ? value.lat() : value.lat;
  const lng = typeof value.lng === "function" ? value.lng() : value.lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function mapAttributions(
  values: BrowserAttributionLike[] | null | undefined,
): GooglePhotoAttribution[] {
  return (values ?? [])
    .map((value) => ({
      displayName: optionalText(value.displayName) ?? "Google Maps contributor",
      uri: optionalText(value.uri),
      photoUri: optionalText(value.photoURI),
    }))
    .slice(0, 10);
}

function mapBrowserPhoto(
  photo: BrowserPhotoLike | undefined,
  maxPhotoWidth: number,
): GooglePlacePhoto | null {
  if (!photo) return null;

  let uri: string | null = null;
  try {
    uri = optionalText(photo.getURI({ maxWidth: maxPhotoWidth }));
  } catch {
    // A missing or quota-limited photo must not make the place unusable.
  }

  return {
    uri,
    widthPx: finiteNumber(photo.widthPx),
    heightPx: finiteNumber(photo.heightPx),
    googleMapsUri: optionalText(photo.googleMapsURI),
    attributions: mapAttributions(photo.authorAttributions),
  };
}

export function mapBrowserPlace(
  place: BrowserPlaceLike,
  options: { maxPhotoWidth?: number } = {},
): GooglePlaceDetails {
  return {
    placeId: place.id,
    displayName: optionalText(place.displayName),
    formattedAddress: optionalText(place.formattedAddress),
    location: toLatLngLiteral(place.location),
    rating: finiteNumber(place.rating),
    userRatingCount: finiteNumber(place.userRatingCount),
    priceLevel: optionalText(place.priceLevel),
    photo: mapBrowserPhoto(place.photos?.[0], options.maxPhotoWidth ?? 960),
    businessStatus: optionalText(place.businessStatus),
    openingPeriods: place.regularOpeningHours?.periods ?? null,
    googleMapsUri: optionalText(place.googleMapsURI),
    types: (place.types ?? []).filter(
      (value): value is string => typeof value === "string",
    ),
  };
}

export function mapRestPlace(
  response: RestPlaceDetailsResponse,
): GooglePlaceDetails | null {
  const placeId = optionalText(response.id);
  if (!placeId) return null;

  const latitude = finiteNumber(response.location?.latitude);
  const longitude = finiteNumber(response.location?.longitude);
  const firstPhoto = response.photos?.[0];

  return {
    placeId,
    displayName: optionalText(response.displayName?.text),
    formattedAddress: optionalText(response.formattedAddress),
    location:
      latitude === null || longitude === null
        ? null
        : { lat: latitude, lng: longitude },
    rating: finiteNumber(response.rating),
    userRatingCount: finiteNumber(response.userRatingCount),
    priceLevel: optionalText(response.priceLevel),
    photo: firstPhoto
      ? {
          // Server keys are never placed into a photo-media URL. The browser
          // Place adapter fetches a displayable URI using the browser key.
          uri: null,
          widthPx: finiteNumber(firstPhoto.widthPx),
          heightPx: finiteNumber(firstPhoto.heightPx),
          googleMapsUri: optionalText(firstPhoto.googleMapsUri),
          attributions: (firstPhoto.authorAttributions ?? []).map(
            (attribution) => ({
              displayName:
                optionalText(attribution.displayName) ??
                "Google Maps contributor",
              uri: optionalText(attribution.uri),
              photoUri: optionalText(attribution.photoUri),
            }),
          ),
        }
      : null,
    businessStatus: optionalText(response.businessStatus),
    openingPeriods: response.regularOpeningHours?.periods ?? null,
    googleMapsUri: optionalText(response.googleMapsUri),
    types: (response.types ?? []).filter(
      (value): value is string => typeof value === "string",
    ),
  };
}
