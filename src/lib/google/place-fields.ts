/** Fields fetched by the Maps JavaScript Place class in the browser. */
export const BROWSER_PLACE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos",
  "businessStatus",
  "googleMapsURI",
  "types",
] as const;

/**
 * Exact Place Details (New) response mask. Keep this explicit: wildcard masks
 * increase payload size, cost, and the risk of accidentally persisting fields.
 */
export const SERVER_PLACE_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos.widthPx",
  "photos.heightPx",
  "photos.authorAttributions.displayName",
  "photos.authorAttributions.uri",
  "photos.authorAttributions.photoUri",
  "photos.googleMapsUri",
  "businessStatus",
  "googleMapsUri",
  "types",
].join(",");

export const ROUTE_MATRIX_FIELD_MASK = [
  "originIndex",
  "destinationIndex",
  "status",
  "condition",
  "distanceMeters",
  "duration",
].join(",");

export const NOMINATABLE_PRIMARY_TYPES = ["restaurant", "cafe"] as const;
