const PRICE_LEVELS: Record<string, string> = {
  FREE: "Free",
  PRICE_LEVEL_FREE: "Free",
  INEXPENSIVE: "$",
  PRICE_LEVEL_INEXPENSIVE: "$",
  MODERATE: "$$",
  PRICE_LEVEL_MODERATE: "$$",
  EXPENSIVE: "$$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  VERY_EXPENSIVE: "$$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

export function formatPriceLevel(priceLevel: string | null): string {
  if (!priceLevel) return "Unavailable";
  return PRICE_LEVELS[priceLevel] ?? "Unavailable";
}

export function formatBusinessStatus(status: string | null): string {
  if (!status) return "Unavailable";

  return status
    .replace(/^BUSINESS_STATUS_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDistanceKilometers(distanceMeters: number | null): string {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return "Unavailable";
  }

  const kilometers = Math.max(0, distanceMeters) / 1000;
  const formatted = kilometers < 10 ? kilometers.toFixed(1) : Math.round(kilometers);
  return `${formatted} km`;
}

export function formatDurationMinutes(durationSeconds: number | null): string {
  if (durationSeconds === null || !Number.isFinite(durationSeconds)) {
    return "Unavailable";
  }

  return `${Math.max(1, Math.ceil(Math.max(0, durationSeconds) / 60))} min`;
}

export function googleMapsPlaceUrl(placeId: string): string {
  const query = new URLSearchParams({
    api: "1",
    query: "Google Maps",
    query_place_id: placeId,
  });
  return `https://www.google.com/maps/search/?${query.toString()}`;
}
