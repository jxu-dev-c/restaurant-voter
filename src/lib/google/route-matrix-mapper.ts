import type { RouteMatrix, RouteMetric } from "./types";

export type RouteMatrixApiElement = {
  destinationIndex?: number;
  condition?: string;
  distanceMeters?: number;
  duration?: string;
  status?: {
    code?: number;
  };
};

export function parseGoogleDurationSeconds(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(value);
  if (!match) return null;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapRouteMatrixResponse(
  placeIds: readonly string[],
  elements: readonly RouteMatrixApiElement[],
): RouteMatrix {
  const byDestination = new Map<number, RouteMatrixApiElement>();
  for (const element of elements) {
    if (
      Number.isInteger(element.destinationIndex) &&
      (element.destinationIndex ?? -1) >= 0 &&
      (element.destinationIndex ?? placeIds.length) < placeIds.length
    ) {
      byDestination.set(element.destinationIndex as number, element);
    }
  }

  const routes: RouteMetric[] = placeIds.map((placeId, destinationIndex) => {
    const element = byDestination.get(destinationIndex);
    return {
      placeId,
      destinationIndex,
      condition: element?.condition ?? "ROUTE_NOT_FOUND",
      distanceMeters: finiteNumber(element?.distanceMeters),
      durationSeconds: parseGoogleDurationSeconds(element?.duration),
      statusCode: finiteNumber(element?.status?.code),
    };
  });

  return { routes };
}
