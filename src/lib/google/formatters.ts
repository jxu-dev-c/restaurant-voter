import type { OpeningHoursPeriod } from "./types";

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

// Intersect weekly periods with Monday in the restaurant's local time.
// Include Sunday overnight hours and periods that wrap across the week.
export function formatMondayHours(periods: OpeningHoursPeriod[] | null | undefined): string {
  if (!periods) return "Monday: Hours unavailable";
  const dayMinutes = 24 * 60;
  const weekMinutes = 7 * dayMinutes;
  const minuteOfWeek = (point: OpeningHoursPeriod["open"]) =>
    point.day * dayMinutes + point.hour * 60 + point.minute;
  const intervals: [number, number][] = [];

  for (const period of periods) {
    if (!period.close) return "Monday: Open 24 hours";
    const start = minuteOfWeek(period.open);
    let end = minuteOfWeek(period.close);
    if (end <= start) end += weekMinutes;
    for (const offset of [-weekMinutes, 0, weekMinutes]) {
      const from = Math.max(start + offset, dayMinutes);
      const to = Math.min(end + offset, 2 * dayMinutes);
      if (from < to) intervals.push([from - dayMinutes, to - dayMinutes]);
    }
  }

  intervals.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval[0] <= previous[1]) previous[1] = Math.max(previous[1], interval[1]);
    else merged.push([...interval]);
  }
  if (!merged.length) return "Monday: Closed";
  if (merged.length === 1 && merged[0][0] === 0 && merged[0][1] === dayMinutes) {
    return "Monday: Open 24 hours";
  }
  const time = (minutes: number) => {
    if (minutes === dayMinutes) return "midnight";
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "AM" : "PM"}`;
  };
  return `Monday: ${merged.map(([from, to]) => `${time(from)}–${time(to)}`).join(", ")}`;
}
