import type { GooglePlaceDetails, LatLngLiteral, RouteMetric } from "@/lib/google/types";

// Authored fixtures, never copied Google business data. Keep these IDs and
// names aligned with seed_trial_poll in the trial workspace migration.
const profiles = [
  { name: "Harbour Tacos", address: "12 Sample Wharf, Halifax", lat: 44.6464, lng: -63.5718, rating: 4.7, reviews: 128, price: "PRICE_LEVEL_INEXPENSIVE" },
  { name: "The Green Table", address: "24 Sample Lane, Halifax", lat: 44.6511, lng: -63.5821, rating: 4.4, reviews: 86, price: "PRICE_LEVEL_MODERATE" },
  { name: "North End Noodle House", address: "36 Sample Street, Halifax", lat: 44.6608, lng: -63.5944, rating: 4.6, reviews: 214, price: "PRICE_LEVEL_INEXPENSIVE" },
  { name: "Pier 21 Pizza", address: "48 Sample Road, Halifax", lat: 44.6406, lng: -63.5652, rating: 4.3, reviews: 167, price: "PRICE_LEVEL_MODERATE" },
];

export function getTrialSamplePlace(placeId: string): GooglePlaceDetails | null {
  const index = profiles.findIndex((_, i) => placeId === `lunchpick-trial-sample-${i + 1}`);
  const profile = profiles[index];
  if (!profile) return null;
  return {
    placeId, displayName: profile.name, formattedAddress: profile.address,
    location: { lat: profile.lat, lng: profile.lng }, rating: profile.rating,
    userRatingCount: profile.reviews, priceLevel: profile.price, photo: null,
    businessStatus: "OPERATIONAL", googleMapsUri: null, types: ["restaurant"],
    openingPeriods: Array.from({ length: 7 }, (_, day) => ({
      open: { day, hour: 11, minute: 0 }, close: { day, hour: 21, minute: 0 },
    })),
  };
}

export function getTrialSampleRoute(placeId: string, origin: LatLngLiteral, destinationIndex: number): RouteMetric | null {
  const place = getTrialSamplePlace(placeId);
  if (!place?.location) return null;
  const northMeters = (place.location.lat - origin.lat) * 111_000;
  const eastMeters = (place.location.lng - origin.lng) * 111_000 * Math.cos(origin.lat * Math.PI / 180);
  const distanceMeters = Math.max(300, Math.round(Math.hypot(northMeters, eastMeters) * 1.4 / 100) * 100);
  return {
    placeId, destinationIndex, condition: "ROUTE_EXISTS", distanceMeters,
    durationSeconds: Math.round(distanceMeters / 8 + 90), statusCode: 0,
  };
}
