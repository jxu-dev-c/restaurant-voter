export function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Not yet";

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    ...options,
  }).format(new Date(value));
}

export function formatDistance(distanceMeters: number | null | undefined) {
  if (distanceMeters === null || distanceMeters === undefined) return "Unavailable";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`;
}

export function formatDuration(durationSeconds: number | null | undefined) {
  if (durationSeconds === null || durationSeconds === undefined) return "Unavailable";
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

export function voterCode(id: string) {
  return id.replaceAll("-", "").slice(0, 4).toUpperCase();
}
